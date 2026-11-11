/**
 * Reads JSON data inlined into the HTML by the server. Zero fetches.
 * The server writes each data file as:
 *   <script type="application/json" id="data-{name}">...</script>
 * readInlineData('site') returns the parsed object, or null if absent.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* PUBLIC API */

/**
 * Parse inline JSON embedded by the server as
 *   <script type="application/json" id="data-{name}">...</script>
 * Returns null if the element is missing or JSON is invalid.
 *
 * @param {string} name - Inline ID without the "data-" prefix
 *   (e.g. 'site', 'blog', 'blog-about').
 * @returns {Object|null}
 */
export function readInlineData(name) {
    const el = document.getElementById(`data-${name}`);
    if (!el) return null;
    try {
        return JSON.parse(el.textContent);
    } catch (err) {
        console.warn(`Invalid inline JSON for "${name}":`, err);
        return null;
    }
}