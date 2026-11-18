/**
 * Reusable panel frame. Renders an optional title bar plus a content
 * area. Any module can instantiate its own Panel; multiple panels can
 * coexist with no shared state.
 *
 * When `draggable` is true (and `id` is provided), Panel wraps itself
 * in a Window - adding drag, resize, minimize/maximize/close, bounds
 * clamping, position persistence, and taskbar integration.
 *
 * Options:
 *   title             string   Title text (ignored when showHeader: false).
 *   icon              string   Icon glyph (ignored when showHeader: false).
 *   showHeader        boolean  Whether to render the title bar (default true).
 *   id                string   Unique id, required for draggable panels.
 *   draggable         boolean  Whether to make the panel a window.
 *   showMinimize      boolean  Whether the window has a minimize button
 *                              (default true). Also drives showInTaskbar
 *                              when that option is not explicitly passed.
 *   showMaximize      boolean  Whether the window has a maximize button
 *                              (default true).
 *   showInTaskbar     boolean  Whether to show a taskbar button. Defaults
 *                              to the value of showMinimize.
 *   persistInTaskbar  boolean  Keep the taskbar button visible after the
 *                              window is closed. Default false.
 *   autoMaximizeMobile boolean Auto-maximize on mobile (<=768px). Default
 *                              false.
 *   label             string   Taskbar button label (default: title).
 *   zIndexBase        number   Z-index tier base (default 2000).
 *   minWidth          number   Resize floor width in px (default 260).
 *   minHeight         number   Resize floor height in px (default 80).
 *   className         string   Extra class on the root element.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { Window } from './window.js';
import { EVENTS } from './events.js';

/* PUBLIC API */

export class Panel {
    /**
     * @param {Object} [options] Configuration.
     */
    constructor({
        title = '',
        icon = '',
        showHeader = true,
        id = null,
        draggable = null,
        showMinimize = true,
        showMaximize = true,
        showInTaskbar = null,
        persistInTaskbar = false,
        autoMaximizeMobile = false,
        label = null,
        zIndexBase = 2000,
        minWidth = 260,
        minHeight = 80,
        className = ''
    } = {}) {
        if (draggable === null) draggable = showHeader && id !== null;
        if (showInTaskbar === null) showInTaskbar = showMinimize;
        if (label === null) label = title;

        if (draggable && !showHeader) {
            throw new Error('Panel: draggable requires showHeader: true.');
        }
        if (draggable && !id) {
            throw new Error('Panel: draggable requires an id.');
        }

        this._id = id;
        this._draggable = draggable;
        this._showMinimize = showMinimize;
        this._showMaximize = showMaximize;
        this._persistInTaskbar = persistInTaskbar;
        this._autoMaximizeMobile = autoMaximizeMobile;
        this._zIndexBase = zIndexBase;
        this._minWidth = minWidth;
        this._minHeight = minHeight;
        this.window = null;

        this.el = document.createElement('div');
        this.el.className = 'core-panel' +
            (showHeader ? '' : ' core-panel-no-header') +
            (className ? ' ' + className : '');

        this._header = null;
        this._icon = null;
        this._title = null;

        if (showHeader) {
            this._header = document.createElement('div');
            this._header.className = 'core-panel-header';

            this._icon = document.createElement('span');
            this._icon.className = 'core-panel-icon';
            this._icon.setAttribute('aria-hidden', 'true');
            this._icon.textContent = icon;

            this._title = document.createElement('span');
            this._title.className = 'core-panel-title';
            this._title.textContent = title;

            this._header.appendChild(this._icon);
            this._header.appendChild(this._title);
            this.el.appendChild(this._header);
        }

        this._content = document.createElement('div');
        this._content.className = 'core-panel-content';
        this.el.appendChild(this._content);

        if (draggable) {
            this._pendingWindow = {
                label,
                icon,
                showInTaskbar,
                showMinimize,
                showMaximize,
                persistInTaskbar,
                autoMaximizeMobile
            };
        }
    }

    /* Public API */

    /** @returns {HTMLElement} Root .core-panel element. */
    get element() { return this.el; }

    /** @returns {HTMLElement} .core-panel-content element. */
    get content() { return this._content; }

    /** @returns {boolean} Whether the panel renders a title bar. */
    get hasHeader() { return this._header !== null; }

    /** @returns {boolean} Whether the panel has been wrapped in a Window. */
    get hasWindow() { return this.window !== null; }

    /* Title and icon */

    /**
     * Set the header title. No-op when showHeader was false.
     * @param {string} text New title.
     * @returns {Panel} This panel (for chaining).
     */
    setTitle(text) {
        if (this._title) this._title.textContent = text;
        if (this.window) {
            this.window.label = text;
            EVENTS.emit('window:renamed', this.window._payload());
        }
        return this;
    }

    /**
     * Set the header icon. No-op when showHeader was false.
     * @param {string} text New icon glyph.
     * @returns {Panel} This panel (for chaining).
     */
    setIcon(text) {
        if (this._icon) this._icon.textContent = text;
        if (this.window) {
            this.window.icon = text;
            EVENTS.emit('window:renamed', this.window._payload());
        }
        return this;
    }

    /* Content */

    /**
     * Remove all children from the content area.
     * @returns {Panel} This panel (for chaining).
     */
    clearContent() {
        this._content.innerHTML = '';
        return this;
    }

    /**
     * Append one or more nodes to the content area.
     * @param {...HTMLElement} nodes Nodes to append.
     * @returns {Panel} This panel (for chaining).
     */
    appendContent(...nodes) {
        for (const n of nodes) this._content.appendChild(n);
        return this;
    }

    /* Lifecycle */

    /**
     * Called by the caller after mounting, when the element is
     * measurable. Attaches the Window wrapper if draggable was
     * requested. Idempotent.
     */
    mountWindow() {
        if (!this._pendingWindow || this.window) return;

        const pending = this._pendingWindow;
        this._pendingWindow = null;

        try {
            this.window = new Window({
                id: this._id,
                element: this.el,
                header: this._header,
                label: pending.label,
                icon: pending.icon,
                showInTaskbar: pending.showInTaskbar,
                showMinimize: pending.showMinimize,
                showMaximize: pending.showMaximize,
                persistInTaskbar: pending.persistInTaskbar,
                autoMaximizeMobile: pending.autoMaximizeMobile,
                zIndexBase: this._zIndexBase,
                minWidth: this._minWidth,
                minHeight: this._minHeight
            });
        } catch (err) {
            // Restore so a retry is possible if Window() threw (e.g., a
            // future validation).
            this._pendingWindow = pending;
            throw err;
        }
    }

    /**
     * Remove the panel from the DOM. Detaches the window first so no
     * stale state remains in WINDOW_REGISTRY.
     */
    destroy() {
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
        this.el.remove();
    }
}