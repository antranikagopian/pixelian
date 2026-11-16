/**
 * Shared core config. CORE_VERSION bumps on every release.
 * CORE_SITE_DATA_SCHEMA bumps only when the shape of data/site.json
 * changes (field rename, field removal, type change).
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* CONSTANTS */

export const CORE_VERSION = '1.3.0';
export const CORE_CODE_NAME = 'Pixelian';

/* Expected shape of data/site.json. Independent of CORE_VERSION.
   Bumps only when the shape changes, never on a regular release.
   Any file missing the field is treated as schema 0 (pre-schema),
   so configs written before v1.3.0 fail the check and show the
   migration steps in app.js. */
export const CORE_SITE_DATA_SCHEMA = 1;