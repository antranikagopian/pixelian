/**
 * Main application entry point.
 *
 * Boot sequence:
 *   1. Taskbar and theme widget initialize.
 *   2. initApp() runs in parallel with the site loader animation.
 *   3. Loader hides when both init and animation settle.
 *   4. data/site.json is checked against CORE_SITE_DATA_SCHEMA before
 *      any binding. Outdated configs fail with migration steps instead
 *      of silently hiding the attribution footer.
 *   5. One boot summary prints after module inits settle.
 *   6. URL-triggered errors (?error=NNN) show the core ErrorDialog
 *      after boot via showUrlErrorDialog.
 *
 * Loader hide uses Promise.allSettled so a rejected initApp() cannot
 * leave the loader visible forever.
 *
 * Data loading is tolerant (missing data files warn, do not fail the
 * module). A missing manifest is caught by js/modules/index.js and
 * skipped; broken static imports inside a manifest abort that module.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { CORE_VERSION, CORE_CODE_NAME, CORE_SITE_DATA_SCHEMA } from './core/config.js';
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

/* Register all modules (data only - does not throw). Runs before
   initApp so assertRequirements has the full registry when it checks
   each module's REQUIRES_CORE and DEPENDENCIES. */
for (const mod of MODULE_LIST) {
    const version = mod.config.VERSION;
    const requires = mod.config.REQUIRES_CORE || undefined;
    registerModule(mod.name, version, requires);
}

/* Expose the version inspector for manual console use. The boot
   summary below prints once automatically; this stays available for
   on-demand re-inspection (e.g. after a module hot-swap). */
window.getLoadedModules = getLoadedModules;

/* STATE */

/* Tracks whether the app has finished initialising (used by siteInit). */
let _appReady = false;

/* HELPERS */

/**
 * Fail the boot with a clear migration message if data/site.json uses
 * an older schema than this build expects. Runs before any binding so
 * the attribution footer can never silently hide.
 *
 * Two failure shapes:
 *   - Missing field: treats as schema 0 (pre-schema). Message names
 *     the exact fields to add and rename.
 *   - Lower integer: message names the schema found, the expected one,
 *     and points at CHANGELOG.md for the migration steps.
 *
 * Both paths call window.siteShowErrorRaw, which is defined in the
 * inline script in index.php. It is available before app.js runs, so
 * the dialog works even if no modules have initialized yet. Falls
 * through silently if the function is somehow absent.
 *
 * @param {Object} siteData - Parsed data/site.json.
 * @throws {Error} Always, after showing the error dialog. Boot stops.
 */
function assertSiteDataSchema(siteData) {
    const hasSchema = Number.isInteger(siteData?.schemaVersion);
    const schema = hasSchema ? siteData.schemaVersion : 0;

    if (hasSchema && schema === CORE_SITE_DATA_SCHEMA) return;

    const container = document.querySelector('#module');
    const message = hasSchema
        ? `data/site.json uses schema ${schema}, but Pixelian v${CORE_VERSION} expects ${CORE_SITE_DATA_SCHEMA}. See CHANGELOG.md v2.0.0 for migration steps.`
        : `data/site.json is missing "schemaVersion". Add "schemaVersion": 2 and migrate to the "pixelPatterns" object. See CHANGELOG.md v2.0.0.`;
        
    if (typeof window.siteShowErrorRaw === 'function') {
        window.siteShowErrorRaw(container, 'Config', message);
    }

    throw new Error(
        `data/site.json schema ${schema} is outdated. Expected ${CORE_SITE_DATA_SCHEMA}.`
    );
}

/**
 * Print core version and one table row per module. Called once after
 * every module init has settled.
 *
 * Two outputs:
 *   1. console.log with the core name and version, styled with the
 *      Pixelian accent color. Matches the brand color used in the
 *      loader and panel accents.
 *   2. console.table with one row per module. Columns: module name,
 *      module version, required core version, init status (OK / FAIL),
 *      error message (empty on success).
 *
 * Bails before the table when MODULE_LIST is empty (data/modules.json
 * with {"modules": []}). The core line still prints, so the console
 * shows at least one line even on a module-less deployment.
 *
 * @param {PromiseSettledResult[]} results - Aligned with MODULE_LIST.
 */
function printBootSummary(results) {
    console.log(
        `%c${CORE_CODE_NAME}%c v${CORE_VERSION}`,
        'color:#4cffb0;font-weight:700;',
        'color:inherit;'
    );

    if (MODULE_LIST.length === 0) return;

    console.table(
        MODULE_LIST.map((mod, i) => ({
            module: mod.name,
            version: mod.config.VERSION,
            requires: mod.config.REQUIRES_CORE || '-',
            status: results[i].status === 'fulfilled' ? 'OK' : 'FAIL',
            error: results[i].status === 'rejected'
                ? (results[i].reason?.message || String(results[i].reason))
                : ''
        }))
    );
}

/* INIT */

/**
 * Main application bootstrap.
 *
 * Steps in order:
 *   1. Load data/site.json (inline first, then fetch, then hard-coded
 *      fallback so the page always renders).
 *   2. Validate the schema. Outdated files abort boot with a dialog
 *      that names the migration steps.
 *   3. Apply DOM bindings for header, footer, and attribution. Each
 *      binding hides its element when the value is missing or the
 *      toggle key is false.
 *   4. Collapse header .brand and footer .legal wrappers when both
 *      children are hidden (no dangling gap).
 *   5. Initialize all modules in parallel. Missing data files warn;
 *      missing code imports still abort the whole graph.
 *   6. Wait for all inits to settle (never reject).
 *   7. Print the boot summary.
 *   8. If any module failed, show an ErrorDialog. Skipped when the
 *      boot was triggered by ?error=NNN, since the URL error takes
 *      priority.
 *   9. Fire loaderFinished so the site loader can hide.
 *
 * @returns {Promise<PromiseSettledResult[]>} Module init results.
 */
async function initApp() {
    const siteData = await fetchSiteData();
    window.__SITE_DATA__ = siteData;

    /* Schema check runs before any binding. A wrong shape would
       silently hide the attribution footer, which is a license
       violation. Failing loudly protects the footer and tells the
       user exactly what to change. */
    assertSiteDataSchema(siteData);

    /* DOM bindings for site data. Elements hide when the
       corresponding flag is false or the value is empty. */
    const siteBindings = [
        { selector: 'header h1',          key: 'title',       type: 'text', toggleKey: 'showBrand' },
        { selector: 'header p',           key: 'tagline',     type: 'text', toggleKey: 'showTagline' },
        { selector: '.copyright',         key: 'copyright',   type: 'html' },
        { selector: '.legal-attribution', key: 'attribution', type: 'html', toggleKey: 'showAttribution' }
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

    /* Collapse the legal wrapper when both copyright and attribution
       are hidden. Prevents a dangling gap in the footer when both
       site.json fields are empty and both toggles are off. */
    const legal = document.querySelector('footer .legal');
    if (legal) {
        const copyrightEl = legal.querySelector('.copyright');
        const attributionEl = legal.querySelector('.legal-attribution');
        const bothHidden =
            copyrightEl?.style.display === 'none' && attributionEl?.style.display === 'none';
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

            /* Assert requirements, then initialise. mount carries
               target/position from data/modules.json (undefined when
               the entry was a plain string - modules fall back to
               their own defaults). */
            assertRequirements(mod.name, version, requiresCore, deps, requiresPrimitives);
            await mod.init(moduleData, mod.mount);
            return mod.name;
        })();
    });

    const results = await Promise.allSettled(MODULES);

    /* Single boot summary. Replaces the previous per-module
       console.log loop and the top-level getLoadedModules call. */
    printBootSummary(results);

    /* Module-failure dialog. Skipped when the boot was triggered by
       ?error=NNN, since the URL error takes priority and its dialog
       is opened by the .then below. */
    const failedResults = results.filter(r => r.status === 'rejected');
    if (failedResults.length > 0 && !window._hasUrlError) {
        const failedNames = results
            .map((r, i) =>
                r.status === 'rejected' ? (MODULE_LIST[i]?.name || `module ${i}`) : null)
            .filter(Boolean);
        const errorMessages = failedResults
            .map(r => r.reason?.message || 'Unknown error')
            .join('; ');

        const dialog = new ErrorDialog({
            target: '#module',
            panelId: 'error-dialog-module'
        });
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
    .finally(() => {
        if (window._urlErrorCode) {
            showUrlErrorDialog(window._urlErrorCode, window._siteErrorMessages);
        }
    })
    .catch((err) => {
        console.error('[app] init failed:', err);
        document.getElementById('siteLoader')?.classList.add('hidden');
    });

/* SITE HOOKS */

window.siteInit = function () {
    if (_appReady) {
        window.dispatchEvent(new CustomEvent('loaderFinished'));
    }
};