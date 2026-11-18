# Security & Accessibility

[..GUIDE](../GUIDE.md)

Pixelian provides frontend safeguards and accessibility foundations. Each project remains responsible for its backend, content, and user interactions. For reporting vulnerabilities in Pixelian itself, see the [SECURITY policy](../SECURITY.md).

## Safe content handling

- Use `textContent` for plain text.
- Run untrusted HTML through `sanitizeHTML()` before inserting it with `innerHTML`.
- Validate input on the backend. Browser-side sanitization is defense in depth, not a replacement.
- Validate link and redirect URLs separately; HTML sanitization does not protect direct `href` assignments.
- Use only trusted content for the HTML-capable `copyright` and `attribution` fields in `data/site.json`.

## API and CSRF

Use `js/core/api.js` for API requests. It uses same-origin credentials and sends CSRF headers when a token is available from the `csrf-token` meta tag or `XSRF-TOKEN` cookie.

The backend must issue and validate CSRF tokens for state-changing requests, enforce authentication and authorization when needed, and return appropriate HTTP statuses. Pixelian does not include an authentication system or backend API endpoints.

## Error handling

| Request type    | Behavior                                                                           |
| --------------- | ---------------------------------------------------------------------------------- |
| HTML navigation | nginx can redirect an error to `/?error=<code>` for display in `ErrorDialog`.      |
| API request     | Return the actual HTTP status and response; the calling module handles `ApiError`. |

Do not redirect API failures into the HTML error route. See [Deployment](deployment.md).

## Accessibility

Pixelian includes visible focus styles, reduced-motion support, accessible labels and ARIA states, focus movement into error dialogs, and a no-JavaScript fallback. These provide a foundation for WCAG 2.2 Level AA work, not a conformance claim.

Check every custom module for:

- Keyboard access and visible focus.
- Accessible names for controls and appropriate treatment of decorative icons.
- Correct focus behavior in dialogs.
- Meaningful headings, alternative text, form labels, and error messages.
- Adequate contrast and support for `prefers-reduced-motion`.
- Appropriate announcements for dynamic content.

Test with a keyboard, a screen reader, and accessibility tools. Automated checks alone are not sufficient.

## Browser storage

Theme preferences and window geometry use `localStorage`. Do not store secrets or sensitive application data there.

To reset one window's saved geometry, replace `YOUR_ID` with its window ID:

```js
localStorage.removeItem('panel:YOUR_ID:state');
location.reload();
```
