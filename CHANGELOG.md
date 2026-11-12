# Changelog

> Last updated: `20261112`
> Version: `1.1.0`

All notable changes to Pixelian are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.1.0]: ../../releases/tag/v1.1.0

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

[1.0.0]: ../../releases/tag/v1.0.0