/**
 * Allow-list HTML sanitizer for content rendered from the backend.
 * Parses HTML with DOMParser (scripts are inert), walks every node,
 * unwraps disallowed tags, strips disallowed attributes, and forces
 * safe defaults on links. Returns a clean HTML string.
 *
 * Rules shape:
 *   {
 *     allowedTags: string[],
 *     allowedAttrs: { [tag]: string[] },
 *     allowedProtocols: string[]
 *   }
 *
 * Priority for callers: caller-supplied rules > JSON rules > defaults
 * (this file). DEFAULT_RULES is deliberately conservative - paragraphs,
 * headings, lists, emphasis, links, code blocks. No divs, no spans, no
 * styles, no scripts, no iframes, no forms.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* CONSTANTS */

export const DEFAULT_RULES = {
    allowedTags: [
        'p', 'br', 'hr',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li',
        'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins',
        'a',
        'code', 'pre',
        'blockquote'
    ],
    allowedAttrs: {
        a: ['href', 'title']
    },
    allowedProtocols: ['http', 'https', 'mailto']
};

/* Dangerous URL schemes always stripped, even if a caller whitelists them
   by accident. */
const FORBIDDEN_PROTOCOLS = new Set(['javascript', 'data', 'vbscript', 'file']);

/* PUBLIC API */

/**
 * Sanitize untrusted HTML against the given (or default) allow-list.
 *
 * @param {string} html - The raw HTML to clean.
 * @param {Object} [rules] - Optional overrides for DEFAULT_RULES.
 * @returns {string} - Safe HTML string.
 */
export function sanitizeHTML(html, rules = {}) {
    if (typeof html !== 'string' || !html.trim()) return '';

    const merged = {
        allowedTags: rules.allowedTags ?? DEFAULT_RULES.allowedTags,
        allowedAttrs: rules.allowedAttrs ?? DEFAULT_RULES.allowedAttrs,
        allowedProtocols: rules.allowedProtocols ?? DEFAULT_RULES.allowedProtocols
    };
    const allowedTags = new Set(merged.allowedTags.map(t => t.toLowerCase()));
    const allowedProtocols = new Set(merged.allowedProtocols.map(p => p.toLowerCase()));

    /* DOMParser with text/html parses without executing scripts. All
       scripts/styles/iframes are inert nodes we can strip. */
    const doc = new DOMParser().parseFromString(
        `<div id="__sanitize_root">${html}</div>`,
        'text/html'
    );
    const root = doc.getElementById('__sanitize_root');
    if (!root) return '';

    /* Post-order walk: children first, then process the node itself. This
       way unwrapping a disallowed parent never loses already-sanitized
       children. */
    function walk(node) {
        for (const child of Array.from(node.childNodes)) {
            walk(child);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        /* Unwrap disallowed tags - move children up, remove the node. */
        if (!allowedTags.has(tag)) {
            const parent = node.parentNode;
            if (parent) {
                while (node.firstChild) {
                    parent.insertBefore(node.firstChild, node);
                }
                parent.removeChild(node);
            }
            return;
        }

        /* Strip disallowed attributes. */
        const allowed = (merged.allowedAttrs[tag] || []).map(a => a.toLowerCase());
        for (const attr of Array.from(node.attributes)) {
            const name = attr.name.toLowerCase();
            if (!allowed.includes(name)) {
                node.removeAttribute(attr.name);
                continue;
            }
            /* URL protocol check for href. */
            if (name === 'href') {
                const value = String(attr.value || '').trim().toLowerCase();
                /* Anchors and relative paths always allowed. */
                if (value.startsWith('#') || value.startsWith('/') ||
                    value.startsWith('./') || value.startsWith('../')) {
                    continue;
                }
                const colonIdx = value.indexOf(':');
                if (colonIdx !== -1) {
                    const proto = value.slice(0, colonIdx);
                    if (FORBIDDEN_PROTOCOLS.has(proto) || !allowedProtocols.has(proto)) {
                        node.removeAttribute(attr.name);
                    }
                }
            }
        }

        /* Force safe defaults on links. */
        if (tag === 'a') {
            node.setAttribute('rel', 'noopener noreferrer');
            node.setAttribute('target', '_blank');
        }
    }

    /* Walk root's CHILDREN, not root itself. Root is the wrapper
       <div id="__sanitize_root"> we injected to give the parser a
       single container; it is not content and must not go through
       the unwrap path. Walking root itself would treat the wrapper
       as a disallowed `div` and unwrap it - moving every child out
       of root and leaving root.innerHTML === '' on return. This was
       the bug that made every sanitizeHTML() call return an empty
       string. Walking root's children preserves the wrapper and
       returns the cleaned HTML. */
    for (const child of Array.from(root.childNodes)) {
        walk(child);
    }
    return root.innerHTML;
}