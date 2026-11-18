# Changelog

All notable changes to Pixelian are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0).
Releases follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-11-18

### Added

- Support for named pixel patterns with configurable layouts and optional contexts.
- Server-side pixel pattern normalization, validation, and fallback handling.
- HTTP `413` and `429` error messages.
- Reusable dashed labels and `ThemeSelector.destroy()` for listener cleanup.
- Accessibility improvements for keyboard focus, screen readers, dialogs, and reduced motion.

### Changed

- **Breaking:** Upgrade site data schema to `2`, replacing `pixelPattern` and `pixelCols` with `pixelPatterns` in configuration and JavaScript APIs.
- Update pixel pattern fallbacks to support the new schema.
- Move error overlay and no-JavaScript labels between the canvas and message.
- Improve focus indicators with full-opacity theme accents and 3:1 contrast.
- Restructure documentation into a `GUIDE.md` index and focused `docs/` files.
- Simplify `README.md` and update supported versions in `SECURITY.md`.
- Update Pixelian License to `1.1` to reflect the removal of third-party dependencies and revised documentation references, without changing licensing terms.
- Clarify configuration and API error documentation.
- Replace the Font Awesome CDN dependency with locally defined icons in `js/core/icons.js` and module-specific `icons.js` files.

### Fixed

- Schema migration dialog displaying incorrect content.
- Error overlay failing to render when CSS loading fails.
- URL-triggered errors being masked by application initialization failures.
- Error dialog ID collisions affecting localStorage.
- Version detection failing with double-quoted values.
- Inline JSON escaping allowing premature script termination.
- Incorrect pixel pattern gating and inconsistent layout calculations between PHP and JavaScript.
- Unhandled PHP file reading failures.
- Duplicate module names and reserved name conflicts.
- Incorrect loader delay units.
- CSRF cookie truncation and incomplete CSRF request headers.
- HTML response detection missing proxy-generated fragments.
- HTML sanitization allowing unsafe image source protocols.
- Incorrect text truncation, message formatting, and URL normalization.
- Panel icon updates and window mounting issues.
- Window resize-handle cleanup and invalid saved state restoration.
- Minimized windows incorrectly reporting as visible.
- Hidden windows losing their positions during viewport resizing.
- Ineffective theme manager listeners and incomplete theme selector cleanup, including orphaned portals.
- Outdated license attribution in `css/card.css`.
- Missing event import causing window title updates to fail.

## [1.3.0] - 2026-11-16

### Added

- Site data schema validation with required `schemaVersion: 1`.
- Independent `CORE_SITE_DATA_SCHEMA` versioning for configuration changes.
- Automatic core version detection for generator metadata.
- `SECURITY.md` with vulnerability reporting and supported versions.
- Optional `pixelCols` override for custom pixel layouts.
- Configurable underline dash variables for responsive pixel patterns.

### Changed

- Rename Antranik License to Pixelian License `1.0`.
- Update attribution to `Powered by Pixelian.dev` or `Extends Pixelian.dev`, depending on modifications.
- **Breaking:** Rename `poweredBy` and `showPoweredBy` to `attribution` and `showAttribution`.
- Rename `.powered-by` to `.legal-attribution`.
- **Breaking:** Consolidate pixel configuration into `pixelPattern` and `pixelCols`, replacing `errorPixelPattern` and `errorPixelCols`.
- Derive error overlay, no-JavaScript fallback, underline, and loader patterns from site configuration.
- Add automatic pixel layout calculation with optional column overrides in PHP and JavaScript.
- Derive loader pixel count from the configured pattern, with a minimum of three.
- Consolidate core and module version logging into a single boot summary.
- Update fallback site data with Pixelian branding.
- Standardize file headers and rename `inline_json` to `inlineJson`.

## [1.2.2] - 2026-11-15

### Removed

- Obsolete `VERSION` export from `core/utils.js`, superseded by `CORE_VERSION`.

### Fixed

- Incorrect `CORE_VERSION` reporting `1.2.0` instead of `1.2.1`.

## [1.2.1] - 2026-11-15

### Added

- Core and module version logging during application startup.

## [1.2.0] - 2026-11-15

### Added

- `waitForLoaderGone()` utility to resolve after the loader fully fades, without a safety timeout.

## [1.1.0] - 2026-11-12

### Added

- Data-driven module placement with configurable `target` and `position`.
- Support for string and object entries in `data/modules.json`.
- Optional `mount` configuration passed to module initialization.

### Changed

- Update PHP module normalization and JavaScript loading to support placement options.
- Update Card module to support configurable mounting.
- Upgrade Card and core versions to `1.1.0`.
- Set Card's minimum required core version to `1.1.0`.
- Preserve compatibility with existing module configurations, defaulting to `#module` and `first`.

## [1.0.0] - 2026-11-11

### Added

- Initial public release of Pixelian.
- Reusable Panel and Window components with dragging, resizing, minimization, maximization, closing, and position persistence.
- Taskbar with event-driven window controls.
- Events bus with publish/subscribe support.
- Theme management and selector with persistent site and panel preferences.
- ErrorDialog with multiple renderers and URL-based error routing.
- API utility with CSRF headers, request timeouts, and structured errors.
- HTML sanitizer with allow-list and protocol filtering.
- Core utilities for dates, strings, DOM, loading, versioning, and seeded randomness.
- Core and module version registry with dependency validation.
- Dynamic module loading and configuration through `data/modules.json`.
- Automatic module CSS, preload, and data injection through PHP.
- Card module with configurable content from `data/card.json`.
- Animated pixel loader and theme initialization without flashing.
- No-JavaScript fallback card and JavaScript failure error overlay.
- `setup.sh` for initial configuration and server requirement checks.
- Example nginx configuration and customizable site data.
- Repository, editor, and search engine configuration files.
- `README.md`, `GUIDE.md`, and `CHANGELOG.md`.

### Changed

- Standardize source file headers with copyright, license, and author information.
- Establish `@modified-by` attribution for changes to shipped files.
- Define `Powered by Antranik.dev` and `Extends Antranik.dev` attribution rules.

[Unreleased]: ../../compare/v2.0.0...HEAD

[2.0.0]: ../../compare/v1.3.0...v2.0.0

[1.3.0]: ../../compare/v1.2.2...v1.3.0

[1.2.2]: ../../compare/v1.2.1...v1.2.2

[1.2.1]: ../../compare/v1.2.0...v1.2.1

[1.2.0]: ../../compare/v1.1.0...v1.2.0

[1.1.0]: ../../compare/v1.0.0...v1.1.0

[1.0.0]: ../../releases/tag/v1.0.0