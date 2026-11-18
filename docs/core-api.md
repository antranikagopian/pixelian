# Core API

[..GUIDE](../GUIDE.md)

The core lives in `js/core/` and supplies reusable components, services, and helpers. For exact method signatures and options, consult the JSDoc in each source file.

## Components and services

| File                  | Purpose                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `panel.js`            | `Panel` for reusable panel layouts.                                    |
| `window.js`           | `Window` for dragging, resizing, controls, and saved geometry.         |
| `taskbar.js`          | `TaskbarManager` for window buttons and widget placement.              |
| `theme.js`            | `ThemeManager` and `ThemeSelector` for theme preferences and controls. |
| `error.js`            | `ErrorDialog` and navigation error handling.                           |
| `events.js`           | `EVENTS` publish/subscribe bus.                                        |
| `api.js`              | API request helpers and `ApiError`.                                    |
| `sanitize.js`         | `sanitizeHTML()` for allow-listed HTML.                                |
| `data.js`             | `readInlineData()` for JSON embedded by PHP.                           |
| `utils.js`            | Pixel patterns, dates, strings, DOM, and loading helpers.              |
| `icons.js`            | Core icon definitions.                                                 |
| `config.js`           | Core version and configuration schema constants.                       |
| `version-registry.js` | Registration, requirement checks, and module inspection.               |

## Panels, windows, and themes

`Panel` provides a consistent UI frame. `Window` adds draggable and resizable behavior, window controls, and position persistence. The taskbar follows window state and exposes a `widgetSlot` for controls such as `ThemeSelector`.

Window geometry is stored in `localStorage` under `panel:{id}:state`. Site and panel theme preferences use `siteTheme` and `panelTheme`. `ThemeSelector.destroy()` supports cleanup when a selector is removed.

## Events

Use `EVENTS.on()`, `EVENTS.off()`, and `EVENTS.emit()` to communicate between components. Window lifecycle events include `window:opened`, `window:minimized`, `window:restored`, `window:closed`, and `window:focused`.

## API and HTML

`api.js` provides `apiGet()`, `apiPost()`, `apiPut()`, `apiPatch()`, and `apiDelete()`. Requests use same-origin credentials, JSON-oriented headers, optional CSRF headers, and a timeout. Errors are surfaced as `ApiError` for the calling module to handle.

Use `sanitizeHTML()` before inserting untrusted HTML with `innerHTML`. Prefer `textContent` for plain text and validate URLs separately. See [Security & Accessibility](security-accessibility.md).

## Site data and patterns

`index.php` embeds site and active-module JSON in the page. `readInlineData()` reads embedded values; data helpers can fetch files when needed. `resolveSitePixelPattern()` and `computePixelLayout()` in `utils.js` support named pixel patterns and layout calculations.

## Inspect loaded modules

`app.js` prints a core and module summary at startup. Run this in the browser console to inspect the registry again:

```js
window.getLoadedModules({ logToConsole: true });
```

See [Modules](modules.md) for module initialization and dependencies.
