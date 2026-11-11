/**
 * Theme state and selector widget. ThemeManager applies site and panel
 * theme classes, persists to localStorage, and exposes static getters
 * for any module that needs to read the current theme. ThemeSelector
 * builds the dropdown widget and mounts it into a target container.
 *
 * Two themes exist:
 *   - Site theme  (.site-dark / .site-light on <body>)
 *   - Panel theme (.panel-dark / .panel-light on #module)
 *
 * Both persist to localStorage under keys "siteTheme" and "panelTheme".
 *
 * Dropdown portal:
 *   The trigger button lives inside the taskbar, which sits behind all
 *   draggable windows (z-index 100 vs 2000+). To make the dropdown appear
 *   above every panel, ThemeSelector moves .theme-options to <body> with
 *   position: fixed + z-index 5000 while open, and restores it into the
 *   theme selector after the closing transition. This escapes the
 *   taskbar's stacking context and honors the tier map defined in
 *   core/window.js:
 *
 *     2000  content panels
 *     4000  error
 *     5000  theme dropdown
 *
 * ESC handling:
 *   Document-level, bubble phase. Fires after ErrorDialog's capture-phase
 *   handler, so an open error dialog always closes before the theme
 *   dropdown. Matches the documented priority chain in (GUIDE.md §7.12, 
 *   Error behavior).
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* PUBLIC API */

export class ThemeManager {
    /**
     * Instantiate a manager bound to the current document state. Reads the
     * site theme from the body class (set by the inline script to prevent
     * FOUC) and the panel theme from localStorage.
     */
    constructor() {
        this.body = document.body;
        this.moduleContainer = document.getElementById('module');
        this.siteOptions = document.querySelectorAll('[data-theme^="site-"]');
        this.panelOptions = document.querySelectorAll('[data-theme^="panel-"]');
        this._init();
    }

    /**
     * Read the currently applied site theme without instantiating a manager.
     * @returns {'dark'|'light'}
     */
    static getCurrentSite() {
        return document.body.classList.contains('site-light') ? 'light' : 'dark';
    }

    /**
     * Read the currently applied panel theme without instantiating a manager.
     * @returns {'dark'|'light'}
     */
    static getCurrentPanel() {
        const mod = document.getElementById('module');
        return mod?.classList.contains('panel-light') ? 'light' : 'dark';
    }

    /**
     * Initialize from the current DOM state. The inline script already
     * applied the correct site class, so we just sync localStorage and
     * update the widget UI. Panel theme is restored from localStorage.
     */
    _init() {
        const currentSite = ThemeManager.getCurrentSite();
        localStorage.setItem('siteTheme', currentSite);
        this._updateSiteUI(currentSite);
        const savedPanel = localStorage.getItem('panelTheme') || 'dark';
        this._applyPanelTheme(savedPanel);
    }

    /** Update the site theme buttons to reflect the active theme. */
    _updateSiteUI(theme) {
        this.siteOptions.forEach(btn => {
            const isActive = btn.dataset.theme === `site-${theme}`;
            btn.setAttribute('aria-selected', isActive);
            btn.classList.toggle('selected', isActive);
        });
    }

    /** Apply a new site theme (triggered by user selection). */
    _applySiteTheme(theme) {
        this.body.classList.remove('site-dark', 'site-light');
        this.body.classList.add(theme === 'light' ? 'site-light' : 'site-dark');
        localStorage.setItem('siteTheme', theme);
        this._updateSiteUI(theme);
    }

    /** Apply a new panel theme (triggered by user selection). */
    _applyPanelTheme(theme) {
        if (this.moduleContainer) {
            this.moduleContainer.classList.remove('panel-dark', 'panel-light');
            this.moduleContainer.classList.add(theme === 'light' ? 'panel-light' : 'panel-dark');
        }
        localStorage.setItem('panelTheme', theme);
        this.panelOptions.forEach(btn => {
            const isActive = btn.dataset.theme === `panel-${theme}`;
            btn.setAttribute('aria-selected', isActive);
            btn.classList.toggle('selected', isActive);
        });
    }

    /** Handle a theme selection from the dropdown. */
    handleSelection(datasetTheme) {
        if (datasetTheme.startsWith('site-')) {
            this._applySiteTheme(datasetTheme.replace('site-', ''));
        } else if (datasetTheme.startsWith('panel-')) {
            this._applyPanelTheme(datasetTheme.replace('panel-', ''));
        }
    }
}

/**
 * ThemeSelector creates the theme-switching widget and inserts it into a
 * configurable container. The dropdown auto-adapts its position: vertical
 * opens upward when space below is insufficient; horizontal stays within
 * the viewport.
 */
export class ThemeSelector {
    /**
     * @param {Object} [options]
     * @param {string|HTMLElement} [options.target='header'] - CSS selector
     *   or element to mount into.
     * @param {'first'|'last'} [options.position='first'] - Insert as first
     *   or last child of the target.
     */
    constructor({ target = 'header', position = 'first' } = {}) {
        this.container = null;
        this.trigger = null;
        this.optionsPanel = null;
        this.manager = null;
        this._isOpen = false;

        /* Portal state - populated while the dropdown is open. */
        this._portalParent = null;
        this._portalNext = null;

        /* Restore timer handle. Set by _close(), cancelled by _open().
           Without this, a fast close -> open leaves the pending
           setTimeout to yank the panel out of <body> mid-open, which
           breaks the portal positioning and lands the dropdown in the
           wrong place. */
        this._restoreTimer = null;

        const targetElement = typeof target === 'string'
            ? document.querySelector(target)
            : target;
        if (!targetElement) {
            console.warn(`ThemeSelector: target "${target}" not found. Widget will not be created.`);
            return;
        }

        if (getComputedStyle(targetElement).position === 'static') {
            targetElement.style.position = 'relative';
        }

        let widgetClass = '';
        const isInsideFooter = targetElement.closest('footer') !== null;
        if (isInsideFooter) {
            widgetClass = 'theme-footer';
        } else if (targetElement.tagName !== 'HEADER') {
            widgetClass = 'theme-inline';
        }

        const insertPosition = position === 'last' ? 'beforeend' : 'afterbegin';
        targetElement.insertAdjacentHTML(insertPosition, this._buildHTML(widgetClass));

        this.container = document.getElementById('themeSelector');
        this.trigger = document.getElementById('themeTrigger');
        this.optionsPanel = document.getElementById('themeOptions');
        this.manager = new ThemeManager();
        this._init();
    }

    /** @returns {HTMLElement} Root widget element (#themeSelector). */
    get element() { return this.container; }

    /** Returns the HTML string for the theme selector widget. */
    _buildHTML(extraClass = '') {
        return `
        <div id="themeSelector" class="${extraClass}">
            <button id="themeTrigger" class="theme-trigger-btn" aria-haspopup="listbox" aria-expanded="false">
                <i class="fas fa-palette"></i> Theme
            </button>
            <div id="themeOptions" class="theme-options" role="listbox" aria-label="Theme options">
                <div class="theme-group">
                    <span class="theme-group-title">Site</span>
                    <button class="theme-option" data-theme="site-dark" role="option" aria-selected="true">
                        <i class="fas fa-moon"></i> Dark
                    </button>
                    <button class="theme-option" data-theme="site-light" role="option" aria-selected="false">
                        <i class="fas fa-sun"></i> Light
                    </button>
                </div>
                <div class="theme-group">
                    <span class="theme-group-title">Panel</span>
                    <button class="theme-option" data-theme="panel-dark" role="option" aria-selected="true">
                        <i class="fas fa-moon"></i> Dark
                    </button>
                    <button class="theme-option" data-theme="panel-light" role="option" aria-selected="false">
                        <i class="fas fa-sun"></i> Light
                    </button>
                </div>
            </div>
        </div>`;
    }

    /** Attach event listeners for the dropdown behavior. */
    _init() {
        if (!this.trigger || !this.optionsPanel) return;

        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggle();
        });

        this.optionsPanel.addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (option) {
                this.manager.handleSelection(option.dataset.theme);
                this._close();
            }
        });

        /* Click outside closes. Uses composedPath so the check works even
           though .theme-options may be portaled to <body>. */
        document.addEventListener('click', (e) => {
            if (!this._isOpen) return;
            const path = e.composedPath ? e.composedPath() : [];
            if (path.includes(this.container) || path.includes(this.optionsPanel)) return;
            this._close();
        });

        /* Arrow navigation between options. Only fires when focus is
           inside the panel (which is the only time it makes sense). */
        this.optionsPanel.addEventListener('keydown', (e) => {
            const items = Array.from(this.optionsPanel.querySelectorAll('.theme-option'));
            const current = document.activeElement;
            const index = items.indexOf(current);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = items[index + 1] || items[0];
                next.focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = items[index - 1] || items[items.length - 1];
                prev.focus();
            }
        });

        /* ESC - document-level, bubble phase. Fires after ErrorDialog's
           capture-phase handler, so an open error dialog always closes
           first. */
        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented) return;
            if (e.key !== 'Escape') return;
            if (!this._isOpen) return;
            e.preventDefault();
            this._close();
            this.trigger.focus();
        });
    }

    /** Toggle between open and closed states. */
    _toggle() { this._isOpen ? this._close() : this._open(); }

    /**
     * Open the options panel. Reparents .theme-options to <body> with
     * fixed positioning so it escapes the taskbar's stacking context and
     * sits above all panels (z-index 5000).
     *
     * Race protection: if _close() scheduled a restore and the user
     * reopens before it fires, cancel that timer here. The saved
     * _portalParent stays valid because _close() only clears it inside
     * the timer callback, not before it.
     */
    _open() {
        const panel = this.optionsPanel;
        if (!panel) return;

        /* Cancel any pending restore from a recent close. Without this,
           a fast close -> open leaves the pending setTimeout to yank
           the panel back into its original container mid-open, which
           breaks the portal's viewport positioning. */
        if (this._restoreTimer) {
            clearTimeout(this._restoreTimer);
            this._restoreTimer = null;
        }

        /* Portal: move to body so z-index 5000 escapes the taskbar. Save
           the original parent + sibling so we can restore on close. Only
           capture when the panel is not already in <body> - if a prior
           restore is still pending (which we just cancelled), the saved
           parent is already correct. */
        if (panel.parentNode !== document.body) {
            this._portalParent = panel.parentNode;
            this._portalNext = panel.nextSibling;
            document.body.appendChild(panel);
        }
        panel.style.position = 'fixed';
        panel.style.zIndex = '5000';

        /* Measure while hidden so panel dimensions are valid for
           positioning. */
        panel.style.display = 'block';
        panel.style.visibility = 'hidden';
        panel.style.opacity = '0';

        this._positionDropdown();

        panel.style.display = '';
        panel.style.visibility = '';
        panel.style.opacity = '';

        panel.classList.add('open');
        this.trigger.classList.add('active');
        this.trigger.setAttribute('aria-expanded', 'true');
        this._isOpen = true;

        const firstOption = panel.querySelector('.theme-option');
        if (firstOption) firstOption.focus();
    }

    /**
     * Close the options panel. After the closing transition finishes,
     * restores .theme-options to its original DOM position inside the
     * theme selector so the widget stays self-contained when idle.
     *
     * The restore runs in a setTimeout whose handle is stored on
     * this._restoreTimer. _open() cancels that timer if the user
     * reopens before it fires, which keeps the portal state consistent
     * and prevents the panel from being yanked into the wrong parent
     * while it is open. _portalParent is only cleared inside the timer
     * callback so a cancelled restore leaves it intact for the next
     * close.
     */
    _close() {
        const panel = this.optionsPanel;
        if (!panel) return;

        panel.classList.remove('open');
        this.trigger.classList.remove('active');
        this.trigger.setAttribute('aria-expanded', 'false');
        this._isOpen = false;

        /* Restore DOM position after the closing transition (200ms, same
           as the CSS transition on .theme-options). */
        if (this._portalParent) {
            const panelRef = panel;
            this._restoreTimer = setTimeout(() => {
                this._restoreTimer = null;
                const parent = this._portalParent;
                const next = this._portalNext;
                this._portalParent = null;
                this._portalNext = null;

                if (panelRef.parentNode === document.body) {
                    parent.insertBefore(panelRef, next);

                    /* Clear every inline style applied during _open() and
                       _positionDropdown(). Missing "right" and "bottom"
                       left stale `bottom: auto` overrides in place, which
                       fought the CSS rule that anchors the panel above the
                       trigger - causing a visible gap in the footer after
                       close. Also drop the orientation classes so the
                       panel returns to its pristine CSS-defined state. */
                    panelRef.classList.remove('drop-up', 'drop-down');
                    panelRef.style.position = '';
                    panelRef.style.zIndex = '';
                    panelRef.style.left = '';
                    panelRef.style.top = '';
                    panelRef.style.right = '';
                    panelRef.style.bottom = '';
                    panelRef.style.display = '';
                    panelRef.style.visibility = '';
                    panelRef.style.opacity = '';

                    /* Force a synchronous reflow so the browser recomputes
                       layout with the cleaned-up state before the next
                       paint. Without this, the panel's stale measurements
                       can leak into the footer for one frame. */
                    void panelRef.offsetHeight;
                }
            }, 200);
        }
    }

    /**
     * Position the portal dropdown in viewport coordinates. Inline
     * top/left override the base CSS rules (which are designed for
     * container-relative positioning while the panel is not portaled).
     */
    _positionDropdown() {
        const panel = this.optionsPanel;
        const trigger = this.trigger;
        const triggerRect = trigger.getBoundingClientRect();
        const panelWidth = panel.offsetWidth;
        const panelHeight = panel.offsetHeight;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        /* Vertical: down if there is room below, or more room below than
           above. Matches the old behavior but operates in viewport coords. */
        const spaceBelow = vh - triggerRect.bottom;
        const spaceAbove = triggerRect.top;
        const vertical = (spaceBelow >= panelHeight || spaceBelow >= spaceAbove)
            ? 'down' : 'up';

        panel.classList.remove('drop-up', 'drop-down');
        panel.classList.add(vertical === 'up' ? 'drop-up' : 'drop-down');

        /* Horizontal: prefer centering on the trigger; fall back to
           aligning an edge; finally, clamp to the viewport. */
        let left;
        const spaceLeft = triggerRect.left;
        const spaceRight = vw - triggerRect.right;

        if (spaceLeft >= panelWidth / 2 && spaceRight >= panelWidth / 2) {
            left = triggerRect.left + (triggerRect.width / 2) - (panelWidth / 2);
        } else if (spaceRight >= panelWidth) {
            left = triggerRect.left;
        } else if (spaceLeft >= panelWidth) {
            left = triggerRect.right - panelWidth;
        } else {
            left = vw - panelWidth;
        }
        left = Math.max(8, Math.min(left, vw - panelWidth - 8));

        panel.style.left = left + 'px';
        panel.style.right = 'auto';

        /* Vertical top: always set an explicit top so growth direction is
           deterministic. For drop-up, offset by panel height. */
        if (vertical === 'down') {
            panel.style.top = (triggerRect.bottom + 8) + 'px';
        } else {
            panel.style.top = Math.max(8, triggerRect.top - panelHeight - 8) + 'px';
        }
        panel.style.bottom = 'auto';
    }
}