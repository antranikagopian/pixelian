/**
 * Card module descriptor. Default export consumed by
 * js/modules/index.js when "card" is listed in data/modules.json.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import * as config from './config.js';
import { initCard } from './main.js';

/* PUBLIC API */

export default {
    name: 'card',
    config,
    init: async (moduleData) => {
        await initCard({
            target: '#module',
            position: 'first',
            data: moduleData?.['/data/card.json']
        });
    }
};