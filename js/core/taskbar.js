/**
 * Window taskbar. In-flow block inside the footer with a transparent
 * container. Layout: window buttons centered, widgets right.
 *
 * Persistence-aware close behavior:
 *   - persistInTaskbar: true  -> button stays, shows 'closed' state
 *   - persistInTaskbar: false -> button removed on close (reopen via
 *     your own API call, not from the taskbar)
 *   Panels that need persistent taskbar access opt in
 *   (persistInTaskbar: true). Panels that should disappear on close
 *   use the default (false), so closing them removes the button
 *   and keeps the taskbar clean.
 *
 * Button click is a TOGGLE, not just a restore trigger:
 *   - open, not minimized   -> minimize
 *   - minimized             -> restore
 *   - closed (persistent)   -> restore
 *   - closed (non-persistent)-> no button exists
 *
 * On restore from a previously-removed button (closed non-persistent
 * window being reopened), the button is recreated automatically.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { EVENTS } from './events.js';
import { WINDOW_REGISTRY } from './window.js';

/* HELPERS */

/**
 * Fail early with a clear message if the events bus or registry is
 * missing.
 */
function assertDependencies() {
    if (typeof EVENTS?.on !== 'function') {
        throw new Error('Taskbar: core/events.js is missing or does not export a working events bus.');
    }
    if (!WINDOW_REGISTRY || typeof WINDOW_REGISTRY.getAll !== 'function') {
        throw new Error('Taskbar: core/window.js does not export WINDOW_REGISTRY.');
    }
}

/* PUBLIC API */

export class TaskbarManager {
    /**
     * @param {Object} [options]
     * @param {string|HTMLElement} [options.target='.taskbar'] - Mount target.
     * @param {string[]} [options.slotOrder=['widgets','buttons']] - Slot order.
     */
    constructor({ target = '.taskbar', slotOrder = ['widgets', 'buttons'] } = {}) {
        assertDependencies();

        /** @type {Map<string, HTMLButtonElement>} */
        this._buttons = new Map();

        this.container = document.createElement('div');
        this.container.id = 'windowTaskbar';
        this.container.className = 'taskbar-container';
        this.container.setAttribute('role', 'toolbar');
        this.container.setAttribute('aria-label', 'Windows and widgets');

        this.widgetSlot = document.createElement('div');
        this.widgetSlot.className = 'taskbar-slot taskbar-widgets';

        this.buttonSlot = document.createElement('div');
        this.buttonSlot.className = 'taskbar-slot taskbar-windows';

        const slotMap = { widgets: this.widgetSlot, buttons: this.buttonSlot };
        for (const name of slotOrder) {
            if (slotMap[name]) {
                this.container.appendChild(slotMap[name]);
                delete slotMap[name];
            }
        }
        for (const el of Object.values(slotMap)) {
            this.container.appendChild(el);
        }

        const mount = typeof target === 'string'
            ? document.querySelector(target)
            : target;
        (mount || document.body).appendChild(this.container);

        this._syncWithRegistry();
        this._subscribe();
        this._updateVisibility();
    }

    /* Adopt existing windows from WINDOW_REGISTRY. Skips closed non-persistent windows. */
    _syncWithRegistry() {
        for (const win of WINDOW_REGISTRY.getAll()) {
            if (!win.showInTaskbar) continue;
            if (!win.isVisible && !win.persistInTaskbar) continue;
            this._createButton(win);
            if (win.isMinimized) this._setButtonState(win.id, 'minimized');
            else if (!win.isVisible) this._setButtonState(win.id, 'closed');
        }
    }

    /* Wire the window:* event bus subscriptions. */
    _subscribe() {
        EVENTS.on('window:opened', (info) => {
            if (info.showInTaskbar) this._createButton(info);
            this._updateVisibility();
        });

        EVENTS.on('window:minimized', (info) => {
            this._setButtonState(info.id, 'minimized');
        });

        EVENTS.on('window:restored', (info) => {
            /* If the button was removed (closed non-persistent window
               is being reopened), recreate it. Otherwise just update
               the state. */
            if (!this._buttons.has(info.id) && info.showInTaskbar) {
                this._createButton(info);
                this._updateVisibility();
            }
            this._setButtonState(info.id, 'open');
        });

        EVENTS.on('window:closed', (info) => {
            /* Persistent windows keep their button (dimmed). Non-
               persistent windows have the button removed so the
               taskbar only shows current windows. */
            if (info.persistInTaskbar) {
                this._setButtonState(info.id, 'closed');
            } else {
                this._removeButton(info.id);
                this._updateVisibility();
            }
        });

        EVENTS.on('window:destroyed', (info) => {
            this._removeButton(info.id);
            this._updateVisibility();
        });
    }

    /* Build and append a taskbar button for a window. */
    _createButton(info) {
        if (this._buttons.has(info.id)) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'taskbar-button is-open';
        btn.dataset.windowId = info.id;
        btn.setAttribute('aria-label', `${info.label} - open`);

        const icon = document.createElement('span');
        icon.className = 'taskbar-button-icon';
        icon.textContent = info.icon || '■';

        const label = document.createElement('span');
        label.className = 'taskbar-button-label';
        label.textContent = info.label || info.id;

        btn.appendChild(icon);
        btn.appendChild(label);
        btn.addEventListener('click', () => this._onButtonClick(info.id));

        this.buttonSlot.appendChild(btn);
        this._buttons.set(info.id, btn);
    }

    /* Remove a taskbar button. */
    _removeButton(id) {
        const btn = this._buttons.get(id);
        if (btn) {
            btn.remove();
            this._buttons.delete(id);
        }
    }

    /* Update button class, aria-label to reflect 'open'|'minimized'|'closed'. */
    _setButtonState(id, state) {
        const btn = this._buttons.get(id);
        if (!btn) return;
        btn.classList.remove('is-minimized', 'is-open', 'is-closed');
        btn.classList.add(`is-${state}`);
        const label = btn.querySelector('.taskbar-button-label')?.textContent || id;
        const suffix =
            state === 'minimized' ? 'minimized - click to restore' :
            state === 'open' ? 'open - click to minimize' :
            'closed - click to reopen';
        btn.setAttribute('aria-label', `${label} - ${suffix}`);
    }

    /**
     * Taskbar button click handler.
     *
     * The button is a TOGGLE, not just a restore trigger:
     *   - open, not minimized    -> minimize
     *   - minimized              -> restore
     *   - closed (persistent)    -> restore
     *   - closed (non-persistent)-> no button exists
     *
     * focus() runs last so the window is always brought to front within
     * its zIndexBase tier, regardless of which branch fired.
     */
    _onButtonClick(id) {
        const win = WINDOW_REGISTRY.get(id);
        if (!win) return;
        if (!win.isVisible || win.isMinimized) {
            win.restore();
        } else if (win.canMinimize) {
            win.minimize();
        }
        win.focus();
    }

    /* Show/hide the buttons slot based on button count. */
    _updateVisibility() {
        if (this._buttons.size === 0) {
            this.buttonSlot.classList.remove('taskbar-visible');
        } else {
            this.buttonSlot.classList.add('taskbar-visible');
        }
    }
}