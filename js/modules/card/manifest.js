/**
 * Card module descriptor. Default export consumed by
 * js/modules/index.js when "card" is listed in data/modules.json.
 *
 * init(moduleData, mount) receives mount from data/modules.json:
 * { target, position }. Both are optional - when the manifest entry
 * was a plain string, or the fields are absent, the defaults below
 * apply. See GUIDE.md, Add / Remove a Module, for the manifest
 * contract.
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
    init: async (moduleData, mount = {}) => {
        await initCard({
            target: mount.target || '#module',
            position: mount.position || 'first',
            data: moduleData?.['/data/card.json']
        });
    }
};