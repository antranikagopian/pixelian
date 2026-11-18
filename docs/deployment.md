# Deployment

[..GUIDE](../GUIDE.md)

Pixelian uses `index.php` for its HTML shell and `nginx.example.conf` as a reference for production deployment with PHP-FPM. See the [README](../README.md) for server requirements.

## Prepare

1. Run `./setup.sh` to configure your project. Review the generated site data and page metadata.
2. Verify enabled modules, pixel patterns, branding, icons, media, and attribution.
3. Configure HTTPS, your document root, and PHP-FPM.
4. Copy `nginx.example.conf` outside the public document root and adapt it for your server.
5. Test the nginx configuration before reloading it:

```bash
nginx -t
```

## Optional production cleanup

`setup.sh` offers an optional cleanup review after project setup. You can run it again to access cleanup without repeating the project prompts if the placeholders have already been replaced.

**Only use cleanup in a separate deployment copy.** Keep documentation and Git history in your development repository. Before reviewing cleanup choices, the script requires you to type `DEPLOY`. Every removal is optional and requires its own confirmation; the default answer is No.

| Step                            | Optional removal                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Markdown documentation       | Root `*.md` files and `*.md` files inside `docs/`. Empty directories under `docs/` are removed after approved cleanup.                |
| 2. Git and editor configuration | `.gitignore`, `.gitattributes`, `.gitmodules`, `.editorconfig`, `.github/`, `.vscode/`, `.idea/`, and `media/.gitkeep`, when present. |
| 3. Example nginx configuration  | `nginx.example.conf`, after you have copied and configured it outside the document root.                                              |
| 4. Git history                  | `.git/`. Requires a separate confirmation and the exact text `DELETE GIT`.                                                            |
| 5. Setup script                 | `setup.sh`. Offered last, after the other cleanup choices.                                                                            |

The script does not remove files solely based on their extensions. Keep `LICENSE` and all runtime files, including `index.php`, `css/`, `js/`, `data/`, `icons/`, `media/`, `robots.txt`, `sitemap.xml`, and `site.webmanifest`. Non-Markdown assets in `docs/`, if any, are left untouched.

If you skip cleanup, remove non-runtime files from the public document root through your deployment process and use server deny rules as an additional safeguard. The cleanup prompts do not confirm that a directory is actually a separate deployment copy, so verify its location before approving removal.

## Server behavior

- Execute `index.php` through PHP-FPM and serve the required frontend assets.
- Route HTML navigation errors through `/?error=<code>` so Pixelian can display `ErrorDialog`.
- Return API errors with their actual HTTP status and response, without redirecting to the HTML error page.
- Restrict public access to dotfiles, setup scripts, configuration files, and development documentation.
- Keep secrets out of publicly accessible or page-embedded JSON data.

Pixelian does not implement authentication, backend API endpoints, or application-specific path routing.

## Before launch

- Confirm the homepage, loader, themes, branding, and enabled modules work over HTTPS.
- Check that the required JavaScript, CSS, and JSON files load successfully.
- Verify navigation error handling and confirm API failures are not redirected.
- Test the no-JavaScript fallback, keyboard navigation, and reduced-motion preferences.
- Confirm that development files and Git metadata are not publicly accessible, regardless of whether cleanup was selected.

For common issues, see [Troubleshooting](../GUIDE.md#troubleshooting). For implementation safeguards, see [Security & Accessibility](security-accessibility.md).
