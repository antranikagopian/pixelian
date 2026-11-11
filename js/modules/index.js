/**
 * Dynamic module loader. Reads data/modules.json (inlined by index.php
 * as <script id="data-modules">), dynamically imports each active
 * module's manifest.js, and exports MODULE_LIST.
 *
 * Module descriptor shape (each manifest.js default export):
 *   name     string   unique identifier
 *   config   object   the module's config.js exports
 *   init     async    async function receiving loaded data
 *
 * The import path is relative to this file. Modules not present on
 * disk are skipped with a console warning. If data/modules.json is
 * missing, falls back to ["card"] so a fresh clone still renders.
 *
 * Top-level await is used so MODULE_LIST resolves before app.js reads
 * it. app.js's static import of MODULE_LIST waits on this module's
 * top-level await, so no async syntax is needed in app.js.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { readInlineData } from '../core/data.js';

/* CONSTANTS */

const FALLBACK = ['card'];

/* PUBLIC API */

const _active = (readInlineData('modules')?.modules || FALLBACK)
    .filter(n => typeof n === 'string' && /^[a-z0-9_-]+$/i.test(n));
const _loaded = await Promise.all(
    _active.map(async (name) => {
        try {
            const mod = await import(`./${name}/manifest.js`);
            return mod.default;
        } catch (err) {
            console.warn(`[modules] "${name}" not found, skipping:`, err.message);
            return null;
        }
    })
);

/**
 * Modules to load at boot, in the order listed in data/modules.json.
 * Modules not present on disk are silently skipped.
 *
 * @type {Array<{ name: string, config: Object, init: Function }>}
 */
export const MODULE_LIST = _loaded.filter(Boolean);