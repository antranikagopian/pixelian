/**
 * Card rendered as a headerless Panel. The window frame (border,
 * shadow, background, radius) comes from panel.css; card provides
 * heading and body only.
 *
 * CSS auto-injection is handled by index.php (reads data/modules.json,
 * emits <link rel="stylesheet" href="/css/{name}.css"> per active
 * module). card.css ships empty as the extension point for
 * card-specific styling.
 *
 * Uses core/panel.js with showHeader: false, so the same visual style
 * applies as any other panel but without a title bar.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { Panel } from '../../core/panel.js';

/* PUBLIC API */

export class Card {
    /**
     * @param {Object} [options]
     * @param {string} [options.target='#module'] - container selector
     * @param {'first'|'last'} [options.position='first'] - where to insert
     * @param {Object} [options.data] - content from /data/card.json
     */
    constructor({ target = '#module', position = 'first', data } = {}) {
        this.container = document.querySelector(target);
        this.position = position;
        this.data = data;
    }

    /**
     * Initialise the card:
     * 1. Read heading and body from data (or fallback defaults).
     * 2. Build a headerless Panel.
     * 3. Fill it and mount into the container.
     *
     * panel.css (core) and card.css (module) are already in <head> by
     * the time init() runs - index.php auto-injects module CSS from
     * data/modules.json.
     *
     * @returns {Promise<void>}
     */
    async init() {
        if (!this.container) return;

        const content = this.data || {
            heading: 'Welcome',
            body: 'Add content to /data/card.json to customize this card.'
        };

        const panel = new Panel({ showHeader: false });

        const h2 = document.createElement('h2');
        h2.textContent = content.heading || '';
        const p = document.createElement('p');
        p.textContent = content.body || '';
        panel.appendContent(h2, p);

        if (this.position === 'last') {
            this.container.appendChild(panel.element);
        } else {
            this.container.insertBefore(panel.element, this.container.firstChild);
        }
    }
}

/**
 * Convenience factory that returns a promise resolving after the card is ready.
 *
 * @param {Object} [options] - Same options as Card constructor.
 * @returns {Promise<void>}
 */
export function initCard(options) {
    const card = new Card(options);
    return card.init();
}