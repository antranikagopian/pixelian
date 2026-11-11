# Pixelian

> Last updated: `20261111`
> Version: `1.0.0`
> Author: Antranik Agopian <hello@antranik.dev>
> License: Antranik License 1.0 (see [LICENSE](LICENSE))

Frontend foundation for PHP projects. Core primitives, a dynamic module system, and the Card module. Static JS + CSS with no build step, served by a minimal PHP entry point.

Full reference: [GUIDE.md](GUIDE.md).

## What ships

- **Core** - Panel, Window, Taskbar, Events, Theme, ErrorDialog, Api, Sanitize, and pure helpers.
- **Card** - Headerless panel module driven by `/data/card.json`.
- **Module system** - `data/modules.json` picks which modules load. `js/modules/index.js` dynamically imports each active module's `manifest.js`. Add or remove modules by editing one JSON file.
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

`@copyright` never changes - Antranik owns the template code even after you modify it. See [GUIDE.md](GUIDE.md) §3.3 for the full policy.

## Attribution

Ship with `Powered by Antranik.dev` in the footer if you use Pixelian as-is. If you edit any shipped code file, we recommend `Extends Antranik.dev` instead - it signals the modification clearly. The `data/site.json` default satisfies the unmodified case. See [LICENSE](LICENSE) §2.d for the underlying requirement.

## Before going live

Copy `nginx.example.conf` to `/etc/nginx/sites-available/` and edit paths. Delete non-runtime files from the docroot after deploy.

See [GUIDE.md](GUIDE.md) section 9 for the full deploy checklist and PRODUCTION CLEANUP list.
