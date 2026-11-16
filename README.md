# Pixelian

> Last updated: `20261116`
> 
> Version: `1.3.0`
> 
> Author: Antranik Agopian <hello@antranik.dev>
> 
> License: see [LICENSE](LICENSE)

**Pixelian** (Pixel + Armenian suffix *-ian*, "family of Pixels"). Source-available frontend template for PHP projects by [Antranik Agopian](https://antranik.dev). Free to use for personal and commercial projects under the [Pixelian License](LICENSE). Build modules, extend the core, join the family.

Full reference: [GUIDE.md](GUIDE.md).

## What ships

- **Core** - Panel, Window, Taskbar, Events, Theme, ErrorDialog, Api, Sanitize, and pure helpers.
- **Module system** - `data/modules.json` picks which modules load and where each mounts. `js/modules/index.js` dynamically imports each active module's `manifest.js` and passes the resolved mount config as `init(moduleData, mount)`.
- **Card** - Headerless panel module driven by `/data/card.json`. Ships as the default module.
- **Pixel pattern** - `data/site.json -> pixelPattern` is the single source for the site loader, brand underline, error overlay, no-JS fallback, and any module that renders the pattern. Column count auto-computes; `pixelCols` overrides when the pattern length has no clean layout.
- **Boot** - Loader, theme bootstrap, taskbar, site data bindings, URL error routing, no-JS fallback.

## Requirements

- PHP 8.4.27+
- nginx 1.26.3+ (production; local dev works with `php -S`)

## Quick start

```bash
./setup.sh
php -S localhost:8000
```

`setup.sh` prompts for project details, fills the `Your*` placeholders, and creates `media/`. Idempotent - safe to re-run.

Open [http://localhost:8000](http://localhost:8000).

## Module placement

Modules declare where they mount in `data/modules.json`:

```bash
{
    "modules": [
        { "name": "card", "target": "#module", "position": "first" }
    ]
}
```

Two entry forms work, mixed freely:

- **Strings** - `["card", "module-a"]` uses default mount (`target: '#module'`, `position: 'first'`).

- **Objects** - `{ "name": "card", "target": "#hero", "position": "last" }` overrides per module.

Both fields are optional. Missing `target` defaults to `'#module'`; missing `position` defaults to `'first'`. Existing `["card"]` deployments continue to work unchanged.

## Configuration

`data/site.json` carries a `schemaVersion` field. Pixelian v1.3.0 expects `schemaVersion: 1`. If your file is missing the field, the page fails loudly with migration steps instead of rendering a broken footer.

```json
{
    "schemaVersion": 1,
    "pixelPattern": [1,1,1,1,1,1,1],
    "title": "YourProject",
    "tagline": "YourTagline",
    "showBrand": true,
    "showTagline": true,
    "copyright": "© {year} YourCopyright",
    "attribution": "Powered by <a href=\"https://pixelian.dev\" target=\"_blank\" rel=\"noopener\">Pixelian.dev</a>",
    "showAttribution": true
}
```

Every field is documented in GUIDE.md.

## Attribution

Pixelian is source-available under the Pixelian License. Two runtime attribution tiers:

| Tier       | When                         | Footer text               |
| ---------- | ---------------------------- | ------------------------- |
| Unmodified | No shipped code file edited  | `Powered by Pixelian.dev` |
| Modified   | Any shipped code file edited | `Extends Pixelian.dev`    |

Set the string in `data/site.json -> attribution`. The default satisfies the unmodified case. See [LICENSE](LICENSE) section 2.d for the full requirements.

Projects authored or directly supervised by Antranik Agopian may use `Powered by Antranik.dev`. Third parties may not.

## Contributing

Every `.js`, `.css`, `.php`, and `.sh` file carries a header:

```js
/**
 * One-sentence description.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Your Name <you@example.com>
 */
```

New files use your name in `@author`. Modified files keep the original `@copyright`, `@license`, and `@author` lines unchanged, and add:

```bash
@modified-by Your Name <you@example.com> on YYYY-MM-DD
```

`@copyright` never changes - Antranik owns the template code even after you modify it. See [GUIDE.md](GUIDE.md). Comments, for the full policy.

## Before going live

Copy `nginx.example.conf` to `/etc/nginx/sites-available/` and edit paths. Delete non-runtime files from the docroot after deploy.

See [GUIDE.md](GUIDE.md), Deployment, for the full deploy checklist and PRODUCTION CLEANUP list.
