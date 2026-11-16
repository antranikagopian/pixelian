# Changelog

All notable changes to Pixelian are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-11-16

Renames the license to the Pixelian License and rebrands external attribution to Pixelian.dev. Author and copyright holder are unchanged (Antranik Agopian). Existing `data/site.json` files require migration; the page fails loudly with steps if the file is missing `schemaVersion`.

### Added

- `schemaVersion` field in `data/site.json`. v1.3.0 expects `schemaVersion: 1`. Older configs (no field) fail the boot check with migration steps instead of silently hiding the attribution footer.
- `CORE_SITE_DATA_SCHEMA` constant in `js/core/config.js`. Independent of `CORE_VERSION`, bumps only on shape changes.
- `<meta name="generator">` in `index.php`, value read from `CORE_VERSION`. Tag stays in sync without manual edits.
- `SECURITY.md` at the repo root. Reporting channel and supported versions.
- `pixelCols` optional field in `data/site.json`. Overrides the auto-computed column count when a pattern length has no clean layout (8, 10, 11, 13, ...). When absent, the heuristic still runs (perfect square -> sqrt; multiple of 7 -> 7 columns; n <= 7 -> single row; fallback -> 7 columns).
- `--site-underline-dashes`, `--site-underline-dash`, `--site-underline-gap` CSS variables in `index.php :root`. `--site-underline-dashes` is set from `$pixelCols` at request time; the dash width (`calc(2em / 7)`) and gap width (`calc(1em / 7)`) are static. The underline renders exactly `$pixelCols` dashes at any h1 width.

### Changed

- License renamed from Antranik License 1.0 to Pixelian License 1.0.
- Runtime attribution now targets Pixelian.dev. `Powered by Pixelian.dev` (unmodified) and `Extends Pixelian.dev` (modified). `Powered by Antranik.dev` reserved for projects authored or directly supervised by Antranik Agopian.
- Every shipped code file updates its header: `@copyright` line splits into two lines, `@copyright Copyright (c) 2026 Antranik Agopian` and `@license Pixelian License (see LICENSE)`. License version lives in `LICENSE` only.
- `data/site.json -> poweredBy` renamed to `attribution`. `showPoweredBy` renamed to `showAttribution`. CSS class `.powered-by` renamed to `.legal-attribution`.
- Boot logging consolidated into one summary after module inits settle. Core version line, then one table row per module (version, required core, init status, error). The top-level `getLoadedModules({ logToConsole: true })` call and the per-module `console.log` loop are removed. `window.getLoadedModules` stays available for on-demand inspection.
- `fetchSiteData()` fallback in `core/utils.js` now returns a Pixelian-branded object, not a "YourProject" placeholder.
- Pixel pattern unified. `data/site.json -> pixelPattern` is the single source for the error overlay fallback, no-JS fallback, brand underline dash count, and boot loader pixel count. Modules that render the pattern read it from `window.__SITE_DATA__.pixelPattern`. Column and row counts are auto-computed from pattern length via `computePixelLayout(pattern, overrideCols)` in `core/utils.js` (mirrored in `index.php`), with `data/site.json -> pixelCols` as an optional override.
- `index.php` layout heuristic extracted to a `computePixelLayout($len, $override = 0)` PHP function, matching the JS export name and signature. The existing `inline_json` helper was renamed to `inlineJson` for the same reason: one camelCase convention across PHP and JS. Behavior is unchanged.
- `SITE_CONFIG.errorPixelCols` renamed to `SITE_CONFIG.pixelCols`; `SITE_CONFIG.errorPixelPattern` renamed to `SITE_CONFIG.pixelPattern`. Same values, new names. Only impacts code that read the old fields directly.
- `loaderPixelCount` in `SITE_CONFIG` is now derived from `data/site.json -> pixelPattern` column count (floored at 3), not hardcoded to 7. The same value drives the brand underline dash count and the boot loader, so the two elements always match the pattern width.
- `computePixelLayout(pattern, overrideCols)` accepts an optional `overrideCols` argument. When passed a positive integer, it wins over the heuristic; rows are derived from `pattern.length / overrideCols`. Backward compatible: existing one-argument calls behave identically.

### Notes

- Migration from v1.2.x: add `"schemaVersion": 1`, rename `poweredBy` to `attribution`, rename `showPoweredBy` to `showAttribution`. The boot check enforces this.
- Copyright holder and author unchanged: Antranik Agopian <hello@antranik.dev>.
- `pixelian.dev` is now the official domain. `pixelian.net` reserved and covered by trademark.
- Pixel pattern migration from v1.2.x: any module with its own pattern config must move to `data/site.json -> pixelPattern`. Optional: add `pixelCols` when the pattern length is not a perfect square, not a multiple of 7, or greater than 7. Both fields are read at request time by `index.php` for the no-JS grid and underline, and by `app.js` into `window.__SITE_DATA__` for module consumption.

## [1.2.2] - 2026-11-15

### Fixed

- `CORE_VERSION` in `core/config.js` synced with the release tag. v1.2.1 shipped with `1.2.0` in the file, so the boot log and `getLoadedModules()` reported the wrong core version.

### Removed

- Stale `VERSION` export in `core/utils.js`. Unused, never updated past `'1.1.0'`, superseded by `CORE_VERSION` in `core/config.js`.

## [1.2.1] - 2026-11-15

Boot log. Core and module versions are printed to the console on every page load, so the loaded surface is visible without a manual `getLoadedModules()` call.

### Added

- Automatic `getLoadedModules({ logToConsole: true })` call in `js/app.js` after module registration.

## [1.2.0] - 2026-11-15

Adds `waitForLoaderGone()` to `core/utils.js`: resolves when `#siteLoader` has fully faded out, no timeout.

### Added

- `waitForLoaderGone()` in `core/utils.js`. Resolves when `#siteLoader` has fully faded out, with no safety timeout. Complements `waitForLoaderHidden()`, which keeps its 3-second safety timeout and is still available for callers that can tolerate resolving early. Modules whose next action is visible to the user (revealing content, starting an animation) should use `waitForLoaderGone` so they never run behind a still-visible loader on slow connections.

## [1.1.0] - 2026-11-12

Module placement moves to data. A deployment can now specify where each module's element is inserted without editing code.

### Added

- `data/modules.json` accepts two entry forms, mixed freely:
  
  - **Strings** - `["card", "module-a"]`. Mount defaults: target `'#module'`, position `'first'`.
  - **Objects** - `[{ "name": "card", "target": "#module", "position": "first" }]`. Explicit mount config per module.

- `js/modules/index.js` attaches a `mount: { target, position }` object to each loaded module descriptor, based on the manifest entry.

- `manifest.init(moduleData, mount)` - second argument carries the resolved mount config. Optional; modules that ignore it continue to work unchanged.

### Changed

- `app.js` passes `mod.mount` as the second argument to `mod.init()`.

- `index.php` normalization accepts both string and object entries. PHP only needs the `name` field for preloads, CSS injection, and data inlining; target/position flow through the inlined `<script id="data-modules">` to JS.

- Card `manifest.js` accepts `mount` and applies `target` / `position` overrides.

- Card `VERSION` bumped to `1.1.0`.

- Card `REQUIRES_CORE` bumped to `1.1.0`. Card v1.1.0 uses the new mount contract from base v1.1.0 - without it, the object-form entries in data/modules.json would be silently filtered, and card would not load at all. Requiring base v1.1.0 makes the failure loud (`assertRequirements` throws) instead of silent.

- `CORE_VERSION` bumped to `1.1.0`.

- `data/modules.json` sample updated to show the object form.

### Notes

- Backward compatible: existing `{"modules": ["card"]}` string deployments work without changes.

- Missing `target` -> `'#module'`. Missing `position` -> `'first'`.

- `index.php` static shell unchanged: page meta, SITE_CONFIG, and inline CSS tokens stay hardcoded. Only the module normalization block changes; everything else in `index.php` is byte-identical.

- Modules that do not need mount support continue to work without any update - `init(moduleData, mount = {})` is backward compatible.

## [1.0.0] - 2026-11-11

First public release.

### Core

- Panel - reusable frame with optional header and Window wrapper.
- Window - drag, resize, minimize, maximize, close, position persistence.
- Taskbar - window buttons driven by the Events bus.
- Events - pub/sub bus with unsubscribe closures.
- Theme - site + panel theme state and selector widget with portal positioning.
- ErrorDialog - panel / overlay / custom renderers, URL error routing.
- Api - fetch wrapper with CSRF headers, 15s timeout, structured ApiError.
- Sanitize - allow-list HTML sanitizer with protocol filtering.
- Utils - dates, strings, DOM, loading, versioning, seeded random.
- Version registry - `registerCore`, `registerModule`, `assertRequirements`, `getLoadedModules`.

### Module system

- `js/modules/index.js` - dynamic loader. Reads `data/modules.json`, imports each active module's `manifest.js`, exports `MODULE_LIST`.
- `data/modules.json` - controls which modules load at boot. Default: `{"modules": ["card"]}`.
- `index.php` auto-injects module CSS, modulepreload, and module data inlining based on `data/modules.json`.

### Modules

- Card - headerless panel driven by `/data/card.json`.

### Boot

- Loader with pixel wave animation.
- Theme bootstrap (no FOUC).
- Taskbar and theme selector mount.
- Site data bindings for header and footer.
- URL error routing: `?error=NNN` -> ErrorDialog panel, then URL strip.
- No-JS fallback card.
- Fallback error overlay when `js/app.js` fails to load.

### Configuration

- `setup.sh` - first-run helper: PHP 8.4.27+ hard check, nginx 1.26.3+ soft check, placeholder substitution, `media/` creation.
- `data/site.json` - brand, tagline, footer, copyright, powered-by with `Your*` placeholders.
- `data/card.json` - card heading and body with `Your*` placeholders.

### Deployment

- `nginx.example.conf` - minimal reference config.
- `.gitignore`, `.gitattributes`, `.editorconfig` - git and editor defaults.
- `robots.txt` (staging: `Disallow: /`), `sitemap.xml`, `site.webmanifest` with `Your*` placeholders.

### Documentation

- `GUIDE.md` - full architectural and reference guide.
- `README.md` - repo landing page.
- `CHANGELOG.md` - this file.

### Conventions

- File headers use description prose plus `@copyright` and `@author` lines. The previous `@templateName` / `@templateVersion` / `@owner` markers were removed so file headers stay focused on authorship and licensing.
- `@copyright` is fixed across every file: `Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.` Never changes, even after modification.
- `@author` names the file's author. Template files ship with `Antranik Agopian <hello@antranik.dev>`. New files carry the contributor's name.
- Files modified after shipping keep the original `@copyright` and `@author` lines, and gain a `@modified-by` line per modifier.
- Attribution tier (see LICENSE, Attribution, and GUIDE.md, Comments): `Powered by Antranik.dev` for unmodified deployments, `Extends Antranik.dev` once any shipped code file carries a `@modified-by` line.

### Notes

- Ships Card only. Additional modules register in `data/modules.json`.
- Zero build step. ES modules and CSS load directly.
- No path routing. Add your own resolver if you need deep-linking.
- No server-side API. `core/api.js` is ready for your own `/api/*` endpoints.

[1.3.0]: ../../compare/v1.2.2...v1.3.0

[1.2.2]: ../../compare/v1.2.1...v1.2.2

[1.2.1]: ../../compare/v1.2.0...v1.2.1

[1.2.0]: ../../compare/v1.1.0...v1.2.0

[1.1.0]: ../../compare/v1.0.0...v1.1.0

[1.0.0]: ../../releases/tag/v1.0.0