/**
 * Minimal pub/sub bus. Used by Window and Taskbar to decouple from
 * each other. Fires safely even with no listeners - a stray emit is
 * a no-op, not an error.
 *
 * Usage:
 *   import { EVENTS } from './events.js';
 *   const off = EVENTS.on('window:minimized', (info) => { ... });
 *   EVENTS.emit('window:minimized', { id, label, icon });
 *   off(); // unsubscribe
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* EVENTS */

/**
 * Pub/sub bus. Instantiate one per application; the singleton at the
 * bottom of this file is the shared instance every consumer uses.
 */
class Events {
    constructor() {
        /** @type {Map<string, Set<Function>>} Map of event name to listener set. */
        this._listeners = new Map();
    }

    /* PUBLIC API */

    /**
     * Subscribe to an event.
     * @param {string} event - Event name.
     * @param {Function} fn - Listener function called with the payload.
     * @returns {Function} Unsubscribe function. Call it to remove the listener.
     */
    on(event, fn) {
        /* Lazily create the listener set for this event name. */
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(fn);

        /* Return an unsubscribe closure so callers can clean up without
           needing to hold a reference to `fn`. */
        return () => this.off(event, fn);
    }

    /**
     * Unsubscribe a previously registered function. Safe to call if the
     * event name or function is not registered - it is a no-op.
     * @param {string} event - Event name.
     * @param {Function} fn - Listener function to remove.
     */
    off(event, fn) {
        const set = this._listeners.get(event);
        if (set) set.delete(fn);
    }

    /**
     * Emit an event. Listeners are invoked synchronously in registration
     * order. A listener that throws does not block the rest - the error is
     * logged and iteration continues.
     * @param {string} event - Event name.
     * @param {*} [payload] - Payload passed to each listener.
     */
    emit(event, payload) {
        const set = this._listeners.get(event);

        /* No listeners for this event - nothing to do. */
        if (!set) return;

        for (const fn of set) {
            try {
                fn(payload);
            } catch (err) {
                /* One bad listener must not break the rest. Log and continue. */
                console.error(`[events] listener for "${event}" failed:`, err);
            }
        }
    }
}

/**
 * Shared singleton. Every consumer imports this same instance so events
 * emitted by Window reach Taskbar (and anything else that subscribed).
 * @type {Events}
 */
export const EVENTS = new Events();