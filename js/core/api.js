/**
 * Secure frontend API client for the Laravel backend. Wraps fetch
 * with same-origin credentials, CSRF token headers (via getCsrfToken
 * from utils), Accept: application/json, JSON body on POST/PUT/PATCH,
 * 15 second timeout via AbortController, and structured ApiError on
 * any failure.
 *
 * Error messages are always human-readable. HTML bodies (nginx default
 * pages, CDN error pages, misconfigured proxies) are detected and
 * replaced with a clean status-based message so callers can safely print
 * `err.message` without leaking markup to the UI.
 *
 * SECURITY: the API is responsible for sanitizing content. Callers that
 * render untrusted strings into DOM must sanitize client-side as well -
 * use sanitizeHTML() from core/sanitize.js for any HTML body.
 *
 * Base URL is /api/. All errors return bare status codes (nginx config
 * ensures no 302 to HTML), so fetch can always parse the response.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { getCsrfToken } from './utils.js';

/* CONSTANTS */

const BASE_URL = '/api';
const TIMEOUT_MS = 15000;

/* ERROR CLASS */

/**
 * Structured error thrown by every api call on non-2xx or network
 * failure. `status` is the real HTTP status (0 for network or timeout
 * failures). `body` is the parsed response body when available.
 * `message` is always safe to display - HTML bodies are never surfaced
 * there.
 */
export class ApiError extends Error {
    /**
     * @param {number} status - HTTP status (0 for network/timeout).
     * @param {string} message - Human-readable message, never HTML.
     * @param {*} [body=null] - Parsed response body for inspection.
     */
    constructor(status, message, body = null) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.body = body;
    }
}

/* HELPERS */

/**
 * Recognize HTML responses (nginx default pages, CDN error pages,
 * misconfigured proxies). Those must never be shown as error messages -
 * they leak markup and confuse users.
 *
 * @param {*} text - Value to test.
 * @returns {boolean} True when the value starts with an HTML tag.
 */
function isHTMLContent(text) {
    return typeof text === 'string' && /^\s*<(?:!doctype|html|body|head)/i.test(text);
}

/**
 * Clean status-based fallback message for HTTP errors. Used when the
 * server does not provide a parseable JSON message and the body is HTML
 * or empty.
 *
 * @param {number} status - HTTP status code.
 * @returns {string} Human-readable message for the status.
 */
function statusMessage(status) {
    const messages = {
        400: 'Bad request.',
        401: 'Unauthorized.',
        403: 'Forbidden.',
        404: 'Not found.',
        408: 'Request timed out.',
        429: 'Too many requests.',
        500: 'Server error.',
        502: 'Backend unavailable.',
        503: 'Backend unavailable.',
        504: 'Backend timeout.'
    };
    return messages[status] || `HTTP ${status}`;
}

/* REQUEST */

/**
 * Internal request helper. Builds headers, sends fetch, parses response,
 * throws ApiError on non-2xx or network failure.
 *
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method - HTTP method.
 * @param {string} path - Path relative to /api/ (e.g. '/news').
 * @param {*} [body] - Optional JSON body for POST/PUT/PATCH.
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response.
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
async function request(method, path, body, options = {}) {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
        () => controller.abort(),
        options.timeout || TIMEOUT_MS
    );

    const headers = {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    const csrf = getCsrfToken();
    if (csrf) {
        headers['X-CSRF-TOKEN'] = csrf;
        headers['X-XSRF-TOKEN'] = csrf;
    }

    let payload;
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let res;
    try {
        res = await fetch(url, {
            method,
            headers,
            body: payload,
            credentials: 'same-origin',
            signal: controller.signal
        });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new ApiError(408, 'Request timed out.', null);
        }
        throw new ApiError(0, 'Network error. Backend may be unavailable.', null);
    }
    clearTimeout(timeoutId);

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        try { data = await res.json(); } catch { data = null; }
    } else {
        try { data = await res.text(); } catch { data = null; }
    }

    if (!res.ok) {
        /* Prefer a clean message from the response. Priority:
           1. JSON body with a `message` or `error` field (Laravel convention)
           2. Plain text body that is not HTML (truncated to 200 chars)
           3. Status-based fallback (never the raw HTML body)

           The raw body is still available on err.body for callers that
           want to inspect it, but err.message is always human-readable. */
        let msg = statusMessage(res.status);
        if (data && typeof data === 'object' && (data.message || data.error)) {
            msg = data.message || data.error;
        } else if (typeof data === 'string' && data.trim() && !isHTMLContent(data)) {
            msg = data.trim().slice(0, 200);
        }
        throw new ApiError(res.status, msg, data);
    }

    return data;
}

/* PUBLIC API */

/**
 * GET request to /api/{path}. Cached by the browser according to the
 * server's Cache-Control headers (nginx config sets public, max-age=60
 * for /data/, none for /api/).
 *
 * @param {string} path - Path relative to /api/ (e.g. '/news').
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response.
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
export const apiGet = (path, options) => request('GET', path, undefined, options);

/**
 * POST request to /api/{path} with a JSON body. Laravel will receive
 * `{ ...body }` as the request payload and reject with 422 for
 * validation failures.
 *
 * @param {string} path - Path relative to /api/.
 * @param {*} body - Payload to serialize as JSON.
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response.
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
export const apiPost = (path, body, options) => request('POST', path, body, options);

/**
 * PUT request to /api/{path} with a JSON body. Semantically replaces the
 * resource; for partial updates prefer apiPatch.
 *
 * @param {string} path - Path relative to /api/.
 * @param {*} body - Payload to serialize as JSON.
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response.
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
export const apiPut = (path, body, options) => request('PUT', path, body, options);

/**
 * PATCH request to /api/{path} with a JSON body. Use for partial
 * updates; use apiPut for full resource replacement.
 *
 * @param {string} path - Path relative to /api/.
 * @param {*} body - Payload to serialize as JSON.
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response.
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
export const apiPatch = (path, body, options) => request('PATCH', path, body, options);

/**
 * DELETE request to /api/{path}. Sends no body - the resource is
 * identified by the path alone.
 *
 * @param {string} path - Path relative to /api/.
 * @param {Object} [options] - Configuration.
 * @param {number} [options.timeout] - Override the default timeout in ms.
 * @returns {Promise<*>} Parsed JSON response (usually null).
 * @throws {ApiError} On non-2xx, network failure, or timeout.
 */
export const apiDelete = (path, options) => request('DELETE', path, undefined, options);

/* ERROR MESSAGES */

/**
 * Translate an ApiError into a user-facing message, parameterized by the
 * calling command. Handles every status the client realistically
 * encounters, with clean phrasing that never surfaces raw HTML.
 *
 * Callers pass context so the message reads naturally:
 *   describeApiError(err, { prefix: 'news', resource: 'article', id })
 *   -> "news: article "release-1.1.0" not found."
 *
 * Without `id`, 404 refers to the resource list:
 *   describeApiError(err, { prefix: 'news', resource: 'article' })
 *   -> "news: article list not available."
 *
 * Without `resource`, 404 falls back to the generic statusMessage() text.
 *
 * @param {Error} err - ApiError from this module (or any error).
 * @param {Object} opts - Context for the message.
 * @param {string} [opts.prefix] - Command name prefix (e.g. 'news').
 * @param {string} [opts.resource] - Singular noun for 404 (e.g. 'article').
 * @param {string} [opts.id] - Specific item id, when known.
 * @returns {string} Human-readable error message.
 */
export function describeApiError(err, { prefix, resource, id } = {}) {
    const status = err?.status;
    const p = prefix ? `${prefix}: ` : '';

    if (status === 404) {
        if (resource && id) return `${p}${resource} "${id}" not found.`;
        if (resource) return `${p}${resource} list not available.`;
        return `${p}${statusMessage(404).toLowerCase()}`;
    }
    if (status === 0 || status === 502 || status === 503 || status === 504) {
        return `${p}backend unavailable. Try again later.`;
    }
    if (status === 408) {
        return `${p}request timed out. Try again.`;
    }
    if (status === 429) {
        return `${p}too many requests. Wait a moment.`;
    }
    if (status === 500) {
        return `${p}server error. Try again later.`;
    }
    if (status) {
        return `${p}request failed (HTTP ${status}).`;
    }
    return `${p}request failed. Try again later.`;
}