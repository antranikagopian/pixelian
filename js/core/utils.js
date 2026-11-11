/**
 * Shared core utilities. Pure functions only - no module state, no DOM
 * queries for module-owned elements. Grouped by purpose: async, math,
 * strings, date/time, DOM, email, security, loading, versioning.
 *
 * Date handling: every function that accepts a date value routes
 * through parseDate() so callers can pass a Date instance, an epoch
 * number, a YYYYMMDD string, a YYYY-MM-DD string, or a full ISO 8601
 * string and get consistent behavior. YYYYMMDD is the canonical format
 * for user-provided dates in the JSON data files (see GUIDE.md §4.1
 * Dates). Full ISO 8601 is the format for API-supplied dates
 * (article.date from /api/news).
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { readInlineData } from './data.js';

/* CONSTANTS */

export const VERSION = '1.0.0';

/* SEEDED RANDOM */

/* Internal LCG state. Mutated by seededRandom(). */
let _seed = 42;

/**
 * Generates a pseudo-random number between 0 and 1 using a seeded LCG.
 * @returns {number}
 */
export function seededRandom() {
    _seed = (_seed * 9301 + 49297) % 233280;
    return _seed / 233280;
}

/**
 * Resets the internal seed to a known value.
 * @param {number} [newSeed=42]
 */
export function resetSeed(newSeed = 42) {
    _seed = newSeed;
}

/* ASYNC */

/**
 * Promise-based delay. Resolves after `ms` milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce - delays invocation until `ms` after the last call.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function} Debounced wrapper with a .cancel() method.
 */
export function debounce(fn, ms) {
    let timer = null;
    const wrapped = (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, ms);
    };
    wrapped.cancel = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };
    return wrapped;
}

/**
 * Throttle - invokes at most once per `ms` window.
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function} Throttled wrapper.
 */
export function throttle(fn, ms) {
    let last = 0;
    let timer = null;
    return (...args) => {
        const now = Date.now();
        const remaining = ms - (now - last);
        if (remaining <= 0) {
            last = now;
            fn(...args);
        } else if (!timer) {
            timer = setTimeout(() => {
                timer = null;
                last = Date.now();
                fn(...args);
            }, remaining);
        }
    };
}

/* MATH */

/**
 * Clamp a value between min and max (inclusive).
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Return a new array with the elements in random order, using the
 * Fisher-Yates shuffle. Does not mutate the input.
 *
 * Used by pixel-reveal animations (shuffled cell reveal order)
 * and available for any module that needs an unbiased random
 * permutation - animation stagger orders, feature rotation, sample
 * picking, etc.
 *
 * @template T
 * @param {T[]} arr - Source array. Not mutated.
 * @returns {T[]} A new array in random order.
 */
export function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/* STRINGS */

/**
 * Escape a string for safe interpolation into innerHTML. Uses textContent
 * so the browser handles all entity encoding.
 * @param {*} text
 * @returns {string}
 */
export function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}

/**
 * Escape a string for safe interpolation into an HTML attribute value.
 * Unlike escapeHTML (which routes through the browser's HTML serializer
 * and does NOT escape quotes), this also escapes both quote characters,
 * so the result is safe in a double-quoted OR single-quoted attribute.
 *
 * Use escapeHTML for text content, escapeAttr for attribute values.
 * @param {*} text
 * @returns {string}
 */
export function escapeAttr(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Resolve a message template by key and substitute {placeholder} tokens.
 * Falls back to a secondary templates object when the key is missing in
 * the primary source.
 * @param {Object} templates - Primary templates ({ key: 'template' }).
 * @param {string} key
 * @param {Object} [vars] - Substitution variables.
 * @param {Object} [fallback] - Fallback templates.
 * @returns {string}
 */
export function formatMessage(templates, key, vars = {}, fallback = {}) {
    const template = templates?.[key] ?? fallback?.[key] ?? '';
    return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/**
 * Truncate text to maxLength, appending suffix when truncated.
 * @param {string} text
 * @param {number} maxLength
 * @param {string} [suffix='…']
 * @returns {string}
 */
export function truncate(text, maxLength, suffix = '…') {
    const s = String(text ?? '');
    if (s.length <= maxLength) return s;
    return s.slice(0, Math.max(0, maxLength - suffix.length)) + suffix;
}

/**
 * Convert a string to a URL-safe slug.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
    return String(text ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Split text into paragraphs on double newline. Trims each paragraph and
 * drops empty ones. Returns [] for null, undefined, or empty input.
 * @param {string} text
 * @returns {string[]}
 */
export function splitParagraphs(text) {
    if (!text) return [];
    return String(text)
        .split('\n\n')
        .map(p => p.trim())
        .filter(Boolean);
}

/* DATES */

/* Full English month names, index 0 = January. */
export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Zero-pad a number to two digits.
 * @param {number} n
 * @returns {string}
 */
export function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
}

/**
 * Parse a date value into a Date. This is the ONLY accepted way to
 * turn a date value into a Date - all date formatters below route
 * through it, and command handlers that need to sort or compare dates
 * should use it too.
 *
 * Accepted input forms:
 *   Date instance    -> returned as-is (or null if the Date is invalid)
 *   number           -> milliseconds since epoch
 *   'YYYYMMDD'       -> LOCAL midnight on that date (8 chars)
 *   'YYYY-MM-DD'     -> LOCAL midnight on that date (10 chars, dashed)
 *   'YYYY-MM-DDThh:...' / other ISO 8601 -> delegated to `new Date()`
 *   anything else    -> delegated to `new Date()`
 *
 * Why a custom parser exists for YYYYMMDD and YYYY-MM-DD:
 *
 *   1. YYYYMMDD has NO spec-defined parsing. `new Date('20261112')`
 *      only "works" in V8 today because V8 has a permissive fallback.
 *      Firefox and Safari return Invalid Date for it. This is not
 *      guaranteed by ECMAScript and can regress at any time. The
 *      YYYYMMDD format is required for user-provided dates in the
 *      JSON data files (see GUIDE.md §4.1), so an explicit
 *      parser is mandatory.
 *
 *   2. `new Date('2026-11-12')` (dashed, no time) is defined by the
 *      ES spec as UTC midnight, NOT local midnight. In any negative-
 *      UTC timezone, that renders as the PREVIOUS day - the classic
 *      "off-by-one day" bug. This parser resolves both YYYYMMDD and
 *      YYYY-MM-DD to LOCAL midnight, which is what a user typing or
 *      reading "2026-11-12" expects.
 *
 * Full ISO 8601 strings WITH a time component (`2026-11-12T12:00:00Z`)
 * are unambiguous instants and are delegated to `new Date()` as
 * before. Only date-only strings need the local-midnight treatment.
 *
 * Rollover validation: `new Date(2026, 1, 31)` silently becomes
 * March 3. This parser compares the resulting month/day back to the
 * input and returns null for rollovers, so a typo like '20260231'
 * fails loudly (to the caller - the formatters return '') instead
 * of displaying a different date than the author wrote.
 *
 * @param {Date|string|number} value - Date, epoch ms, YYYYMMDD,
 *   YYYY-MM-DD, full ISO 8601, or anything `new Date()` accepts.
 * @returns {Date|null} Parsed Date, or null if the value is invalid.
 */
export function parseDate(value) {
    /* Date instance - return as-is if valid, else null. */
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    /* Epoch milliseconds. */
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    /* Reject non-string primitives (booleans, undefined, etc.). */
    if (typeof value !== 'string') return null;

    const s = value.trim();
    if (!s) return null;

    /* YYYYMMDD - date-only, local midnight. */
    if (/^\d{8}$/.test(s)) {
        const y = +s.slice(0, 4);
        const m = +s.slice(4, 6);
        const d = +s.slice(6, 8);
        const date = new Date(y, m - 1, d);
        /* Reject rollovers: 2026-02-31 silently becomes March 3
           without this check. */
        if (date.getFullYear() !== y ||
            date.getMonth() !== m - 1 ||
            date.getDate() !== d) {
            return null;
        }
        return date;
    }

    /* YYYY-MM-DD - date-only, local midnight. Avoids the UTC-midnight
       trap of `new Date('2026-11-12')` per ES spec. */
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y ||
            date.getMonth() !== m - 1 ||
            date.getDate() !== d) {
            return null;
        }
        return date;
    }

    /* Full ISO 8601 or anything else the engine accepts. These are
       unambiguous instants (with a time component) or formats the
       engine handles reliably, so no special-casing needed. */
    const date = new Date(s);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Combine a date value and an optional time string into a single Date.
 *
 * Uses parseDate() for the date portion (so YYYYMMDD, YYYY-MM-DD, full
 * ISO 8601, Date, and epoch ms all work) and interprets `time` as LOCAL
 * time on that date. This is the "date + time-of-day" pattern used by
 * release countdowns, where the date format is YYYYMMDD (per template
 * convention) but the hour needs to be explicit.
 *
 * `time` formats accepted:
 *   'HH:MM'      -> hh:mm:00 on that date, local
 *   'HH:MM:SS'   -> hh:mm:ss on that date, local
 *   '' / null / undefined -> date at local midnight (same as parseDate)
 *
 * Returns null when the date is invalid OR the time string is
 * malformed. Callers that want "date-only" behavior should omit `time`
 * rather than pass an empty/zero value - omitting is the explicit,
 * self-documenting form.
 *
 * @param {Date|string|number} date - Any value parseDate() accepts.
 * @param {string} [time] - 'HH:MM' or 'HH:MM:SS' in LOCAL time.
 * @returns {Date|null}
 */
export function parseDateTime(date, time) {
    const base = parseDate(date);
    if (!base) return null;

    /* No time -> date-only, local midnight. */
    if (time === undefined || time === null || time === '') {
        return base;
    }

    if (typeof time !== 'string') return null;

    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
    if (!m) return null;

    const h = +m[1];
    const min = +m[2];
    const sec = m[3] ? +m[3] : 0;

    /* Range check: reject '25:00', '12:60', '12:00:60'. */
    if (h > 23 || min > 59 || sec > 59) return null;

    return new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        h,
        min,
        sec
    );
}

/**
 * Format a date as "November 12, 2026".
 *
 * Accepts any value parseDate() handles: Date, epoch ms, YYYYMMDD,
 * YYYY-MM-DD, or full ISO 8601. Returns '' for invalid input - the
 * empty string is intentional so callers can render unconditionally
 * without null checks (the DOM simply stays empty).
 *
 * @param {Date|string|number} d
 * @returns {string}
 */
export function formatDate(d) {
    const date = parseDate(d);
    if (!date) return '';
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format a date's time as "14:00:00" (24h, local).
 *
 * For a YYYYMMDD or YYYY-MM-DD date-only input, the resulting time is
 * "00:00:00" (local midnight). Callers that display date-only values
 * should NOT call formatTime - suppress the time span entirely when
 * the input is date-only.
 *
 * @param {Date|string|number} d
 * @returns {string}
 */
export function formatTime(d) {
    const date = parseDate(d);
    if (!date) return '';
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

/**
 * Combined "November 12, 2026 at 14:00:00".
 *
 * For date-only input, the time is "00:00:00" - same caveat as
 * formatTime: prefer formatDate alone for date-only values.
 *
 * @param {Date|string|number} d
 * @returns {string}
 */
export function formatDateTime(d) {
    const date = parseDate(d);
    if (!date) return '';
    return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Format remaining milliseconds as "Xd HH:MM:SS", or "Live now" when
 * the target has passed.
 * @param {number} ms
 * @returns {string}
 */
export function formatRemaining(ms) {
    if (ms <= 0) return 'Live now';
    const totalSec = Math.floor(ms / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${days}d ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

/**
 * Relative time like "2 days ago" or "in 3 hours".
 *
 * Uses Intl.RelativeTimeFormat when available for proper pluralization
 * and locale; falls back to a plain English suffix when not. Accepts
 * any value parseDate() handles.
 *
 * @param {Date|string|number} d
 * @returns {string}
 */
export function relativeTime(d) {
    const date = parseDate(d);
    if (!date) return '';
    const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
    const abs = Math.abs(diffSec);

    const units = [
        { limit: 60, unit: 'second', secs: 1 },
        { limit: 3600, unit: 'minute', secs: 60 },
        { limit: 86400, unit: 'hour', secs: 3600 },
        { limit: 604800, unit: 'day', secs: 86400 },
        { limit: 2592000, unit: 'week', secs: 604800 },
        { limit: 31536000, unit: 'month', secs: 2592000 },
        { limit: Infinity, unit: 'year', secs: 31536000 }
    ];
    for (const u of units) {
        if (abs < u.limit) {
            const value = Math.round(diffSec / u.secs);
            if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
                return new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
                    .format(value, u.unit);
            }
            const suffix = value < 0 ? 'ago' : 'from now';
            return `${Math.abs(value)} ${u.unit}${Math.abs(value) === 1 ? '' : 's'} ${suffix}`;
        }
    }
    return '';
}

/* DOM */

/**
 * True when the element is scrolled within `threshold` px of its bottom.
 * @param {HTMLElement} el
 * @param {number} [threshold=20]
 * @returns {boolean}
 */
export function isAtBottom(el, threshold = 20) {
    if (!el) return false;
    return (el.scrollHeight - el.scrollTop - el.clientHeight) < threshold;
}

/* EMAIL */

/**
 * Mask an email for display: "user [at] domain [dot] tld".
 * @param {string} user
 * @param {string} domain
 * @returns {string}
 */
export function maskEmail(user, domain) {
    if (!user || !domain) return '';
    return `${user} [at] ${String(domain).replace(/\./g, ' [dot] ')}`;
}

/**
 * Encode an email as a base64 payload for on-click reconstruction.
 * @param {string} user
 * @param {string} domain
 * @returns {string}
 */
export function encodeEmail(user, domain) {
    return btoa(`${user}|${domain}`);
}

/**
 * Decode a base64 payload from encodeEmail().
 * @param {string} payload
 * @returns {{user:string, domain:string}|null}
 */
export function decodeEmail(payload) {
    try {
        const [user, domain] = atob(payload).split('|');
        if (!user || !domain) return null;
        return { user, domain };
    } catch {
        return null;
    }
}

/**
 * Copy text to the clipboard. Uses the modern Clipboard API when
 * available, falls back to execCommand.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            /* Fall through to legacy fallback. */
        }
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

/* SECURITY */

/**
 * Read the CSRF token from <meta name="csrf-token"> or the XSRF-TOKEN
 * cookie.
 * @returns {string}
 */
export function getCsrfToken() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        const v = meta.getAttribute('content');
        if (v) return v;
    }
    const match = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='));
    if (match) {
        return decodeURIComponent(match.split('=')[1]);
    }
    return '';
}

/* LOADING */

/**
 * Resolve when the site loader (#siteLoader) has fully faded from the
 * viewport. Used by modules that time their first animation to the
 * end of the site boot sequence.
 *
 * Fast paths:
 *   - No loader element in the DOM -> resolves immediately.
 *   - Loader already has the "hidden" class AND computed opacity is 0
 *     -> resolves immediately (covers enableSiteLoader: false and any
 *     path that hides the loader synchronously).
 *
 * Otherwise waits for the loader's opacity transition to end. A
 * safety timeout (default 3000ms) prevents a broken transition from
 * blocking the caller forever.
 *
 * @param {number} [safetyMs=3000] - Safety timeout in milliseconds.
 * @returns {Promise<void>}
 */
export function waitForLoaderHidden(safetyMs = 3000) {
    return new Promise(resolve => {
        const loader = document.getElementById('siteLoader');
        if (!loader) return resolve();
        if (loader.classList.contains('hidden')
            && getComputedStyle(loader).opacity === '0') {
            return resolve();
        }
        const onEnd = (e) => {
            if (e.target !== loader || e.propertyName !== 'opacity') return;
            loader.removeEventListener('transitionend', onEnd);
            resolve();
        };
        loader.addEventListener('transitionend', onEnd);
        setTimeout(resolve, safetyMs);
    });
}

/**
 * Derive an inline data script ID from a data file URL.
 *
 * The server inlines each JSON file as:
 *   <script type="application/json" id="data-{id}">...</script>
 *
 * This function computes {id} from the URL:
 *   /data/site.json            -> 'site'
 *   /data/blog.json            -> 'blog'
 *   /data/blog/about.json      -> 'blog-about'
 *
 * @param {string} url - Data file URL as declared in REQUIRES_DATA.
 * @returns {string} Inline ID without the 'data-' prefix.
 */
export function urlToInlineId(url) {
    return url
        .replace(/^\/data\//, '')
        .replace(/\.json$/, '')
        .split('/')
        .join('-');
}

/**
 * Dynamically loads a CSS stylesheet and resolves when it is applied.
 * @param {string} href
 * @returns {Promise<void>}
 */
export function loadCSS(href) {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
    });
}

/* Module-scope response cache. Keys are URLs; values are parsed JSON or null on failure. */
const _jsonCache = new Map();

/**
 * Fetches and parses a JSON file. Caches the result.
 * @param {string} url
 * @returns {Promise<Object|null>}
 */
export async function loadJSON(url) {
    if (_jsonCache.has(url)) {
        return _jsonCache.get(url);
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        _jsonCache.set(url, data);
        return data;
    } catch (err) {
        console.warn(`loadJSON failed for "${url}":`, err.message);
        _jsonCache.set(url, null);
        return null;
    }
}

/**
 * Loads core site data. Reads inline first, then fetch, then hard-coded
 * fallback so the page always renders.
 * @returns {Promise<Object>}
 */
export async function fetchSiteData() {
    const inline = readInlineData('site');
    if (inline) return inline;

    const data = await loadJSON('/data/site.json');
    if (data) return data;

    return {
        title: 'YourProject',
        tagline: 'Your tagline goes here',
        showBrand: true,
        showTagline: true,
        copyright: '&copy; 2026 YourProject&trade;',
        poweredBy: 'Powered by <a href="https://antranik.dev" target="_blank" rel="noopener">Antranik.dev</a>',
        showPoweredBy: true
    };
}

/**
 * Merge module data from a URL-keyed map into a flat object.
 *
 * Config file (e.g. /data/blog.json) spreads at the top level.
 * Sub-directory files (e.g. /data/blog/about.json) nest under their
 * filename without extension. This lets command handlers keep reading
 * data.about.text, data.projects, etc. unchanged - only the loading
 * layer knows about the file split.
 *
 *   raw = {
 *     '/data/blog.json': { title, prompts, boot },
 *     '/data/blog/about.json': { text },
 *     '/data/blog/projects.json': { items }
 *   }
 *   mergeModuleData(raw, 'blog')
 *   -> { title, prompts, boot, about: { text }, projects: { items } }
 *
 * @param {Object} raw - URL-keyed module data from app.js.
 * @param {string} moduleName - Module directory name (e.g. 'blog').
 * @returns {Object} Flat merged data object.
 */
export function mergeModuleData(raw, moduleName) {
    const merged = {};
    const flatUrl = `/data/${moduleName}.json`;
    const prefix = `/data/${moduleName}/`;

    for (const [url, data] of Object.entries(raw || {})) {
        if (!data) continue;
        if (url === flatUrl) {
            Object.assign(merged, data);
        } else if (url.startsWith(prefix)) {
            const key = url.slice(prefix.length).replace(/\.json$/, '');
            merged[key] = data;
        }
    }

    return merged;
}

/* VERSIONING */

/**
 * Compares two semantic version strings. Returns true if
 * `actual` >= `required`. If `required` is falsy, returns true.
 * @param {string} actual
 * @param {string} required
 * @returns {boolean}
 */
export function versionSatisfies(actual, required) {
    if (!required) return true;
    const [aMajor, aMinor = 0] = actual.split('.').map(Number);
    const [rMajor, rMinor = 0] = required.split('.').map(Number);
    return aMajor > rMajor || (aMajor === rMajor && aMinor >= rMinor);
}