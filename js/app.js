/**
 * Main application entry point.
 *
 * Boot contract:
 *  - The taskbar initialises first so widgets (theme selector) can mount
 *    into its widget slot.
 *  - initApp() runs in parallel with the site loader animation.
 *  - The loader hides only when BOTH init AND animation are finished.
 *  - Set `enableSiteLoader: false` in SITE_CONFIG to skip the loader.
 *  - URL-triggered errors (?error=NNN) show the core ErrorDialog (panel
 *    mode) after boot. The dialog and the URL strip are implemented in
 *    core/error.js (showUrlErrorDialog + stripUrlErrorParam) so this
 *    file does not carry error-dialog lifecycle state. app.js just
 *    calls showUrlErrorDialog with the boot-time code.
 *
 * Loader hide uses Promise.allSettled, not Promise.all: a rejected
 * initApp() must never leave the loader at opacity: 1 forever. Errors
 * are logged by initApp itself; here we only care that boot has settled.
 *
 * Data loading is tolerant. Missing data files log a warning but do not
 * fail the module. Each module guards its own data access - a well-
 * behaved module either shows its fallback content or omits its output
 * instead of crashing. This makes adding and removing modules safe:
 * forgetting to remove a REQUIRES_DATA entry when deleting a file does
 * not break boot.
 *
 * IMPORTANT: this tolerance only covers missing DATA FILES. Broken
 * IMPORT PATHS in any module still abort the whole app.js graph because
 * ES module imports are static - the browser refuses to execute the
 * parent module if any child import 404s. Broken imports show the
 * fallback overlay at z-index 9999.
 *
 * Layering:
 *  - core:     primitives (Panel, Window, Taskbar, Events, Theme)
 *              + services (ErrorDialog, Api, Sanitize)
 *  - modules:  data-driven content (Card)
 *
 * The module list is imported from ./modules/index.js. The loader
 * reads data/modules.json (Pixelian default: ["card"]) and imports
 * each active module's manifest.js. Override data/modules.json to
 * add or remove modules - no code edit needed.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { CORE_VERSION, CORE_CODE_NAME } from './core/config.js';
import {
    registerCore,
    registerModule,
    assertRequirements,
    getLoadedModules
} from './core/version-registry.js';

import { fetchSiteData, loadJSON, urlToInlineId } from './core/utils.js';
import { readInlineData } from './core/data.js';
import { ThemeSelector } from './core/theme.js';
import { TaskbarManager } from './core/taskbar.js';
import { ErrorDialog, showUrlErrorDialog } from './core/error.js';

import { MODULE_LIST } from './modules/index.js';

/* REGISTRATION */

/* Core registration. Called once at boot so the version registry knows
   which core build is running. */
registerCore(CORE_VERSION, CORE_CODE_NAME);

/* GLOBALS */

/* Register all modules (data only - does not throw). */
for (const mod of MODULE_LIST) {
    const version = mod.config.VERSION;
    const requires = mod.config.REQUIRES_CORE || undefined;
    registerModule(mod.name, version, requires);
}

/* Expose the version inspector for manual console use. */
window.getLoadedModules = getLoadedModules;

/* STATE */

/* Tracks whether the app has finished initialising (used by siteInit). */
let _appReady = false;

/**
 * Main application bootstrap.
 *
 * Loads site data, applies DOM bindings, initialises all modules, and
 * surfaces any module failures in an error dialog. Missing data files
 * log a warning but do not fail the module - every module guards its
 * data.
 *
 * @returns {Promise<PromiseSettledResult[]>} Module init results.
 */
async function initApp() {
    const siteData = await fetchSiteData();
    window.__SITE_DATA__ = siteData;

    /* DOM bindings for site data. Elements hide when the corresponding
       flag is false or the value is empty. */
    const siteBindings = [
        { selector: 'header h1',   key: 'title',     type: 'text', toggleKey: 'showBrand' },
        { selector: 'header p',    key: 'tagline',   type: 'text', toggleKey: 'showTagline' },
        { selector: '.copyright',  key: 'copyright', type: 'html' },
        { selector: '.powered-by', key: 'poweredBy', type: 'html', toggleKey: 'showPoweredBy' }
    ];

    for (const { selector, key, type, toggleKey } of siteBindings) {
        const element = document.querySelector(selector);
        if (!element) continue;

        const value = siteData[key];
        const explicitlyHidden = toggleKey ? siteData[toggleKey] === false : false;
        const hasValue = typeof value === 'string'
            ? value.trim() !== ''
            : value !== undefined && value !== null;
        const shouldShow = !explicitlyHidden && hasValue;

        if (!shouldShow) {
            element.style.display = 'none';
            continue;
        }

        element.style.display = '';
        if (type === 'html') {
            element.innerHTML = value;
        } else {
            element.textContent = value;
        }
    }

    /* Collapse the brand wrapper when both title and tagline are hidden. */
    const brand = document.querySelector('header .brand');
    if (brand) {
        const titleEl = brand.querySelector('h1');
        const taglineEl = brand.querySelector('p');
        const bothHidden =
            titleEl?.style.display === 'none' && taglineEl?.style.display === 'none';
        brand.style.display = bothHidden ? 'none' : '';
    }

    /* Collapse the legal wrapper when both copyright and poweredBy are hidden. */
    const legal = document.querySelector('footer .legal');
    if (legal) {
        const copyrightEl = legal.querySelector('.copyright');
        const poweredByEl = legal.querySelector('.powered-by');
        const bothHidden =
            copyrightEl?.style.display === 'none' && poweredByEl?.style.display === 'none';
        legal.style.display = bothHidden ? 'none' : '';
    }

    /**
     * Build an array of module init promises. Each entry:
     *   1. Reads required JSON data (inline first, fetch fallback).
     *      Missing files log a warning; they do not throw.
     *   2. Asserts core / module / primitive requirements (these DO throw).
     *   3. Initialises the module.
     *
     * Inline IDs are derived via urlToInlineId():
     *   /data/site.json    -> 'site'
     *   /data/card.json    -> 'card'
     */
    const MODULES = MODULE_LIST.map(mod => {
        const version = mod.config.VERSION;
        const requiresCore = mod.config.REQUIRES_CORE || undefined;
        const requiresPrimitives = mod.config.REQUIRES_PRIMITIVES || [];
        const deps = mod.config.DEPENDENCIES || {};
        const requiredData = mod.config.REQUIRES_DATA || [];

        return (async () => {
            /* Load module data - inline first, fetch fallback. Tolerant:
               a missing data file becomes a warning, not a failure. */
            const moduleData = {};
            for (const url of requiredData) {
                const inline = readInlineData(urlToInlineId(url));
                if (inline) {
                    moduleData[url] = inline;
                    continue;
                }
                const data = await loadJSON(url);
                if (data === null) {
                    console.warn(`[module:${mod.name}] missing data file: ${url}`);
                    continue;
                }
                moduleData[url] = data;
            }

            /* Assert requirements, then initialise. */
            assertRequirements(mod.name, version, requiresCore, deps, requiresPrimitives);
            await mod.init(moduleData);
            return mod.name;
        })();
    });

    const results = await Promise.allSettled(MODULES);

    results.forEach((result, i) => {
        const name = MODULE_LIST[i]?.name || `module ${i}`;
        if (result.status === 'fulfilled') {
            console.log(`✓ ${name}`);
        } else {
            console.error(`✗ ${name}`, result.reason);
        }
    });

    const failedResults = results.filter(r => r.status === 'rejected');
    if (failedResults.length > 0 && !window._hasUrlError) {
        const failedNames = results
            .map((r, i) =>
                r.status === 'rejected' ? (MODULE_LIST[i]?.name || `module ${i}`) : null)
            .filter(Boolean);
        const errorMessages = failedResults
            .map(r => r.reason?.message || 'Unknown error')
            .join('; ');

        const dialog = new ErrorDialog({ target: '#module' });
        dialog.show(
            'Error',
            `Failed to load: ${failedNames.join(', ')}. ${errorMessages}`
        );
    }

    _appReady = true;
    window.dispatchEvent(new CustomEvent('loaderFinished'));
    return results;
}

/* Taskbar and theme widget are not modules - init them once at boot.
   Taskbar is created first so the theme selector can mount into its
   widget slot. */
const TASKBAR = new TaskbarManager({ target: '.taskbar' });
new ThemeSelector({ target: TASKBAR.widgetSlot, position: 'first' });

/* BOOT */

const INIT_PROMISE = initApp();

if (window._urlErrorCode) {
    /* URL error path: skip loader wait. */
} else if (window._siteLoaderEnabled === false) {
    /* Loader skip mode - hide immediately, init still runs. */
    document.getElementById('siteLoader')?.classList.add('hidden');
} else {
    /* Hide only when BOTH animation AND init have finished.
       allSettled, not all: a rejected initApp must never leave the loader
       at opacity: 1 forever. Errors are logged by initApp itself; here we
       only care that the boot sequence has settled. */
    const animPromise = new Promise(resolve =>
        window.addEventListener('loaderAnimationDone', resolve, { once: true })
    );
    Promise.allSettled([INIT_PROMISE, animPromise]).then(() => {
        document.getElementById('siteLoader')?.classList.add('hidden');
    });
}

/* URL ERRORS */

/* URL-triggered error dialog. The dialog + URL strip live in
   core/error.js (showUrlErrorDialog + stripUrlErrorParam). This file
   only passes the boot-time code and the messages map. See the module
   header at the top of app.js for the full boot rationale, and
   core/error.js for the strip behavior and Back-button caveat. */
INIT_PROMISE
    .then(() => {
        if (window._urlErrorCode) {
            showUrlErrorDialog(window._urlErrorCode, window._siteErrorMessages);
        }
    })
    .catch((err) => {
        /* initApp can reject if fetchSiteData or any module's pre-init
           throws. Surface it in the console and hide the loader so the
           user is not stuck on a black screen. */
        console.error('[app] init failed:', err);
        document.getElementById('siteLoader')?.classList.add('hidden');
    });

/* SITE HOOKS */

window.siteInit = function () {
    if (_appReady) {
        window.dispatchEvent(new CustomEvent('loaderFinished'));
    }
};