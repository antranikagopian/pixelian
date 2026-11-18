# Pixelian

**Pixelian** is a source-available, modular frontend template for PHP projects, created by [Antranik Agopian](https://antranik.dev). It combines reusable UI components, theme management, and a configurable module system so you can build your own experience without starting from scratch.

The name combines *pixel* with the Armenian surname suffix *-ian*, representing a "family of pixels."

## Features

- **UI components:** Panels, draggable and resizable windows, a taskbar, theme controls, and error dialogs.
- **Module system:** Enable modules and configure their placement through `data/modules.json`. The included Card module is a starting example.
- **Pixel patterns:** Define named patterns in `data/site.json` for the loader, branding, errors, and no-JavaScript fallback.
- **Core utilities:** Events, API requests, HTML sanitization, version checks, and shared helpers.
- **Accessible foundations:** Keyboard focus styling, reduced-motion support, and accessible error states.

## Requirements

- PHP `8.4.27+`
- nginx `1.26.3+` for the documented production setup; local development uses PHP's built-in server

## Quick start

```bash
./setup.sh
php -S localhost:8000
```

Open <http://localhost:8000>.

`setup.sh` fills the project's `Your*` placeholders and creates `media/`. It also offers optional cleanup for a separate deployment copy. **Do not run the cleanup in your development repository**.

Customize these files:

| File                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `data/site.json`    | Branding, footer, and pixel patterns                          |
| `data/modules.json` | Active modules and mount positions                            |
| `data/card.json`    | Content for the included Card module                          |
| `index.php`         | Page metadata, loader settings, and navigation error messages |
| `icons/`, `media/`  | Your icons and media                                          |

For detailed configuration options, see [Configuration](docs/configuration.md). To build custom modules, see [Modules](docs/modules.md).

## Scope

Pixelian is a frontend foundation, not a complete application. Authentication, backend API endpoints, and application-specific routing are left to your project.

## License

Pixelian is available for personal and commercial projects under the [Pixelian LICENSE](LICENSE). See the license for usage, modification, and attribution requirements.

## Documentation

Start with the [GUIDE](GUIDE.md) for the documentation index and architecture. For release history, see [CHANGELOG](CHANGELOG.md); for vulnerability reporting, see [SECURITY](SECURITY.md).
