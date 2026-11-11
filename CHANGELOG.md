# Changelog

> Last updated: `20261111`
> Version: `1.0.0`

All notable changes to Pixelian are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Attribution tier (`LICENSE` §2.d): `Powered by Antranik.dev` for unmodified deployments, `Extends Antranik.dev` once any shipped code file carries a `@modified-by` line.

### Notes

- Ships Card only. Additional modules register in `data/modules.json`.
- Zero build step. ES modules and CSS load directly.
- No path routing. Add your own resolver if you need deep-linking.
- No server-side API. `core/api.js` is ready for your own `/api/*` endpoints.

[1.0.0]: ../../releases/tag/v1.0.0