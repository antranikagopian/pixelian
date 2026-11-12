# Pixelian

> Last updated: `20261112`
> Version: `1.1.0`
> Author: Antranik Agopian <hello@antranik.dev>
> License: Antranik License 1.0 (see [LICENSE](LICENSE))

Frontend foundation for PHP projects. Core primitives, a dynamic module system, and the Card module. Static JS + CSS with no build step, served by a minimal PHP entry point.

Full reference: [GUIDE.md](GUIDE.md).

## What ships

- **Core** - Panel, Window, Taskbar, Events, Theme, ErrorDialog, Api, Sanitize, and pure helpers.
- **Card** - Headerless panel module driven by `/data/card.json`.
- **Module system** - `data/modules.json` picks which modules load and where each mounts. `js/modules/index.js` dynamically imports each active module's `manifest.js` and passes the resolved mount config as `init(moduleData, mount)`.
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

## Contributing

Every `.js`, `.css`, `.php`, and `.sh` file carries a header:

```js
/**
 * One-sentence description.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Your Name <you@example.com>
 */
```

New files use your name in `@author`. Modified files keep the original `@copyright` and `@author` lines unchanged, and add:

```bash
@modified-by Your Name <you@example.com> on YYYY-MM-DD
```

`@copyright` never changes - Antranik owns the template code even after you modify it. See [GUIDE.md](GUIDE.md). Comments, for the full policy.

## Attribution

Ship with `Powered by Antranik.dev` in the footer if you use Pixelian as-is. If you edit any shipped code file, we recommend `Extends Antranik.dev` instead - it signals the modification clearly. The `data/site.json` default satisfies the unmodified case. See [LICENSE](LICENSE) §2.d for the underlying requirement.

## Before going live

Copy `nginx.example.conf` to `/etc/nginx/sites-available/` and edit paths. Delete non-runtime files from the docroot after deploy.

See [GUIDE.md](GUIDE.md), Deployment, for the full deploy checklist and PRODUCTION CLEANUP list.
