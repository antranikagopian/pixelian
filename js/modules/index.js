/**
 * Dynamic module loader. Reads data/modules.json (inlined by index.php
 * as <script id="data-modules">), dynamically imports each active
 * module's manifest.js, and exports MODULE_LIST.
 *
 * data/modules.json accepts two entry forms, mixed freely:
 *   strings  - {"modules": ["card", "module-a"]}
 *              mount defaults: target '#module', position 'first'
 *   objects  - {"modules": [
 *                { "name": "card", "target": "#module", "position": "first" }
 *              ]}
 *              explicit mount config per module
 *
 * Each loaded descriptor is augmented with a `mount` object carrying
 * the resolved entry's target/position (undefined when the entry was a
 * string - modules fall back to their own defaults). app.js passes this
 * as the second argument to manifest.init(moduleData, mount).
 *
 * Module descriptor shape (each manifest.js default export):
 *   name     string   unique identifier
 *   config   object   the module's config.js exports
 *   init     async    async function (moduleData, mount)
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

const _raw = readInlineData('modules')?.modules || FALLBACK;
const _active = _raw
    .map(entry => typeof entry === 'string' ? { name: entry } : entry)
    .filter(entry => typeof entry?.name === 'string' && /^[a-z0-9_-]+$/i.test(entry.name));

const _loaded = await Promise.all(
    _active.map(async (entry) => {
        try {
            const mod = await import(`./${entry.name}/manifest.js`);
            return {
                ...mod.default,
                mount: {
                    target: entry.target,
                    position: entry.position
                }
            };
        } catch (err) {
            console.warn(`[modules] "${entry.name}" not found, skipping:`, err.message);
            return null;
        }
    })
);

/**
 * Modules to load at boot, in the order listed in data/modules.json.
 * Modules not present on disk are silently skipped. Each descriptor
 * carries a `mount` object with target/position from the manifest
 * entry (or undefined when the entry was a plain string).
 *
 * @type {Array<{ name: string, config: Object, init: Function, mount: { target?: string, position?: string } }>}
 */
export const MODULE_LIST = _loaded.filter(Boolean);