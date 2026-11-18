# Modules

[..GUIDE](../GUIDE.md)

Modules add project-specific functionality without changing the core. Pixelian includes Card, a headerless panel driven by `data/card.json`.

## Enable a module

Edit `data/modules.json` to enable modules and configure where they appear:

```json
{
    "modules": [
        { "name": "card", "target": "#module" },
        { "name": "news", "target": "#module", "position": "last" }
    ] 
}
```

- `name` - Module name, corresponding to its directory under `js/modules/`.
- `target` - CSS selector of the HTML element where the module mounts. For example, `#module` refers to `id="module"` in `index.php`.
- `position` - Placement within the target element: `"first"` or `"last"`.

Both `target` and `position` are optional, defaulting to `"#module"` and `"first"`, respectively. Modules can also be listed as strings, such as `"card"`, to use these defaults.

The `"news"` module is an example and must be implemented before use. Set `"modules": []` to disable all optional modules.

## File structure

```text
js/modules/
  index.js             # Module loader
  news/
    config.js          # Version and requirements
    manifest.js        # Module definition
    main.js            # Implementation
    icons.js           # Optional module icons
css/news.css           # Optional styles
data/news.json          # Optional content
```

Each active module needs a `manifest.js` exporting `name`, `config`, and `init`. Its `config.js` declares `VERSION` and, when needed, `REQUIRES_CORE`, `REQUIRES_PRIMITIVES`, `REQUIRES_DATA`, and `DEPENDENCIES`.

## Create a module

1. Create `js/modules/news/config.js` with the module version and any requirements.
2. Implement and export `initNews()` from `js/modules/news/main.js`.
3. Add `js/modules/news/manifest.js` to connect the module to the loader.
4. Add optional data, CSS, and icon files.
5. Enable the module in `data/modules.json`.

Example `manifest.js`:

```js
import * as config from './config.js';
import { initNews } from './main.js';

export default {
    name: 'news',
    config,
    init: async (moduleData, mount = {}) => {
        await initNews({
            target: mount.target || '#module',
            position: mount.position || 'first',
            data: moduleData?.['/data/news.json']
        });
    }
};
```

This is a manifest example, not a complete module. Implement `initNews()` and its configuration separately.

## How modules load

`js/modules/index.js` resolves the enabled manifests. `app.js` registers module versions, loads declared data, checks requirements, and calls `init(moduleData, mount)` for each module. Initialization runs in parallel, and the console reports the results.

`index.php` automatically embeds available module data, includes `css/{name}.css` when present, and preloads available manifest and main files. Modules can load additional styles with `loadCSS()`.

Missing JSON data produces a warning rather than automatically failing initialization; modules should handle absent data. Missing or broken JavaScript imports can prevent startup, while unmet requirements can fail individual modules.

## Disable or remove a module

Remove its entry from `data/modules.json`. 

To disable every module:

```json
{ "modules": [] }
```

The core remains available without optional modules. See [Core API](core-api.md) for reusable components and [Configuration](configuration.md) for project settings.
