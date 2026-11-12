/**
 * Error dialog service and URL error routing.
 *
 * Two concerns, one file:
 *   1. ErrorDialog class. Renders the dialog in one of three modes
 *      (panel, overlay, custom). Used by app.js for module failures and
 *      by the URL error path.
 *   2. URL error routing. showUrlErrorDialog() and stripUrlErrorParam()
 *      handle the ?error=NNN flow: show the dialog, then strip the
 *      code from the URL so the address bar stays clean.
 *
 * Both concerns live here because they are the same system (error UI).
 * Splitting them would force app.js to carry error-dialog lifecycle
 * state (a singleton ErrorDialog instance) which is not its job.
 *
 * ErrorDialog render modes (pass via the `mode` option):
 *   'panel'   (default) - renders as a close-only core Panel: draggable,
 *             resizable, with a header X button. Inherits frame, header,
 *             and close button from panel.css. Best visual integration
 *             with the rest of the template.
 *   'overlay'           - renders as a full-screen modal overlay. Useful
 *             for projects that don't want the error to look like a panel,
 *             or that want a blocking, page-dimming error state.
 *   function            - a custom renderer called with { title, message,
 *             container }. The function is responsible for building and
 *             dismissing its own UI; call `.hide()` on the ErrorDialog
 *             returns nothing (custom mode owns its own teardown).
 *
 * ESC priority: the ESC handler is registered on document with
 * `{ capture: true }` so it fires BEFORE the theme dropdown handler
 * (bubble phase). This makes error dismissal win over every other ESC
 * consumer when both are open, matching the documented priority chain
 * (see GUIDE.md, Error, ESC priority).
 *
 * The panel-mode dialog is configured close-only:
 *   showMinimize: false  -> no minimize button, not in taskbar
 *   showMaximize: false  -> no maximize button
 *   close button is always shown
 *
 * URL error routing contract:
 *   - index.php sets window._urlErrorCode = '<code>' when ?error=<code>
 *     is present on load, then hides the loader and exits its inline
 *     script early.
 *   - app.js reads window._urlErrorCode after initApp settles and calls
 *     showUrlErrorDialog(code, messages).
 *   - showUrlErrorDialog opens the dialog and calls stripUrlErrorParam,
 *     which removes ?error=<code> from the URL via replaceState so the
 *     user never sees the code in the address bar and Back does not
 *     re-trigger the dialog on the same URL.
 *
 * Usage:
 *   const dialog = new ErrorDialog({ target: '#module' });
 *   dialog.show('Error', 'Something went wrong.');
 *
 *   const overlayDialog = new ErrorDialog({ mode: 'overlay' });
 *   overlayDialog.show('Error', 'Fatal.');
 *
 *   const customDialog = new ErrorDialog({
 *       mode: ({ title, message, container }) => { ... }
 *   });
 *
 *   import { showUrlErrorDialog } from './error.js';
 *   showUrlErrorDialog('404', window._siteErrorMessages);
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { loadCSS } from './utils.js';
import { Panel } from './panel.js';

/* PUBLIC API */

export class ErrorDialog {
    /**
     * @param {Object} [options]
     * @param {string|HTMLElement} [options.target='#module'] - Mount container.
     * @param {'panel'|'overlay'|Function} [options.mode='panel'] - Renderer.
     */
    constructor({ target = '#module', mode = 'panel' } = {}) {
        this.container = typeof target === 'string'
            ? document.querySelector(target)
            : target;
        this.mode = mode;
        this.panel = null;
        this.overlay = null;
        this._loaded = false;
        this._escHandler = null;
    }

    /**
     * Load error.css once (panel.css is loaded statically in index.php).
     */
    async _ensureCSS() {
        if (!this._loaded) {
            await loadCSS('/css/error.css');
            this._loaded = true;
        }
    }

    /**
     * Register a document-level ESC listener so pressing Escape dismisses
     * the dialog from anywhere. Registered with `{ capture: true }` so it
     * fires BEFORE the theme dropdown (bubble phase). Error dismissal must
     * win when both are open.
     *
     * Only attached while a dialog is visible.
     */
    _attachEscapeHandler() {
        if (this._escHandler) return;
        this._escHandler = (e) => {
            if (e.defaultPrevented) return;
            if (e.key !== 'Escape') return;
            e.preventDefault();
            this.hide();
        };
        document.addEventListener('keydown', this._escHandler, { capture: true });
    }

    /* Remove the document-level ESC listener. No-op when not attached. */
    _detachEscapeHandler() {
        if (this._escHandler) {
            document.removeEventListener('keydown', this._escHandler, { capture: true });
            this._escHandler = null;
        }
    }

    /**
     * Show the error dialog. Any previous dialog is dismissed first so
     * only one is on screen at a time.
     *
     * @param {string} title   - Dialog title.
     * @param {string} message - Error message text.
     */
    async show(title, message) {
        await this._ensureCSS();
        this.hide();

        if (typeof this.mode === 'function') {
            this.mode({ title, message, container: this.container });
            return;
        }
        if (this.mode === 'overlay') {
            this._showOverlay(title, message);
            this._attachEscapeHandler();
            return;
        }
        this._showPanel(title, message);
        this._attachEscapeHandler();
    }

    /**
     * Panel renderer (default). Creates a close-only Panel with a red-
     * tinted icon and the message body. Uses a higher z-index base than
     * normal panels (4000 vs 2000) so errors always sit above content panels.
     *
     * @param {string} title
     * @param {string} message
     */
    _showPanel(title, message) {
        if (!this.container) return;

        this.panel = new Panel({
            title: title || 'Error',
            icon: '!',
            id: `error-${Date.now()}`,
            draggable: true,
            showMinimize: false,
            showMaximize: false,
            zIndexBase: 4000,
            minWidth: 320,
            minHeight: 160,
            className: 'module-error-panel'
        });

        const msg = document.createElement('div');
        msg.className = 'module-error-message';
        msg.textContent = message || 'An unexpected error occurred.';
        this.panel.appendContent(msg);

        this.container.appendChild(this.panel.element);
        this.panel.mountWindow();
    }

    /**
     * Overlay renderer. Full-screen modal that dims the page. Used when
     * the project doesn't want the panel look, or wants a blocking error
     * state. Provides an X button and a click-outside-to-dismiss handler.
     *
     * @param {string} title
     * @param {string} message
     */
    _showOverlay(title, message) {
        if (!this.container) return;

        const overlay = document.createElement('div');
        overlay.className = 'module-error-overlay';

        overlay.innerHTML = `
            <div class="module-error-overlay-dialog" role="alertdialog" aria-modal="true">
                <div class="module-error-overlay-header">
                    <span class="module-error-overlay-title"></span>
                    <button class="module-error-overlay-close" type="button" aria-label="Close">&times;</button>
                </div>
                <div class="module-error-overlay-body"></div>
            </div>
        `;

        overlay.querySelector('.module-error-overlay-title').textContent = title || 'Error';
        overlay.querySelector('.module-error-overlay-body').textContent =
            message || 'An unexpected error occurred.';

        const close = () => this.hide();
        overlay.querySelector('.module-error-overlay-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    /** Dismiss the current dialog (panel or overlay), if any. */
    hide() {
        this._detachEscapeHandler();
        if (this.panel) {
            this.panel.destroy();
            this.panel = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

/* STATE */

/* URL error routing. Reused across boot and any future error paths so
   only one dialog instance exists at a time. Module-scope here (not
   app.js) because URL error handling is an error-system concern, and
   keeping the singleton in app.js would force app.js to carry error
   lifecycle state it does not otherwise need. */

let _urlErrorDialog = null;

/* URL ERRORS */

/**
 * Show the ErrorDialog panel for a URL error code, then strip the code
 * from the URL so the address bar stays clean.
 *
 * Called by app.js after initApp settles, when window._urlErrorCode is
 * set (which index.php does on load when ?error=<code> is present).
 * The dialog is reused across calls, so a follow-up URL error replaces
 * the current dialog instead of stacking.
 *
 * Side effect: on a successful call, ?error=<code> is removed from the
 * current URL via history.replaceState. Other query parameters and the
 * hash are preserved.
 *
 * @param {string|number} code - HTTP status code from window._urlErrorCode.
 * @param {Object} [messages={}] - code -> message map
 *   (typically window._siteErrorMessages). Missing codes fall back to
 *   'An unexpected error occurred.'
 * @param {Object} [options]
 * @param {string} [options.target='#module'] - Mount container for the dialog.
 * @returns {void}
 */
export function showUrlErrorDialog(code, messages = {}, { target = '#module' } = {}) {
    if (!code) return;

    if (!_urlErrorDialog) {
        _urlErrorDialog = new ErrorDialog({ target, mode: 'panel' });
    }

    const message = messages[code] || 'An unexpected error occurred.';
    _urlErrorDialog.show('Error ' + code, message);
    stripUrlErrorParam(messages);
}

/**
 * Remove ?error=<code> from the current URL via history.replaceState.
 *
 * No-op when the parameter is missing, or when the code is not in the
 * known messages map (unknown codes should stay in the URL so the
 * developer can see them). Preserves every other query parameter, the
 * pathname, and the hash.
 *
 * Uses replaceState (not pushState) so no new history entry is created
 * and the Back button behaves normally. All other query parameters and
 * the pathname are preserved:
 *   /foo?error=404        -> /foo
 *   /foo?bar=1&error=404  -> /foo?bar=1
 *   /?error=500           -> /
 *   /foo                  -> /foo  (no change)
 *
 * Known edge case: pressing Back after an error re-visits the URL that
 * produced it (e.g. /missing), which 302s to /?error=404 again, so the
 * dialog shows again. This is a property of the 302 redirect chain, not
 * of the strip; the strip only removes the code from the CURRENT entry.
 *
 * @param {Object} [messages={}] - code -> message map. Used to decide
 *   whether the code is "known" and therefore strippable.
 * @returns {void}
 */
export function stripUrlErrorParam(messages = {}) {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('error');
    if (!code) return;
    if (!messages[code]) return;

    url.searchParams.delete('error');
    const target = url.pathname + url.search + url.hash;
    try {
        history.replaceState(null, '', target);
    } catch {
        /* history API can throw in cross-origin contexts, never here. */
    }
}