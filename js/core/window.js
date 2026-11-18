/**
 * Draggable + resizable window behavior. Adds drag, resize,
 * minimize/maximize/close controls, bounds clamping, position
 * persistence, and focus-on-click. Emits lifecycle events on the shared
 * events bus so a taskbar can react without importing this file.
 *
 * Bounds: on desktop, windows clamp to the viewport. On mobile
 * (max-width 768px), windows clamp to <main> so they cannot spill into
 * the sticky header or the footer.
 *
 * Centering: windows center on first open. Reopening a closed window
 * also resets to centered.
 *
 * Persistence-aware close: when a caller passes `persistInTaskbar:
 * true`, the taskbar keeps the button on close (dimmed). When false
 * (default), the taskbar removes the button on close - reopening the
 * window requires your own API call or another window that restores it.
 *
 * Auto-maximize on mobile is OPT-IN. `autoMaximizeMobile` defaults to
 * false: detail panels (any non-primary panels) peek at their natural
 * size on mobile, leaving surrounding context visible above and below.
 * Panels that should take over on mobile (the primary interface) pass
 * `autoMaximizeMobile: true` explicitly. This default was flipped from
 * `true` in an early iteration; a takeover-by-default mobile experience
 * reads as a modal dialog rather than a workspace, which is wrong for
 * secondary content.
 *
 * Robust size handling:
 *   - `_applyCenter` always writes inline width/height from the measured
 *     CSS size (or fallback if measurement fails), locking the size in
 *     so reopen never produces a collapsed window.
 *   - `_saveState` and `_onResizeViewport` bail out when the window is
 *     not visible, either closed (inline display: none) or minimized
 *     (.is-minimized CSS class). Without this guard, a resize while
 *     hidden would save `{width: 0, height: 0}` to localStorage and
 *     clamp the stored position to the top-left corner, and the next
 *     restore would read that broken state.
 *   - `_loadState` rejects saved states whose width or height is below
 *     100px, treating them as corrupted and falling through to the
 *     default centered layout.
 *
 * Listener lifecycle:
 *   Every event handler registered by this class is stored on the
 *   instance BEFORE being attached: `this._onHeaderDown`,
 *   `this._onHeaderDblClick`, `this._onElementMouseDown`,
 *   `this._onDocMove`, `this._onDocUp`, `this._onResizeViewport`, and
 *   `this._resizeHandles` (one { el, handler } entry per direction).
 *   This makes `destroy()` able to remove every listener it claims to
 *   remove.
 *
 *   Registering inline arrow functions would create a fresh function
 *   reference at each `addEventListener` call; `removeEventListener`
 *   would then need to receive that exact reference, which `destroy()`
 *   has no way to obtain. The handler would be unreachable and would
 *   stay attached. Storing on the instance is the standard fix.
 *
 *   The two handlers that must be stored this way but were previously
 *   inline are `_onHeaderDblClick` (maximize toggle) and
 *   `_onElementMouseDown` (focus on panel body click). Both are
 *   registered in the constructor and removed in `destroy()`.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { EVENTS } from './events.js';
import { ICON_MINIMIZE, ICON_MAXIMIZE, ICON_RESTORE, ICON_CLOSE } from './icons.js';

/* STATE */

/* Per-tier focus counters. */
const _zIndexCounters = new Map();

/* CONSTANTS */

/* Fallback dimensions used when offsetWidth / offsetHeight is 0. */
const FALLBACK_WIDTH = 500;
const FALLBACK_HEIGHT = 400;

/* Suspiciously small saved states below this threshold are ignored. */
const MIN_SAVED_DIMENSION = 100;

/* Global resize floors (overridable per-window via minWidth / minHeight). */
const DEFAULT_MIN_WIDTH = 260;
const DEFAULT_MIN_HEIGHT = 80;

/* Default tier for content panels. */
const DEFAULT_Z_INDEX_BASE = 2000;

/**
 * Resize handle directions. cx / cy describe the effect on the rect.
 */
const RESIZE_DIRECTIONS = [
    { name: 'n',  cx: 0,  cy: -1 },
    { name: 's',  cx: 0,  cy: 1  },
    { name: 'e',  cx: 1,  cy: 0  },
    { name: 'w',  cx: -1, cy: 0  },
    { name: 'ne', cx: 1,  cy: -1 },
    { name: 'nw', cx: -1, cy: -1 },
    { name: 'se', cx: 1,  cy: 1  },
    { name: 'sw', cx: -1, cy: 1  }
];

/* REGISTRY */

/**
 * Registry of all live Window instances by id.
 */
export const WINDOW_REGISTRY = {
    /** @type {Map<string, Window>} */
    _map: new Map(),

    set(id, win) { this._map.set(id, win); },
    get(id) { return this._map.get(id) || null; },
    getAll() { return Array.from(this._map.values()); },
    has(id) { return this._map.has(id); },
    delete(id) { this._map.delete(id); }
};

/* HELPERS */

/**
 * Fail early with a clear message if the events bus is missing.
 */
function assertDependencies() {
    if (typeof EVENTS?.on !== 'function' || typeof EVENTS?.emit !== 'function') {
        throw new Error(
            'Window: core/events.js is missing or does not export a working events bus.'
        );
    }
}

/* PUBLIC API */

export class Window {
    /**
     * @param {Object} options
     * @param {string} options.id - Unique id (persistence key).
     * @param {HTMLElement} options.element - Root element to drag/resize.
     * @param {HTMLElement} options.header - Drag handle.
     * @param {string} [options.label] - Taskbar label.
     * @param {string} [options.icon] - Taskbar icon glyph.
     * @param {boolean} [options.showInTaskbar=true] - Show a taskbar button.
     * @param {boolean} [options.showMinimize=true] - Add a minimize button.
     * @param {boolean} [options.showMaximize=true] - Add a maximize button.
     * @param {boolean} [options.persistInTaskbar=false] - Keep the taskbar
     *   button visible after the window is closed.
     * @param {boolean} [options.autoMaximizeMobile=false] - Auto-maximize
     *   on mobile (<=768px). Default false so detail panels peek; the
     *   primary-interface panels opt in.
     * @param {number} [options.zIndexBase=2000] - Z-index tier base.
     * @param {number} [options.minWidth=260] - Resize floor width.
     * @param {number} [options.minHeight=80] - Resize floor height.
     */
    constructor({
        id,
        element,
        header,
        label = '',
        icon = '',
        showInTaskbar = true,
        showMinimize = true,
        showMaximize = true,
        persistInTaskbar = false,
        autoMaximizeMobile = false,
        zIndexBase = DEFAULT_Z_INDEX_BASE,
        minWidth = DEFAULT_MIN_WIDTH,
        minHeight = DEFAULT_MIN_HEIGHT
    } = {}) {
        assertDependencies();
        if (!id) throw new Error('Window: id is required.');
        if (!element) throw new Error('Window: element is required.');
        if (!header) throw new Error('Window: header is required.');

        this.id = id;
        this.element = element;
        this.header = header;
        this.label = label || id;
        this.icon = icon || '■';
        this.showInTaskbar = showInTaskbar;
        this.persistInTaskbar = persistInTaskbar;
        this._showMinimize = showMinimize;
        this._showMaximize = showMaximize;
        this._autoMaximizeMobile = autoMaximizeMobile;
        this._zIndexBase = zIndexBase;
        this._minWidth = minWidth;
        this._minHeight = minHeight;

        this._isDragging = false;
        this._isResizing = false;
        this._isMinimized = false;
        this._isMaximized = false;
        this._dragOffset = { x: 0, y: 0 };
        this._resizeDir = null;
        this._resizeStart = null;
        this._pos = { x: 0, y: 0 };
        this._preMaxRect = null;
        this._needsReset = false;
        this._btnMax = null;

        this.element.classList.add('core-panel-window');
        this._controls = this._createControls();
        this.header.appendChild(this._controls);
        this._createResizeHandles();

        WINDOW_REGISTRY.set(id, this);
        this._loadState();

        /* Focus immediately so the newest window is on top within its
           tier. */
        this.focus();

        /* Bind all event handlers as instance properties BEFORE they
           are attached. This is required for `destroy()` to remove
           them successfully - `removeEventListener` matches by
           function reference, and inline arrow functions create a
           fresh reference at each registration with no way for
           `destroy()` to recover it. The previous version bound only
           `_onHeaderDown`, `_onDocMove`, `_onDocUp`, and
           `_onResizeViewport`, while `_onHeaderDblClick` and
           `_onElementMouseDown` were registered as inline arrows.
           Their removeEventListener calls in `destroy()` were silent
           no-ops. Now every listener is stored first and removed
           cleanly.

           Bus subscriptions in consumer code follow the same pattern:
           store first, then subscribe, then unsubscribe using the
           stored reference. One discipline, no exceptions. */
        this._onHeaderDown = this._onHeaderDown.bind(this);
        this._onHeaderDblClick = this._onHeaderDblClick.bind(this);
        this._onElementMouseDown = this._onElementMouseDown.bind(this);
        this._onDocMove = this._onDocMove.bind(this);
        this._onDocUp = this._onDocUp.bind(this);
        this._onResizeViewport = this._onResizeViewport.bind(this);

        this.header.addEventListener('mousedown', this._onHeaderDown);
        this.header.addEventListener('touchstart', this._onHeaderDown, { passive: false });
        this.header.addEventListener('dblclick', this._onHeaderDblClick);
        this.element.addEventListener('mousedown', this._onElementMouseDown);
        window.addEventListener('resize', this._onResizeViewport);

        EVENTS.emit('window:opened', this._payload());

        /* Auto-maximize on mobile - OPT IN. Only panels that pass
           autoMaximizeMobile: true run this path (currently just the
           primary interface). Detail panels skip it and open at
           their CSS-defined peek size, leaving surrounding context
           visible. Runs after window:opened so taskbar and other
           subscribers see the window before it maximizes. */
        if (this._shouldAutoMaximizeOnMobile() && this._autoMaximizeMobile) {
            this.maximize();
        }
    }

    /* PROPERTIES */

    /** @returns {boolean} */
    get isMinimized() { return this._isMinimized; }

    /** @returns {boolean} */
    get isMaximized() { return this._isMaximized; }

    /**
     * @returns {boolean} True when the window is neither closed (inline
     *   display: none) nor minimized (CSS display: none via .is-minimized).
     */
    get isVisible() {
        if (this._isMinimized) return false;
        return this.element.style.display !== 'none';
    }

    /** @returns {boolean} Reflects showMinimize option. */
    get canMinimize() { return this._showMinimize; }

    /** @returns {boolean} Reflects showMaximize option. */
    get canMaximize() { return this._showMaximize; }

    /* ACTIONS */

    /** Hide the window. Emits window:minimized. No-op if showMinimize is false. */
    minimize() {
        if (!this._showMinimize) return;
        if (this._isMinimized) return;
        this._isMinimized = true;
        this.element.classList.add('is-minimized');
        EVENTS.emit('window:minimized', this._payload());
    }

    /** Reverse minimize or close, then focus. Emits window:restored. Resets to default layout when reopening from closed. */
    restore() {
        if (this._isMinimized) {
            this._isMinimized = false;
            this.element.classList.remove('is-minimized');
            this.focus();
            EVENTS.emit('window:restored', this._payload());
            return;
        }
        if (this.element.style.display === 'none') {
            if (this._needsReset) {
                this.element.style.visibility = 'hidden';
                this.element.style.display = '';
                this._needsReset = false;
                this._resetToDefault();
                this.element.style.visibility = '';
            } else {
                this.element.style.display = '';
            }
            this.focus();
            EVENTS.emit('window:restored', this._payload());
        }
    }

    /** minimize() <-> restore(). No-op if showMinimize is false. */
    toggleMinimize() {
        if (!this._showMinimize) return;
        if (this._isMinimized) this.restore();
        else this.minimize();
    }

    /**
     * Maximize: fill the available space. Desktop uses a 20px viewport
     * inset (CSS fallback). Mobile uses <main>'s bounds computed by
     * _applyMaximizeBounds() so the panel never overlaps the sticky
     * header or the footer/taskbar.
     */
    maximize() {
        if (!this._showMaximize) return;
        if (this._isMaximized) return;
        this._preMaxRect = {
            x: this._pos.x,
            y: this._pos.y,
            width: this.element.offsetWidth,
            height: this.element.offsetHeight
        };
        this._isMaximized = true;
        this.element.classList.add('is-maximized');

        /* Compute and apply maximize bounds. No-op on desktop where the
           CSS fallback (20px viewport inset) takes over. */
        this._applyMaximizeBounds();

        if (this._btnMax) {
            this._btnMax.innerHTML = ICON_RESTORE;
            this._btnMax.setAttribute('aria-label', 'Restore');
        }

        EVENTS.emit('window:maximized', this._payload());
    }

    /** Restore pre-maximize rect. Emits window:unmaximized. */
    unmaximize() {
        if (!this._isMaximized) return;
        this._isMaximized = false;
        this.element.classList.remove('is-maximized');

        /* Clear all four mobile maximize properties. */
        this.element.style.removeProperty('--maximize-top');
        this.element.style.removeProperty('--maximize-bottom');
        this.element.style.removeProperty('--maximize-left');
        this.element.style.removeProperty('--maximize-right');

        if (this._preMaxRect) {
            this._applyRect(this._preMaxRect);
            this._preMaxRect = null;
        }
        if (this._btnMax) {
            this._btnMax.innerHTML = ICON_MAXIMIZE;
            this._btnMax.setAttribute('aria-label', 'Maximize');
        }
        EVENTS.emit('window:unmaximized', this._payload());
    }

    /** maximize() <-> unmaximize(). No-op if showMaximize is false. */
    toggleMaximize() {
        if (!this._showMaximize) return;
        if (this._isMaximized) this.unmaximize();
        else this.maximize();
    }

    /* LIFECYCLE */

    /**
     * Bring the window to the front within its tier.
     */
    focus() {
        const base = this._zIndexBase;
        const max = base + 999;
        let counter = _zIndexCounters.get(base) || base;
        counter++;
        if (counter > max) counter = max;
        _zIndexCounters.set(base, counter);
        this.element.style.zIndex = String(counter);
        EVENTS.emit('window:focused', this._payload());
    }

    /** Hide the window, clear persisted state, reset max/min flags. Emits window:closed. */
    close() {
        this.element.style.display = 'none';
        try { localStorage.removeItem(this._storageKey()); } catch { /* ignore */ }

        this._isMinimized = false;
        this._isMaximized = false;
        this.element.classList.remove('is-minimized', 'is-maximized');
        this._preMaxRect = null;
        this._needsReset = true;

        if (this._btnMax) {
            this._btnMax.innerHTML = ICON_MAXIMIZE;
            this._btnMax.setAttribute('aria-label', 'Maximize');
        }

        EVENTS.emit('window:closed', this._payload());
    }

    /**
     * Tear down the window: remove every listener attached by this
     * instance, unregister from WINDOW_REGISTRY, and emit
     * window:destroyed. Every removeEventListener call below matches a
     * listener that was stored as an instance property before being
     * attached.
     */
    destroy() {
        window.removeEventListener('resize', this._onResizeViewport);
        this.header.removeEventListener('mousedown', this._onHeaderDown);

        if (this._resizeHandles) {
            for (const { el, handler } of this._resizeHandles) {
                el.removeEventListener('mousedown', handler);
                el.removeEventListener('touchstart', handler);
            }
            this._resizeHandles = null;
        }

        this.header.removeEventListener('touchstart', this._onHeaderDown);
        this.header.removeEventListener('dblclick', this._onHeaderDblClick);
        this.element.removeEventListener('mousedown', this._onElementMouseDown);

        /* Detach document-level drag / resize listeners if destroy() runs
        mid-interaction (e.g., a module is torn down while the user is
        holding the header). Without this, the listeners stay attached
        to `document` after the window is gone. */
        document.removeEventListener('mousemove', this._onDocMove);
        document.removeEventListener('touchmove', this._onDocMove);
        document.removeEventListener('mouseup', this._onDocUp);
        document.removeEventListener('touchend', this._onDocUp);
        this._isDragging = false;
        this._isResizing = false;

        WINDOW_REGISTRY.delete(this.id);
        EVENTS.emit('window:destroyed', this._payload());
    }

    /* CONTROLS */

    /* Build the minimize / maximize / close buttons and append to header. */
    _createControls() {
        const wrap = document.createElement('div');
        wrap.className = 'core-panel-controls';

        if (this._showMinimize) {
            const btnMin = document.createElement('button');
            btnMin.className = 'core-panel-btn core-panel-btn-minimize';
            btnMin.type = 'button';
            btnMin.setAttribute('aria-label', 'Minimize');
            btnMin.innerHTML = ICON_MINIMIZE;
            btnMin.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMinimize(); });
            wrap.appendChild(btnMin);
        }

        if (this._showMaximize) {
            const btnMax = document.createElement('button');
            btnMax.className = 'core-panel-btn core-panel-btn-maximize';
            btnMax.type = 'button';
            btnMax.setAttribute('aria-label', 'Maximize');
            btnMax.innerHTML = ICON_MAXIMIZE;
            btnMax.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(); });
            this._btnMax = btnMax;
            wrap.appendChild(btnMax);
        }

        const btnClose = document.createElement('button');
        btnClose.className = 'core-panel-btn core-panel-btn-close';
        btnClose.type = 'button';
        btnClose.setAttribute('aria-label', 'Close');
        btnClose.innerHTML = ICON_CLOSE;
        btnClose.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
        wrap.appendChild(btnClose);

        return wrap;
    }

    /* RESIZE */

    /* Add 8 resize handle divs (one per direction) to the element. */
    _createResizeHandles() {
        this._resizeHandles = [];
        for (const dir of RESIZE_DIRECTIONS) {
            const handle = document.createElement('div');
            handle.className = `core-panel-resize core-panel-resize-${dir.name}`;
            handle.setAttribute('aria-hidden', 'true');

            const onDown = (e) => this._onResizeStart(e, dir);
            handle.addEventListener('mousedown', onDown);
            handle.addEventListener('touchstart', onDown, { passive: false });

            this._resizeHandles.push({ el: handle, handler: onDown });
            this.element.appendChild(handle);
        }
    }

    /* Begin resize on handle mousedown/touchstart. Captures start rect + pointer. */
    _onResizeStart(e, dir) {
        if (this._isMaximized || this._isMinimized) return;

        const isTouch = e.type === 'touchstart';
        const point = isTouch ? e.touches[0] : e;
        if (!point) return;

        e.preventDefault();
        e.stopPropagation();

        this._isResizing = true;
        this._resizeDir = dir;

        const rect = this.element.getBoundingClientRect();
        this._resizeStart = {
            x: point.clientX,
            y: point.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };

        this.element.classList.add('is-resizing');
        this.focus();

        document.addEventListener('mousemove', this._onDocMove);
        document.addEventListener('touchmove', this._onDocMove, { passive: false });
        document.addEventListener('mouseup', this._onDocUp);
        document.addEventListener('touchend', this._onDocUp);
    }

    /* Recompute rect from pointer delta and clamp to bounds. */
    _resizeMove(clientX, clientY) {
        const dir = this._resizeDir;
        const start = this._resizeStart;
        const dx = clientX - start.x;
        const dy = clientY - start.y;

        let width = start.width;
        let height = start.height;
        let left = start.left;
        let top = start.top;

        if (dir.cx === 1) width = start.width + dx;
        if (dir.cx === -1) {
            width = start.width - dx;
            left = start.left + dx;
        }
        if (dir.cy === 1) height = start.height + dy;
        if (dir.cy === -1) {
            height = start.height - dy;
            top = start.top + dy;
        }

        if (width < this._minWidth) {
            if (dir.cx === -1) left = start.left + (start.width - this._minWidth);
            width = this._minWidth;
        }
        if (height < this._minHeight) {
            if (dir.cy === -1) top = start.top + (start.height - this._minHeight);
            height = this._minHeight;
        }

        const clamped = this._clampRectToBounds({ x: left, y: top, width, height });

        this._pos = { x: clamped.x, y: clamped.y };
        this.element.style.left = clamped.x + 'px';
        this.element.style.top = clamped.y + 'px';
        this.element.style.width = clamped.width + 'px';
        this.element.style.height = clamped.height + 'px';
    }

    /* DRAG */

    /* Begin drag on header mousedown/touchstart. */
    _onHeaderDown(e) {
        if (this._isMaximized) return;
        if (e.target.closest('.core-panel-btn')) return;
        if (e.target.closest('.core-panel-resize')) return;

        const isTouch = e.type === 'touchstart';
        const point = isTouch ? e.touches[0] : e;
        if (!point) return;

        e.preventDefault();

        const rect = this.element.getBoundingClientRect();
        this._dragOffset = {
            x: point.clientX - rect.left,
            y: point.clientY - rect.top
        };
        this._isDragging = true;
        this.element.classList.add('is-dragging');
        this.focus();

        document.addEventListener('mousemove', this._onDocMove);
        document.addEventListener('touchmove', this._onDocMove, { passive: false });
        document.addEventListener('mouseup', this._onDocUp);
        document.addEventListener('touchend', this._onDocUp);
    }

    /**
     * Header double-click handler - toggles maximize. Skipped when
     * showMaximize is false and when the click lands on a control
     * button.
     * @param {MouseEvent} e
     */
    _onHeaderDblClick(e) {
        if (!this._showMaximize) return;
        if (e.target.closest('.core-panel-btn')) return;
        e.preventDefault();
        this.toggleMaximize();
    }

    /**
     * Element mousedown handler - brings the window to the front of
     * its tier. Buttons call stopPropagation in their own handlers, so
     * this fires only for non-button events.
     */
    _onElementMouseDown() {
        this.focus();
    }

    /* Dispatch to _moveTo (dragging) or _resizeMove (resizing) based on state. */
    _onDocMove(e) {
        const isTouch = e.type === 'touchmove';
        const point = isTouch ? e.touches[0] : e;
        if (!point) return;

        if (this._isDragging) {
            e.preventDefault();
            this._moveTo(point.clientX - this._dragOffset.x, point.clientY - this._dragOffset.y);
        } else if (this._isResizing) {
            e.preventDefault();
            this._resizeMove(point.clientX, point.clientY);
        }
    }

    /* End drag/resize, detach document listeners, save state. */
    _onDocUp() {
        if (this._isDragging) {
            this._isDragging = false;
            this.element.classList.remove('is-dragging');
        }
        if (this._isResizing) {
            this._isResizing = false;
            this._resizeDir = null;
            this._resizeStart = null;
            this.element.classList.remove('is-resizing');
        }
        document.removeEventListener('mousemove', this._onDocMove);
        document.removeEventListener('touchmove', this._onDocMove);
        document.removeEventListener('mouseup', this._onDocUp);
        document.removeEventListener('touchend', this._onDocUp);
        this._saveState();
    }

    /* Move window to (x, y), clamped to bounds. */
    _moveTo(x, y) {
        const w = this.element.offsetWidth;
        const h = this.element.offsetHeight;
        const clamped = this._clampRectToBounds({ x, y, width: w, height: h });

        this._pos = { x: clamped.x, y: clamped.y };
        this.element.style.left = clamped.x + 'px';
        this.element.style.top = clamped.y + 'px';
    }

    /* VIEWPORT */

    /* Return the active bounds: viewport on desktop, <main> rect on mobile <=768px. */
    _getBounds() {
        if (window.matchMedia('(max-width: 768px)').matches) {
            const main = document.querySelector('main');
            if (main) {
                const rect = main.getBoundingClientRect();
                if (rect.width > 100 && rect.height > 100) {
                    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
                }
            }
        }
        return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    }

    /**
     * @returns {boolean} True when the viewport matches the mobile breakpoint.
     */
    _shouldAutoMaximizeOnMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    /**
     * Apply maximize bounds.
     *
     * Desktop: no-op. Clears any mobile properties so the CSS fallback
     * (20px viewport inset on all four sides) applies.
     *
     * Mobile: sets four custom properties that the CSS consumes as
     * top/left/right/bottom insets.
     *   - Horizontal: equal 10px insets from the viewport edges, so
     *     left and right margins stay symmetric regardless of scrollbar
     *     presence or body padding.
     *   - Vertical: top gap = <main>.top + 10px, bottom gap = distance
     *     from <main>.bottom to viewport bottom + 10px. This excludes
     *     the sticky header and the footer/taskbar from the panel's
     *     footprint while keeping 10px of breathing room inside <main>.
     *
     * Called on maximize, unmaximize, and viewport resize while
     * maximized. Cleared inline props on unmount so a fresh maximize
     * always recomputes.
     */
    _applyMaximizeBounds() {
        if (!window.matchMedia('(max-width: 768px)').matches) {
            this.element.style.removeProperty('--maximize-top');
            this.element.style.removeProperty('--maximize-bottom');
            this.element.style.removeProperty('--maximize-left');
            this.element.style.removeProperty('--maximize-right');
            return;
        }

        const inset = 10;
        const main = document.querySelector('main');

        let topGap = inset;
        let bottomGap = inset;

        if (main) {
            const rect = main.getBoundingClientRect();
            topGap = Math.max(inset, rect.top + inset);
            bottomGap = Math.max(
                inset,
                window.innerHeight - (rect.top + rect.height) + inset
            );
        }

        /* Horizontal: equal from viewport edges. This is what makes
           left/right margins symmetric. Body padding + scrollbar are
           absorbed by the fixed-position coordinate system (the panel
           is positioned relative to the viewport, not body). */
        this.element.style.setProperty('--maximize-left', inset + 'px');
        this.element.style.setProperty('--maximize-right', inset + 'px');
        this.element.style.setProperty('--maximize-top', topGap + 'px');
        this.element.style.setProperty('--maximize-bottom', bottomGap + 'px');
    }

    /* Clamp { x, y, width, height } to the active bounds. */
    _clampRectToBounds({ x, y, width, height }) {
        const b = this._getBounds();

        if (typeof width === 'number') width = Math.min(width, b.width);
        if (typeof height === 'number') height = Math.min(height, b.height);

        if (typeof x === 'number') {
            const maxX = b.x + b.width - (width ?? 0);
            x = Math.max(b.x, Math.min(x, maxX));
        } else {
            x = this._pos.x;
        }
        if (typeof y === 'number') {
            const maxY = b.y + b.height - (height ?? 0);
            y = Math.max(b.y, Math.min(y, maxY));
        } else {
            y = this._pos.y;
        }

        return { x, y, width, height };
    }

    /* Handle window resize: re-clamp, or recompute mobile maximize bounds. */
    _onResizeViewport() {
        /* Skip hidden windows. A resize while the window is closed
           (inline display: none) or minimized (CSS display: none via
           .is-minimized) reports offsetWidth and offsetHeight of 0,
           so _clampRectToBounds would clamp the stored position to
           the top-left corner and _setPosition would persist it. The
           window jumps to (0, 0) on the next restore. */
        if (!this.isVisible) return;

        if (this._isMaximized) {
            this._applyMaximizeBounds();
            return;
        }
        const w = this.element.offsetWidth;
        const h = this.element.offsetHeight;
        const clamped = this._clampRectToBounds({
            x: this._pos.x,
            y: this._pos.y,
            width: w,
            height: h
        });
        if (clamped.x !== this._pos.x || clamped.y !== this._pos.y) {
            this._setPosition(clamped.x, clamped.y);
            this._saveState();
        }
    }

    /* PERSISTENCE */

    /* Build the localStorage key for this window's saved state. */
    _storageKey() {
        return `panel:${this.id}:state`;
    }

    /**
     * Save current position and size. Skipped when maximized, minimized,
     * or closed - the latter prevents persisting {width: 0, height: 0}
     * when a viewport resize fires while the window is display: none.
     */
    _saveState() {
        if (this._isMaximized || this._isMinimized) return;
        if (this.element.style.display === 'none') return;
        const rect = {
            x: this._pos.x,
            y: this._pos.y,
            width: this.element.offsetWidth,
            height: this.element.offsetHeight
        };
        try {
            localStorage.setItem(this._storageKey(), JSON.stringify(rect));
        } catch { /* localStorage can fail in private browsing */ }
    }

    /**
     * Restore saved state if present and valid, otherwise center.
     * A saved state with width or height below MIN_SAVED_DIMENSION is
     * treated as corrupted (typically from an old save bug) and ignored.
     */
    _loadState() {
        let saved = null;
        try {
            const raw = localStorage.getItem(this._storageKey());
            if (raw) saved = JSON.parse(raw);
        } catch { saved = null; }

        const validSaved = saved
            && typeof saved.x === 'number'
            && typeof saved.y === 'number'
            && typeof saved.width === 'number'
            && saved.width >= MIN_SAVED_DIMENSION
            && typeof saved.height === 'number'
            && saved.height >= MIN_SAVED_DIMENSION;

        if (validSaved) {
            this.element.style.width = saved.width + 'px';
            this.element.style.height = saved.height + 'px';
            this._applyRect({
                x: saved.x,
                y: saved.y,
                width: this.element.offsetWidth || saved.width,
                height: this.element.offsetHeight || saved.height
            });
            return;
        }

        this._applyCenter();
    }

    /* LAYOUT */

    /**
     * Center a fresh window. Uses `document.documentElement.clientWidth`
     * and `clientHeight` instead of `window.innerWidth` / `innerHeight`
     * because `position: fixed` positions relative to the layout viewport,
     * and `clientWidth` / `clientHeight` report that exactly - including
     * the scrollbar and browser-chrome differences that `innerWidth` /
     * `innerHeight` sometimes miss on mobile.
     *
     * Only on mobile is the result clamped to `<main>`'s rect, and only
     * when `<main>` is fully inside the viewport. On a tall viewport this
     * clamp never fires (there is room for the panel between header and
     * footer at the viewport center); on a short viewport it pushes the
     * panel up just enough to fit without overlapping the chrome. On
     * desktop the bounds ARE the viewport, so viewport-centered IS
     * bounds-centered and no clamp is needed.
     *
     * Measurements pinned as inline width/height so a stable size survives
     * the display: none -> display: '' transition on close->reopen.
     */
    _applyCenter() {
        const vw = document.documentElement.clientWidth;
        const vh = document.documentElement.clientHeight;

        let w = this.element.offsetWidth;
        let h = this.element.offsetHeight;

        if (!w || w < MIN_SAVED_DIMENSION || w > 20000) w = FALLBACK_WIDTH;
        if (!h || h < MIN_SAVED_DIMENSION || h > 20000) h = FALLBACK_HEIGHT;

        if (w > vw) w = vw;
        if (h > vh) h = vh;

        this.element.style.width = w + 'px';
        this.element.style.height = h + 'px';

        /* Ideal center is on the VIEWPORT. `position: fixed` is relative
        to the viewport, so this is the coordinate system that matters. */
        let x = Math.round((vw - w) / 2);
        let y = Math.round((vh - h) / 2);

        /* On mobile, clamp to <main> ONLY when <main> is fully in the
        viewport. Short viewports fall into this branch and push the
        panel up just enough to clear the sticky header and footer.
        Tall viewports skip the clamp - the panel is centered on the
        viewport, which is what the user sees. */
        if (window.matchMedia('(max-width: 768px)').matches) {
            const main = document.querySelector('main');
            if (main) {
                const mainRect = main.getBoundingClientRect();
                const mainFullyVisible =
                    mainRect.top >= 0 &&
                    mainRect.bottom <= vh &&
                    mainRect.height >= h;
                if (mainFullyVisible) {
                    if (y < mainRect.top) y = mainRect.top;
                    if (y + h > mainRect.bottom) y = mainRect.bottom - h;
                }
            }
        }

        this._setPosition(x, y);
    }

    /**
     * Reset to default size and position. On mobile, only panels that
     * opted into autoMaximizeMobile re-maximize here - the default
     * peek panels fall back to their CSS-defined size and centered
     * position, matching a fresh open.
     */
    _resetToDefault() {
        this.element.style.width = '';
        this.element.style.height = '';
        this.element.style.left = '';
        this.element.style.top = '';
        this._applyCenter();

        if (this._shouldAutoMaximizeOnMobile() && this._autoMaximizeMobile) {
            this.maximize();
        }
    }

    /* Apply a rect, clamped to bounds. */
    _applyRect({ x, y, width, height }) {
        const clamped = this._clampRectToBounds({ x, y, width, height });

        if (typeof clamped.width === 'number') this.element.style.width = clamped.width + 'px';
        if (typeof clamped.height === 'number') this.element.style.height = clamped.height + 'px';

        this._pos = { x: clamped.x, y: clamped.y };
        this.element.style.left = clamped.x + 'px';
        this.element.style.top = clamped.y + 'px';
    }

    /* Set position without clamping. Caller must ensure x/y are valid. */
    _setPosition(x, y) {
        this._pos = { x, y };
        this.element.style.left = x + 'px';
        this.element.style.top = y + 'px';
    }

    /* PAYLOAD */

    /* Build the event bus payload for this window's lifecycle events. */
    _payload() {
        return {
            id: this.id,
            label: this.label,
            icon: this.icon,
            showInTaskbar: this.showInTaskbar,
            persistInTaskbar: this.persistInTaskbar
        };
    }
}