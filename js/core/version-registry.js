/**
 * Central registry for core and module versions. Validates that a
 * module's declared primitives are known to the current core build.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* IMPORTS */

import { versionSatisfies } from './utils.js';

/* CONSTANTS */

/**
 * Primitives and services that any core build of this template exports.
 * Modules declare the ones they need in REQUIRES_PRIMITIVES. This set is
 * the single source of truth for validation - a module listing a name
 * that is not in this set fails at boot with a clear error.
 *
 *   Panel          - reusable panel frame (title bar + content region)
 *   Window         - draggable window behavior (used by Panel internally)
 *   TaskbarManager - window taskbar (boot-level, not usually per-module)
 *   Events         - pub/sub bus (shared by Window and Taskbar)
 *   ThemeManager   - site and panel theme state
 *   ThemeSelector  - theme dropdown widget
 *   ErrorDialog    - error dialog service (panel / overlay / custom)
 *   Api            - secure fetch client for /api/ (CSRF, timeout,
 *                    structured ApiError); use for any backend call
 *   Sanitize       - allow-list HTML sanitizer; use before any innerHTML
 *                    render of untrusted content
 *
 * The last two are security-sensitive surfaces. Modules fetching from
 * Laravel must use Api (never raw fetch) so CSRF, credentials, and error
 * handling stay consistent. Modules rendering HTML from the backend must
 * pass it through Sanitize first - see the standard module pattern in
 * `js/modules/card/`.
 */
const KNOWN_PRIMITIVES = new Set([
    'Panel',
    'Window',
    'TaskbarManager',
    'Events',
    'ThemeManager',
    'ThemeSelector',
    'ErrorDialog',
    'Api',
    'Sanitize'
]);

/* REGISTRY */

/* Populated by registerCore / registerModule. Read by assertRequirements and getLoadedModules. */
const _registry = {
    core: { version: '', codeName: '' },
    modules: {}
};

/* PUBLIC API */

/**
 * Register the core version and code name. Called once from app.js.
 * @param {string} version - Core version string (e.g. "1.0.0").
 * @param {string} codeName - Core code name (e.g. "Pixelian").
 */
export function registerCore(version, codeName) {
    _registry.core.version = version;
    _registry.core.codeName = codeName;
}

/**
 * Register a module's version and core dependency. Called once per module
 * after its config is imported.
 * @param {string} name - Module name.
 * @param {string} version - Module version.
 * @param {string} [requiresCore] - Minimum core version required.
 */
export function registerModule(name, version, requiresCore) {
    _registry.modules[name] = { version, requiresCore };
}

/**
 * Throws an error if the module's requirements are not satisfied.
 *
 * @param {string} name - Module name.
 * @param {string} version - Module's own version.
 * @param {string} [requiredCore] - Required core version (optional).
 * @param {Object} [dependencies] - { otherModule: minVersion } (optional).
 * @param {string[]} [requiredPrimitives] - Core primitive names the module uses.
 */
export function assertRequirements(
    name,
    version,
    requiredCore,
    dependencies = {},
    requiredPrimitives = []
) {
    /* Check core version floor. */
    if (requiredCore && !versionSatisfies(_registry.core.version, requiredCore)) {
        throw new Error(
            `Module "${name}" v${version} requires core v${requiredCore}, ` +
            `but core is v${_registry.core.version}. Please upgrade the template core.`
        );
    }

    /* Check peer module dependencies. */
    for (const [depName, minVersion] of Object.entries(dependencies)) {
        const dep = _registry.modules[depName];
        if (!dep) {
            throw new Error(
                `Module "${name}" v${version} requires "${depName}", ` +
                `but it is not registered. Make sure it is loaded before this module.`
            );
        }
        if (!versionSatisfies(dep.version, minVersion)) {
            throw new Error(
                `Module "${name}" v${version} requires "${depName}" v${minVersion}, ` +
                `but "${depName}" is v${dep.version}. Please upgrade "${depName}".`
            );
        }
    }

    /* Check declared primitives are known to this core build. */
    for (const primitive of requiredPrimitives) {
        if (!KNOWN_PRIMITIVES.has(primitive)) {
            throw new Error(
                `Module "${name}" v${version} declares unknown primitive "${primitive}". ` +
                `Known primitives: ${[...KNOWN_PRIMITIVES].join(', ')}.`
            );
        }
    }
}

/**
 * Returns version information in the requested format.
 *
 * @param {Object} [options] - Configuration.
 * @param {'object'|'array'} [options.format='object'] - Return type.
 * @param {boolean} [options.includeCore=true] - Include core info.
 * @param {boolean} [options.logToConsole=false] - Also log to console.
 * @returns {Object|Array} Version info.
 */
export function getLoadedModules({
    format = 'object',
    includeCore = true,
    logToConsole = false
} = {}) {
    const coreInfo = includeCore
        ? { core: { version: _registry.core.version, codeName: _registry.core.codeName } }
        : {};
    const modulesInfo = Object.entries(_registry.modules).map(([name, info]) => ({
        name,
        version: info.version,
        requiresCore: info.requiresCore
    }));

    let result;
    if (format === 'array') {
        result = includeCore
            ? [{ name: 'core', version: _registry.core.version, codeName: _registry.core.codeName }, ...modulesInfo]
            : modulesInfo;
    } else {
        result = {
            ...coreInfo,
            modules: Object.fromEntries(
                Object.entries(_registry.modules).map(([name, info]) => [
                    name,
                    { version: info.version, requiresCore: info.requiresCore }
                ])
            )
        };
    }

    if (logToConsole) {
        console.group('Version Registry');
        if (includeCore) {
            console.log(`Core: ${_registry.core.version} (${_registry.core.codeName})`);
        }
        console.table(modulesInfo);
        console.groupEnd();
    }

    return result;
}