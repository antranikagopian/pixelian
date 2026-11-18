# Configuration

[..GUIDE](../GUIDE.md)

Pixelian uses `data/` for project settings and `index.php` for page metadata and bootstrap options.

## Site configuration

Edit `data/site.json` to set your branding, footer, and pixel patterns. The application requires `schemaVersion: 2`. A missing or incompatible schema version stops startup and displays a configuration error.

```json
{
    "schemaVersion": 2,
    "pixelPatterns": {
        "default": [1,1,1,1,1,1,1],
        "error": [1,0,1,0,1,0,1,0,1]
    },
    "title": "YourProject",
    "tagline": "YourTagline",
    "showBrand": true,
    "showTagline": true,
    "copyright": "© {year} YourCopyright",
    "attribution": "Powered by <a href=\"https://pixelian.dev\" target=\"_blank\" rel=\"noopener\">Pixelian.dev</a>",
    "showAttribution": true
}
```

| Field                            | Purpose                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `schemaVersion`                  | Configuration schema required by Pixelian.                                                |
| `pixelPatterns`                  | Named pixel patterns for the loader, branding, error display, and no-JavaScript fallback. |
| `title`, `tagline`               | Header text.                                                                              |
| `showBrand`, `showTagline`       | Header visibility.                                                                        |
| `copyright`                      | Footer text; `{year}` is replaced with the current year.                                  |
| `attribution`, `showAttribution` | Footer attribution and visibility, subject to the [LICENSE](../LICENSE).                  |

`title` and `tagline` are rendered as text. `copyright` and `attribution` are rendered as HTML, so use only trusted content.

## Pixel patterns

Each name in `pixelPatterns` accepts either a flat array or an object with a `pattern` array and an optional `cols` override:

```json
{
    "pixelPatterns": {
        "default": [
            0,0,0,1,0,0,0,
            0,0,1,0,1,0,0,
            0,1,0,0,0,1,0,
            1,0,0,0,0,0,1
        ],
        "error": { "pattern": [1, 0, 1, 0, 1, 0], "cols": 3 }
    }
}
```

- `0` represents an empty pixel; `1` represents a filled pixel.
- Columns and rows are calculated automatically unless `cols` is provided.
- `default` supplies the main pattern. Contexts such as `error` may override it where supported.

`index.php` normalizes valid patterns and uses a built-in seven-pixel fallback if `default` is unavailable. This keeps the loader and fallback UI renderable, but it does not replace a valid project configuration. Modules can read `window.__SITE_DATA__` and use `resolveSitePixelPattern()` from `js/core/utils.js`.



For module configuration and placement, see [Modules](modules.md).
