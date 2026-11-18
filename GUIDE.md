# Pixelian Guide

Technical documentation for Pixelian. The [README](README.md) covers the quick start; the references below explain how to configure, extend, and deploy a project.

## Documentation

| Topic                                                      | Covers                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| [Configuration](docs/configuration.md)                     | Site settings, schema, pixel patterns, and module configuration    |
| [Modules](docs/modules.md)                                 | Creating, enabling, positioning, and removing modules              |
| [Core API](docs/core-api.md)                               | UI components, services, and utilities                             |
| [Security & Accessibility](docs/security-accessibility.md) | Safe data handling, backend integration, and accessible interfaces |
| [Deployment](docs/deployment.md)                           | nginx, production checks, and document-root cleanup                |

Other references: [LICENSE](LICENSE) - [CHANGELOG](CHANGELOG.md) - [SECURITY](SECURITY.md)

## How Pixelian works

Pixelian has an always-available core and optional modules selected through `data/modules.json`. 

Card is the included example module.

```text
index.php
  ├─ reads site and module configuration
  ├─ normalizes pixel patterns and prepares fallback UI
  ├─ embeds JSON data, module styles, and preloads
  └─ renders the page and runs the initial theme/loader script
       ↓
js/modules/index.js
  └─ resolves active module manifests for js/app.js
       ↓
js/app.js
  ├─ registers core and module versions
  ├─ creates the taskbar and theme selector
  └─ initApp()
       ├─ loads site data and validates its schema
       ├─ binds header and footer content
       ├─ loads required module data and checks dependencies
       ├─ runs each module's init(moduleData, mount)
       └─ reports module results and any initialization errors
```

Module initialization runs in parallel with the site loader animation. With the loader enabled, it disappears after both initialization and animation have settled. A recognized `?error=404`-style URL skips the loader and shows the core error dialog after initialization. If JavaScript is disabled, PHP provides a no-JavaScript fallback; the inline bootstrap also provides an error overlay for application script loading failures.

## Configuration and boundaries

- `data/site.json` uses `schemaVersion: 2` and the `pixelPatterns` object. Define `default`; optional contexts such as `error` can override it. See [Configuration](docs/configuration.md).
- `data/modules.json` accepts module names or objects with `name`, `target`, and `position`. Defaults are `#module` and `first`. See [Modules](docs/modules.md).
- Missing module data files produce warnings and can be handled by module fallbacks. Missing JavaScript imports can prevent the application from starting.
- Pixelian supplies frontend components and an API client, but not authentication, backend API endpoints, or application-specific path routing.
- Exact options and method signatures are documented in the source JSDoc; [Core API](docs/core-api.md) provides an overview.

## Troubleshooting

Check your browser's **Console** and **Network** tabs first. After module initialization settles, Pixelian prints a core version line and a module status table. You can inspect the registry again with:

```js
window.getLoadedModules({ logToConsole: true });
```

| Problem                                    | Check                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Configuration error                        | `schemaVersion: 2` in `data/site.json`; see the migration message and [Configuration](docs/configuration.md) |
| Module fails to load                       | `data/modules.json`, `js/modules/{name}/manifest.js`, its imports, and declared dependencies                 |
| Module content or styles are missing       | Required JSON files, `css/{name}.css`, and the configured mount target                                       |
| Loader stays visible or a fallback appears | Failed application/module script requests and console errors                                                 |
| Window position is incorrect               | The `panel:{id}:state` entry in `localStorage`                                                               |
| Navigation errors show a server page       | HTML error routing in the [Deployment](docs/deployment.md) configuration                                     |

For vulnerabilities in Pixelian itself, follow the [SECURITY policy](SECURITY.md) rather than opening a public issue.
