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
 *                              when that option is not explicitly passed -
 *                              if you can minimize it, you must be able to
 *                              restore it from the taskbar.
 *   showMaximize      boolean  Whether the window has a maximize button
 *                              (default true).
 *   showInTaskbar     boolean  Whether to show a taskbar button. Defaults
 *                              to the value of showMinimize.
 *   persistInTaskbar  boolean  Keep the taskbar button visible after the
 *                              window is closed. Default false - only the
 *                              primary-interface panels opt in. When false,
 *                              closing the window removes its taskbar button
 *                              and the window must be reopened via your own
 *                              API call. When true, the button stays dimmed
 *                              and can restore the window on click.
 *   autoMaximizeMobile boolean Auto-maximize on mobile (<=768px). Default
 *                              false: detail panels (any non-primary panels)
 *                              open at their natural peek size, leaving
 *                              surrounding context visible above and below.
 *                              Primary-interface panels pass true because
 *                              they are the primary interface and should
 *                              fill <main> on mobile. See Window's JSDoc
 *                              for the full rationale.
 *   label             string   Taskbar button label (default: title).
 *   zIndexBase        number   Z-index tier base (default 2000). Higher
 *                              tiers always sit above lower ones. See
 *                              core/window.js for the tier map.
 *   minWidth          number   Resize floor width in px (default 260).
 *   minHeight         number   Resize floor height in px (default 80).
 *   className         string   Extra class on the root element.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { Window } from './window.js';

/* PUBLIC API */

export class Panel {
    /**
     * @param {Object} [options] - Configuration. See module header for
     * the full option list.
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
        /* Resolve defaults. Draggable requires a header and an id. */
        if (draggable === null) draggable = showHeader && id !== null;

        /* Taskbar visibility derives from minimize capability: if you can
           minimize it, you must be able to restore it from the taskbar.
           If you cannot minimize it, it should not clutter the taskbar. */
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

        /* Build the root element. The core-panel class provides the base
           window frame styles; core-panel-no-header lets CSS target
           headerless panels if needed; className is for module-specific
           overrides. */
        this.el = document.createElement('div');
        this.el.className = 'core-panel' +
            (showHeader ? '' : ' core-panel-no-header') +
            (className ? ' ' + className : '');

        this._header = null;
        this._icon = null;
        this._title = null;

        /* Header - only if showHeader. Holds icon, title, and (once
           Window attaches) the minimize/maximize/close controls. */
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

        /* Content area - always present, holds the panel's body. */
        this._content = document.createElement('div');
        this._content.className = 'core-panel-content';
        this.el.appendChild(this._content);

        /* Defer window attachment until mount so offsetWidth is
           meaningful when Window calculates its initial position. */
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
     * @param {string} text - New title.
     * @returns {Panel} This panel (for chaining).
     */
    setTitle(text) {
        if (this._title) this._title.textContent = text;
        if (this.window) this.window.label = text;
        return this;
    }

    /**
     * Set the header icon. No-op when showHeader was false.
     * @param {string} text - New icon glyph.
     * @returns {Panel} This panel (for chaining).
     */
    setIcon(text) {
        if (this._icon) this._icon.textContent = text;
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
     * @param {...HTMLElement} nodes - Nodes to append.
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
     * requested. Idempotent - calling twice does nothing.
     */
    mountWindow() {
        if (!this._pendingWindow || this.window) return;

        const {
            label,
            icon,
            showInTaskbar,
            showMinimize,
            showMaximize,
            persistInTaskbar,
            autoMaximizeMobile
        } = this._pendingWindow;
        this._pendingWindow = null;

        /* Window decorates the existing element - it does not create a
           new one. All original panel styles continue to apply. */
        this.window = new Window({
            id: this._id,
            element: this.el,
            header: this._header,
            label,
            icon,
            showInTaskbar,
            showMinimize,
            showMaximize,
            persistInTaskbar,
            autoMaximizeMobile,
            zIndexBase: this._zIndexBase,
            minWidth: this._minWidth,
            minHeight: this._minHeight
        });
    }

    /**
     * Remove the panel from the DOM. Detaches the window first (unbinds
     * listeners, unregisters) so no stale state remains in WindowRegistry.
     */
    destroy() {
        if (this.window) {
            this.window.destroy();
            this.window = null;
        }
        this.el.remove();
    }
}