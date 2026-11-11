<?php
/**
 * SPA entry point. Emits the full HTML shell: inline design tokens,
 * SITE_CONFIG, the site loader, the no-JS fallback, the module
 * manifest resolution, module data inlining, and the pre-module boot
 * script.
 *
 * Attribution lives here once. Section markers inside the file
 * (MODULE CONFIG, RESOLVE ACTIVE MODULES, Inline module data) do not
 * carry their own @copyright/@author - see GUIDE.md §3.3.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
 * @author Antranik Agopian <hello@antranik.dev>
 */

header('Content-Type: text/html; charset=utf-8');

/* MODULE CONFIG
   Active modules are read from data/modules.json (overridden per
   deployment at merge time). Edit that file, not this one.

   Examples:
     {"modules": ["card", "module-a"]}            Card + one additional module
     {"modules": ["module-a"]}                    A single custom module
     {"modules": ["card", "module-a", "module-b"]} Multiple modules

   Every name must correspond to js/modules/{name}/manifest.js.
   Unknown names are skipped. Missing file falls back to ["card"].
   Add a module: see GUIDE.md section 8.2. */

/* RESOLVE ACTIVE MODULES
   Read data/modules.json (Pixelian default, overridden per deployment).
   Missing file falls back to ["card"] so a fresh clone still renders.
   Validation filters non-strings and anything that could path-traverse. */
$modulesPath = __DIR__ . '/data/modules.json';
$activeModules = ['card'];
if (is_readable($modulesPath)) {
    $parsed = json_decode(file_get_contents($modulesPath), true);
    if (is_array($parsed['modules'] ?? null)) {
        $activeModules = $parsed['modules'];
    }
}
$activeModules = array_values(array_filter($activeModules, function ($name) {
    return is_string($name) && preg_match('/^[a-z0-9_-]+$/i', $name);
}));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>YourProject - YourTagline</title>
    <meta name="description" content="YourDescription" />
    <meta name="keywords" content="YourKeywords" />
    <meta name="author" content="YourAuthor" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://YourDomain" />

    <!-- Open Graph -->
    <meta property="og:title" content="YourProject - YourTagline" />
    <meta property="og:description" content="YourDescription" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://YourDomain" />
    <meta property="og:image" content="https://YourDomain/media/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="YourProject - YourTagline" />
    <meta name="twitter:description" content="YourDescription" />
    <meta name="twitter:image" content="https://YourDomain/media/og.png" />

    <!-- Theme color, kept in sync with the saved site theme by the
         inline script below. Single tag so mobile chrome follows the
         site theme, not the OS theme. -->
    <meta name="theme-color" content="#000000" />

    <!-- CSRF token, read by core/api.js before any /api/ call.
         Empty until Laravel wires in; api.js falls back to the
         XSRF-TOKEN cookie. -->
    <meta name="csrf-token" content="" />

    <!-- ICONS -->
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="shortcut icon" href="/icons/favicon.ico" />

    <!-- FONTS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

    <!-- Module preloads. Manifests and mains preloaded so the dynamic
         import in js/modules/index.js resolves from cache. JSON is
         inlined by PHP below; do not preload it. -->
<?php
foreach ($activeModules as $name) {
    $base = '/js/modules/' . $name;
    foreach (['manifest.js', 'main.js'] as $file) {
        if (!is_readable(__DIR__ . $base . '/' . $file)) continue;
        echo '    <link rel="modulepreload" href="'
           . htmlspecialchars($base . '/' . $file, ENT_QUOTES)
           . '" />' . "\n";
    }
}
?>

    <!-- Core stylesheets -->
    <link rel="stylesheet" href="/css/site.css" />
    <link rel="stylesheet" href="/css/theme.css" />
    <link rel="stylesheet" href="/css/panel.css" />
    <link rel="stylesheet" href="/css/taskbar.css" />

    <!-- Module stylesheets, auto-injected from data/modules.json.
         Only /css/{name}.css is auto-injected. Modules with additional
         CSS files load them via loadCSS() in init(). -->
<?php
foreach ($activeModules as $name) {
    if (!is_readable(__DIR__ . '/css/' . $name . '.css')) continue;
    echo '    <link rel="stylesheet" href="/css/'
       . htmlspecialchars($name, ENT_QUOTES)
       . '.css" />' . "\n";
}
?>

    <!-- Preload: error.css is loaded on-demand by error.js when a
         dialog opens. Not a module CSS file. -->
    <link rel="preload" href="/css/error.css" as="style" />

    <style>
        /**
         * Critical render-path styles: tokens, loader, site layout,
         * and the no-JS fallback overlay.
         */

        /* DESIGN TOKENS */

        :root {
            /* BASE */
            --site-font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            --site-font-size-base: 1rem;
            --site-bg-dark: #000000;
            --site-text-dark: #ffffff;
            --site-accent-dark: #4cffb0;
            --site-bg-light: #f5f5f7;
            --site-text-light: #000000;
            --site-accent-light: #0066cc;
            --site-text-shadow: #aaaaaa;
            --site-pixel-size: 2.4rem;
            --site-gap: 1rem;
            --site-radius-sm: 0.25rem;
            --site-radius-md: 0.375rem;
            --site-radius-lg: 0.5rem;
            --site-shadow-sm: 0 1px 8px rgba(0,0,0,0.3);
            --site-shadow-md: 0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05);
            --site-transition-fast: 0.15s ease;
            --site-transition-base: 0.2s ease;
            --site-transition-slow: 0.5s ease;

            --site-main-border-width: 1px;
            --site-main-inner-inset: 0.375rem;

            /* WARNING */
            --site-warning-bg: #ffd966;
            --site-warning-border: #e67e22;
            --site-warning-text: #2c3e50;

            /* LOADER */
            --site-loader-pixel-size: var(--site-pixel-size);
            --site-loader-pixel-border-width: 1px;
            --site-loader-pixel-gap: 0;
            --site-loader-pixel-opacity-min: 0.15;
            --site-loader-pixel-scale-min: 0.7;
            --site-loader-pixel-appear-delay: 100;
            --site-loader-pixel-disappear-delay: 120;
            --site-loader-pixel-wave-duration: 0.8s;
            --site-loader-pixel-wave-stagger: 0.08s;
            --site-loader-pixel-settle-duration: 0.35s;
            --site-loader-pixel-fade-duration: 0.35s;
            --site-loader-end-delay: 500ms;
        }

        @media (max-width: 540px) {
            :root { --site-main-inner-inset: 0.25rem; }
        }

        @media (max-height: 450px) {
            :root { --site-gap: 0.7rem; }
        }

        /* THEMES */

        .site-dark {
            --site-bg: var(--site-bg-dark);
            --site-fg: var(--site-bg-light);
            --site-text: var(--site-text-dark);
            --site-accent: var(--site-accent-dark);
            --site-copyright: rgba(255,255,255,0.7);
            --site-loader-pixel-border-color: var(--site-bg);
            --site-error-bg: #1a1a1a;
            --site-text-rgb: 255, 255, 255;

            --site-button-bg: rgba(255, 255, 255, 0.1);
            --site-button-hover: rgba(255, 255, 255, 0.2);
            --site-button-active: rgba(255, 255, 255, 0.3);
            --site-button-border: rgba(255, 255, 255, 0.3);
            --site-button-focus: rgba(76, 255, 176, 0.5);
        }

        .site-light {
            --site-bg: var(--site-bg-light);
            --site-fg: var(--site-bg-dark);
            --site-text: var(--site-text-light);
            --site-accent: var(--site-accent-light);
            --site-copyright: rgba(0,0,0,0.7);
            --site-loader-pixel-border-color: var(--site-bg);
            --site-error-bg: #ffffff;
            --site-text-rgb: 0, 0, 0;

            --site-button-bg: rgba(0, 0, 0, 0.08);
            --site-button-hover: rgba(0, 0, 0, 0.15);
            --site-button-active: rgba(0, 0, 0, 0.2);
            --site-button-border: rgba(0, 0, 0, 0.2);
            --site-button-focus: rgba(0, 102, 204, 0.3);
        }

        /* RESET */

        * { margin: 0; padding: 0; box-sizing: border-box; }

        .align-left { display: inline-block; }
        .align-center { display: block; width: fit-content; margin: 0 auto; }
        .align-right { display: block; width: fit-content; margin-left: auto; }

        /* Clip horizontal overflow without creating a scroll container
           (which would break sticky positioning). `hidden` fallback for
           browsers without `clip`. */
        html, body {
            overflow-x: hidden;
        }
        @supports (overflow-x: clip) {
            html, body {
                overflow-x: clip;
            }
        }

        body {
            display: grid;
            grid-template-rows: auto 1fr auto;
            min-height: 100vh;
            background: var(--site-bg);
            color: var(--site-text);
            font-family: var(--site-font-family);
            font-size: var(--site-font-size-base);
            padding: var(--site-gap);
            transition: background-color var(--site-transition-base);
        }

        /* HEADER */

        header {
            grid-row: 1;
            position: sticky;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: var(--site-gap);
            top: 0;
            padding: calc(var(--site-gap) * 0.5) var(--site-gap);
            text-align: center;
            user-select: none;
            width: 100%;
            max-width: 90vw;
            margin: 0 auto;
            z-index: 100;
        }

        header .brand h1 {
            font-size: 1.7rem;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--site-text);
            letter-spacing: 0.2rem;
            margin-right: -0.2rem;
            line-height: 1.2;
            margin-bottom: 0.5rem;
            display: inline-block;
            padding-bottom: 0.3em;
            position: relative;
            border-bottom: none;
        }

        /* Dashed underline centered on the brand text. */
        header .brand h1::after {
            content: '';
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 0;
            width: 36%;
            height: 2px;
            background: repeating-linear-gradient(
                to right,
                var(--site-accent) 0 0.2857em,
                transparent 0.2857em 0.4286em
            );
        }

        /* Softened opacity so the tagline reads as description, not duplicate. */
        header .brand p {
            font-size: 0.9rem;
            opacity: 0.55;
            color: var(--site-text);
        }

        /* MAIN */

        main {
            grid-row: 2;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            width: 100%;
            gap: var(--site-gap);
        }

        /* MODULE */

        #module {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            align-items: center;
            position: relative;
            background: var(--site-bg);
            overflow: visible;
            border-radius: var(--site-radius-sm);
            max-width: 62.5rem;
            min-width: 17.5rem;
            gap: var(--site-gap);
        }
        #module::before {
            content: "";
            position: absolute;
            pointer-events: none;
            z-index: 25;
        }

        @media (max-height: 450px) {
            #module { width: 95vw; gap: 0.5rem; }
        }

        /* LOADER */

        /* Fixed full-viewport so it covers draggable panels (z-index 2000-4999). */
        #siteLoader {
            position: fixed;
            inset: 0;
            background: var(--site-bg);
            z-index: 9000;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: opacity var(--site-transition-slow), visibility var(--site-transition-slow);
        }
        #siteLoader.hidden {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }
        .site-loader-pixels {
            display: flex;
            gap: var(--site-loader-pixel-gap);
            align-items: center;
        }
        .site-loader-pixel {
            width: var(--site-loader-pixel-size);
            height: var(--site-loader-pixel-size);
            background: var(--site-fg);
            border: var(--site-loader-pixel-border-width) solid var(--site-loader-pixel-border-color);
            image-rendering: pixelated;
            opacity: 0;
            transform: scale(0.7);
            transition: opacity var(--site-loader-pixel-fade-duration) ease,
                        transform var(--site-loader-pixel-settle-duration) cubic-bezier(0.4, 0, 0.2, 1);
        }
        #siteLoader.loader-wave .site-loader-pixel {
            animation: pixel-wave var(--site-loader-pixel-wave-duration) ease-in-out infinite alternate;
        }
        @keyframes pixel-wave {
            0%   { opacity: 1; transform: scale(1); }
            100% { opacity: var(--site-loader-pixel-opacity-min); transform: scale(var(--site-loader-pixel-scale-min)); }
        }

        /* ERROR */

        /* Fallback error overlay. Only fires when js/app.js fails to load.
           URL errors use the core ErrorDialog panel via app.js instead.
           Structure: canvas -> divider -> message, inside .core-panel so
           frame, shadow, radius, padding come from panel.css. */
        .site-error {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--site-gap);
            box-sizing: border-box;
            background: var(--site-bg);
            z-index: 9999;
            font-family: var(--site-font-family);
        }

        .site-error-card {
            width: 100%;
            max-width: 22rem;
            text-align: center;
        }

        .site-error .core-panel-content {
            padding: 1.5rem 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.25rem;
        }

        /* Canvas bg + border match the site card pattern. position
           relative so the badge can anchor to the bottom edge.
           margin-bottom reserves space for the badge overhang. */
        .site-error-canvas {
            position: relative;
            width: 10rem;
            height: 10rem;
            box-sizing: border-box;
            border: 1px dashed rgba(var(--site-text-rgb), 0.15);
            border-radius: 0.125rem;
            background: rgba(15, 15, 15, 0.92);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-bottom: 0.7rem;
        }
        .site-light .site-error-canvas {
            background: rgba(255, 255, 255, 0.95);
        }

        /* Badge straddles the bottom dashed line. Solid border marks it
           as a label (structure), not a chip (dashed). */
        .site-error-badge {
            position: absolute;
            bottom: -0.7rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1;
            padding: 0.125rem 0.5rem;
            background: var(--site-bg);
            color: var(--site-accent);
            border: 1px solid var(--site-accent);
            border-radius: var(--site-radius-sm, 0.25rem);
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            line-height: 1.4;
            white-space: nowrap;
        }

        .site-error-grid {
            display: grid;
        }

        .site-error-pixel {
            width: 1rem;
            height: 1rem;
            background: var(--site-fg);
            opacity: 0;
            transition: opacity 0.3s;
            image-rendering: pixelated;
        }

        .site-error-pixel.on {
            opacity: 1;
            animation: pixelErrorPulse 1.8s ease-in-out infinite alternate;
        }

        @keyframes pixelErrorPulse {
            0%   { opacity: 0.4; }
            100% { opacity: 1; }
        }

        /* 5rem, 8:4 dashed gradient. Matches .site-error-divider. */
        .site-error-divider {
            width: 5rem;
            height: 1px;
            background-image: repeating-linear-gradient(
                to right,
                rgba(var(--site-text-rgb), 0.15) 0 0.5rem,
                transparent 0.5rem 0.75rem
            );
            background-size: 0.75rem 1px;
            background-position: bottom left;
            background-repeat: repeat-x;
            opacity: 0.7;
            flex-shrink: 0;
        }

        .site-error-message {
            font-size: 0.9rem;
            color: var(--site-text);
            opacity: 0.72;
            line-height: 1.55;
            text-align: center;
            max-width: 20rem;
        }

        /* FOOTER */

        footer {
            grid-row: 3;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: var(--site-gap);
            padding: var(--site-gap) 1rem;
            background: var(--site-bg);
            pointer-events: none;
        }

        footer .legal {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            font-size: calc(var(--site-font-size-base) * 0.8125);
            letter-spacing: 0.05em;
            color: var(--site-copyright);
            font-family: var(--site-font-family);
        }

        footer .legal .copyright {
            margin-bottom: 0.3rem;
        }

        footer .legal .powered-by a {
            color: inherit;
            text-decoration: none;
            padding-bottom: 0.125rem;
            transition: color 0.15s ease, text-shadow 0.15s ease;
            pointer-events: auto;
        }

        footer .legal .powered-by a:hover {
            color: var(--site-accent);
            text-shadow: 0 0 6px var(--site-accent);
            background-image: repeating-linear-gradient(
                to right,
                var(--site-accent) 0 0.3em,
                transparent 0.3em 0.45em
            );
            background-size: 0.45em 1px;
            background-position: bottom left;
            background-repeat: repeat-x;
        }

        /* MOBILE */

        @media (max-width: 540px) {
            header .brand h1 { font-size: 1.45rem; }
        }

        /* NO-JS */

        /* Hidden by default. The <noscript> block below overrides to
           display: flex when JS is disabled. */
        .no-js-backdrop { display: none; }
    </style>

    <!-- No-JS fallback. Only runs when JavaScript is disabled; the
         browser ignores this entire block when JS is on. Hides the
         loader (which never receives .hidden) and shows the fallback
         card. Structure mirrors the site card pattern and the
         siteShowError overlay. -->
    <noscript>
        <style>
            #siteLoader { display: none !important; }

            /* BACKDROP */

            .no-js-backdrop {
                position: fixed;
                inset: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: var(--site-gap);
                box-sizing: border-box;
                background: var(--site-bg);
            }

            /* CARD */

            .no-js-card {
                width: 100%;
                max-width: 22rem;
            }

            .no-js-card .core-panel-content {
                padding: 1.5rem 1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 1.25rem;
            }

            /* CANVAS */

            .no-js-canvas {
                width: 10rem;
                height: 10rem;
                border: 1px dashed var(--panel-border);
                border-radius: 0.125rem;
                background: rgba(15, 15, 15, 0.92);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .panel-light .no-js-canvas {
                background: rgba(255, 255, 255, 0.95);
            }

            .no-js-pixel-grid {
                display: grid;
                grid-template-columns: repeat(7, 1rem);
                grid-template-rows: repeat(4, 1rem);
                gap: 0;
            }

            .no-js-pixel-cell {
                width: 1rem;
                height: 1rem;
                background: transparent;
            }

            .no-js-pixel-cell[data-filled] {
                background: var(--site-fg);
            }

            /* DIVIDER */

            .no-js-divider {
                width: 5rem;
                height: 1px;
                background-image: repeating-linear-gradient(
                    to right,
                    var(--panel-border) 0 0.5rem,
                    transparent 0.5rem 0.75rem
                );
                background-size: 0.75rem 1px;
                background-position: bottom left;
                background-repeat: repeat-x;
                opacity: 0.7;
            }

            /* MESSAGE */

            .no-js-message {
                text-align: center;
                max-width: 20rem;
                color: var(--panel-text);
            }

            .no-js-headline {
                font-size: 1.2rem;
                font-weight: 400;
                letter-spacing: 0.04em;
                line-height: 1.35;
                margin: 0 0 0.5rem 0;
                color: var(--panel-text);
            }

            .no-js-accent {
                color: var(--panel-accent);
                font-weight: 600;
            }

            .no-js-body {
                font-size: 0.9rem;
                opacity: 0.72;
                line-height: 1.55;
                color: var(--panel-text);
                margin: 0;
            }

            .no-js-body + .no-js-body {
                margin-top: 0.5rem;
            }

            .no-js-body a {
                color: var(--panel-accent);
                text-decoration: none;
                padding-bottom: 0.125rem;
                background-image: repeating-linear-gradient(
                    to right,
                    currentColor 0 0.3em,
                    transparent 0.3em 0.45em
                );
                background-size: 0.45em 1px;
                background-position: bottom left;
                background-repeat: repeat-x;
            }

            .no-js-body a:hover {
                text-shadow: 0 0 6px var(--panel-accent);
            }
        </style>
    </noscript>
</head>
<body class="site-dark">

    <!-- No-JS fallback. First child of body so screen readers and
         text-only clients hit it before the empty shells.
         Replace "YourEmail" below with your contact. setup.sh replaces
         it with an entity-encoded form (&#64;, &#46;) that defeats
         scrapers that grep for plaintext; manual replacement with a
         plain address works but is not obfuscated.
         Pixel pattern mirrors SITE_CONFIG.errorPixelPattern; if you
         change one, change both. -->
    <div class="no-js-backdrop">
        <div class="core-panel panel-dark no-js-card">
            <div class="core-panel-content">

                <!-- CANVAS -->
                <div class="no-js-canvas" aria-hidden="true">
                    <div class="no-js-pixel-grid">
                        <!-- Row 1 -->
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <!-- Row 2 -->
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <!-- Row 3 -->
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <!-- Row 4 -->
                        <div class="no-js-pixel-cell" data-filled></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell"></div>
                        <div class="no-js-pixel-cell" data-filled></div>
                    </div>
                </div>

                <!-- DIVIDER -->
                <div class="no-js-divider" aria-hidden="true"></div>

                <!-- MESSAGE -->
                <div class="no-js-message">
                    <p class="no-js-headline">
                        This site requires <span class="no-js-accent">JavaScript</span>.
                    </p>
                    <p class="no-js-body">
                        Enable it to view the site content.
                    </p>
                    <p class="no-js-body">
                        Or reach out at
                        <a href="mailto:YourEmail">YourEmail</a>.
                    </p>
                </div>

            </div>
        </div>
    </div>

<?php
/**
 * Inline module data. Each JSON file is emitted as:
 *   <script type="application/json" id="data-{id}">...</script>
 *
 * IDs derived from urlToInlineId() in core/utils.js:
 *   /data/site.json             -> data-site
 *   /data/modules.json          -> data-modules
 *   /data/card.json             -> data-card
 *   /data/blog.json             -> data-blog
 *   /data/blog/about.json       -> data-blog-about
 *
 * Core data (site.json, modules.json) is always inlined. Per-module
 * data is inlined only when the module is listed in data/modules.json.
 * Missing files are skipped silently. The {year} placeholder is
 * replaced at request time.
 */

/* INLINE HELPER
   Emits one inline <script> tag for a JSON file. No-op if missing. */
function inline_json($path, $id) {
    if (!is_readable($path)) return;
    $raw = file_get_contents($path);
    $raw = str_replace('{year}', date('Y'), $raw);
    echo '<script type="application/json" id="data-'
       . htmlspecialchars($id, ENT_QUOTES)
       . '">' . $raw . '</script>' . "\n";
}

/* CORE DATA - always inlined */
inline_json(__DIR__ . '/data/site.json',    'site');
inline_json(__DIR__ . '/data/modules.json', 'modules');

/* MODULE DATA - inline for each active module
   Flat:   data/<name>.json      -> data-<name>
   Subdir: data/<name>/*.json    -> data-<name>-<basename> */
foreach ($activeModules as $name) {
    inline_json(__DIR__ . '/data/' . $name . '.json', $name);

    $subdir = __DIR__ . '/data/' . $name;
    if (is_dir($subdir)) {
        foreach (glob($subdir . '/*.json') ?: [] as $file) {
            $basename = basename($file, '.json');
            inline_json($file, $name . '-' . $basename);
        }
    }
}
?>

    <!-- HEADER. Brand starts hidden; app.js reveals it if site.json has
         a title or tagline. -->
    <header>
        <div class="brand">
            <h1 style="display:none">YourProject</h1>
            <p style="display:none">YourTagline</p>
        </div>
    </header>

    <main>
        <!-- MODULE. Panels mount here. -->
        <div id="module" class="panel-dark">
            <!-- Panels are inserted dynamically -->
        </div>

        <!-- LOADER. Covers the viewport during boot. Hidden by app.js
             once init and animation both settle, or immediately when a
             URL error short-circuits it. -->
        <div id="siteLoader">
            <div class="site-loader-pixels" id="siteLoaderPixels"></div>
        </div>
    </main>

    <!-- FOOTER. .taskbar mounts the taskbar; .legal is a fallback,
         app.js replaces its content from site.json. -->
    <footer>
        <div class="taskbar"></div>
        <div class="legal">
            <div class="copyright" style="display:none">&copy; <?php echo date('Y'); ?> YourProject&trade;</div>
            <div class="powered-by" style="display:none">Powered by <a href="https://antranik.dev" target="_blank" rel="noopener">Antranik.dev</a></div>
        </div>
    </footer>

    <script>
        /**
         * Pre-module boot: SITE_CONFIG, initial theme, loader animation,
         * URL error detection, and the fallback error overlay used only
         * when js/app.js fails to load.
         *
         * On ?error=NNN: sets window._urlErrorCode, hides the loader,
         * and returns early. app.js reads the flag after boot, shows the
         * ErrorDialog panel, then strips the query param.
         *
         * The overlay functions below have no module dependency. They
         * exist for the case where app.js itself never runs.
         */

        (function() {
            'use strict';

            /* SITE CONFIG */

            const SITE_CONFIG = {
                brandLogo: 'YourProject',
                brandName: 'YourProject',
                tagline: 'YourTagline',
                enableSiteLoader: true,

                /* Error pixel grid. Pattern length must be a multiple of
                   errorPixelCols. no-JS fallback hardcodes the same
                   pattern via data-filled markers; keep them in sync. */
                errorPixelCols: 7,
                errorPixelPattern: [
                    0,0,0,1,0,0,0,
                    0,0,1,0,1,0,0,
                    0,1,0,0,0,1,0,
                    1,0,0,0,0,0,1
                ],
                errorMessages: {
                    '400': 'Bad request. Please check the URL and try again.',
                    '401': 'Unauthorized. You need to log in to access this page.',
                    '403': 'Forbidden. You don\u2019t have permission to view this resource.',
                    '404': 'Page not found. The page you\u2019re looking for doesn\u2019t exist.',
                    '500': 'Internal server error. Something went wrong on our end.'
                },
                errorContainer: 'main',

                loaderPixelCount: 7
            };

            window._siteErrorMessages = SITE_CONFIG.errorMessages;
            window._siteLoaderEnabled = SITE_CONFIG.enableSiteLoader;

            window._hasUrlError = false;
            window._urlErrorCode = null;

            window._onAppLoadError = function () {
                siteShowErrorByCode(window._urlErrorCode || '500');
            };

            /* LOADER STATE */

            const siteLoader = document.getElementById('siteLoader');
            const siteLoaderPixelsContainer = document.getElementById('siteLoaderPixels');
            const siteLoaderPixels = [];

            if (SITE_CONFIG.enableSiteLoader) {
                const fragment = document.createDocumentFragment();
                for (let i = 0; i < SITE_CONFIG.loaderPixelCount; i++) {
                    const pixel = document.createElement('div');
                    pixel.className = 'site-loader-pixel';
                    pixel.dataset.index = i;
                    fragment.appendChild(pixel);
                    siteLoaderPixels.push(pixel);
                }
                siteLoaderPixelsContainer.appendChild(fragment);
            }

            /* ERROR OVERLAY */

            /* Only fires when js/app.js fails to load. */

            /**
             * Build and mount the fallback overlay. Structure mirrors the
             * site card pattern: canvas (pixel pattern + badge) ->
             * divider -> message, wrapped in .core-panel for the frame.
             *
             * @param {HTMLElement} container - SITE_CONFIG.errorContainer.
             * @param {string|number} code - Shown as badge label.
             * @param {string} message - Body text below the divider.
             */
            function siteShowError(container, code, message) {
                if (!container) return;
                const existing = container.querySelector('.site-error');
                if (existing) existing.remove();

                for (const child of container.children) {
                    if (!child.classList.contains('site-error')) child.style.display = 'none';
                }

                const themeWidget = document.getElementById('themeSelector');
                if (themeWidget) themeWidget.remove();
                const windowTaskbar = document.getElementById('windowTaskbar');
                if (windowTaskbar) windowTaskbar.remove();

                const pattern = SITE_CONFIG.errorPixelPattern;
                const cols = Number.isInteger(SITE_CONFIG.errorPixelCols) && SITE_CONFIG.errorPixelCols > 0
                    ? SITE_CONFIG.errorPixelCols
                    : 5;
                const rows = Math.ceil(pattern.length / cols);

                const overlay = document.createElement('div');
                overlay.className = 'site-error';

                const card = document.createElement('div');
                card.className = 'core-panel panel-dark site-error-card';

                const content = document.createElement('div');
                content.className = 'core-panel-content';

                const canvas = document.createElement('div');
                canvas.className = 'site-error-canvas';
                canvas.setAttribute('aria-hidden', 'true');

                const grid = document.createElement('div');
                grid.className = 'site-error-grid';
                grid.style.gridTemplateColumns = `repeat(${cols}, 1rem)`;
                grid.style.gridTemplateRows = `repeat(${rows}, 1rem)`;

                for (let i = 0; i < pattern.length; i++) {
                    const pixel = document.createElement('div');
                    pixel.className = 'site-error-pixel' + (pattern[i] ? ' on' : '');
                    if (pattern[i]) {
                        pixel.style.animationDelay = (Math.random() * 0.8) + 's';
                    }
                    grid.appendChild(pixel);
                }
                canvas.appendChild(grid);

                const badgeEl = document.createElement('span');
                badgeEl.className = 'site-error-badge';
                badgeEl.textContent = 'Error ' + String(code);
                canvas.appendChild(badgeEl);

                content.appendChild(canvas);

                const divider = document.createElement('div');
                divider.className = 'site-error-divider';
                divider.setAttribute('aria-hidden', 'true');
                content.appendChild(divider);

                const msgEl = document.createElement('div');
                msgEl.className = 'site-error-message';
                msgEl.textContent = message;
                content.appendChild(msgEl);

                card.appendChild(content);
                overlay.appendChild(card);
                container.appendChild(overlay);
                if (siteLoader) siteLoader.classList.add('hidden');
            }

            /**
             * Resolve the message by code and delegate to siteShowError.
             * @param {string|number} code
             */
            function siteShowErrorByCode(code) {
                const container = document.querySelector(SITE_CONFIG.errorContainer);
                const message = SITE_CONFIG.errorMessages[code] || 'An unexpected error occurred.';
                siteShowError(container, code, message);
            }

            window.siteShowError = siteShowErrorByCode;

            /* THEME */

            (function siteApplyInitialTheme() {
                const saved = localStorage.getItem('siteTheme');
                const theme = saved || 'dark';
                document.body.classList.remove('site-dark', 'site-light');
                document.body.classList.add(theme === 'light' ? 'site-light' : 'site-dark');
            })();

            /**
             * Keep <meta name="theme-color"> in sync with the saved site
             * theme. Without this, the mobile browser chrome shows the
             * wrong color when OS preference and saved theme disagree.
             */
            (function siteUpdateThemeColor() {
                const meta = document.querySelector('meta[name="theme-color"]');
                if (!meta) return;

                const applyThemeColor = () => {
                    const bg = getComputedStyle(document.body)
                        .getPropertyValue('--site-bg')
                        .trim();
                    if (bg) meta.setAttribute('content', bg);
                };

                applyThemeColor();

                new MutationObserver(applyThemeColor).observe(document.body, {
                    attributes: true,
                    attributeFilter: ['class'],
                });
            })();

            /* URL ERRORS */

            /**
             * Detect ?error=NNN and set the boot flag. app.js reads it
             * after boot and opens the ErrorDialog panel.
             * @returns {boolean} True when a code was found.
             */
            function siteCheckErrorFromURL() {
                const params = new URLSearchParams(window.location.search);
                const code = params.get('error');
                if (code && SITE_CONFIG.errorMessages[code]) {
                    window._urlErrorCode = code;
                    window._hasUrlError = true;
                    if (siteLoader) siteLoader.classList.add('hidden');
                    return true;
                }
                return false;
            }

            if (siteCheckErrorFromURL()) return;

            /* LOADER PHASES */

            /**
             * Parse a CSS time value to milliseconds.
             * @param {string} value
             * @returns {number}
             */
            function siteLoaderParseDelay(value) {
                if (!value) return 0;
                value = value.trim();
                if (value.endsWith('ms')) return parseFloat(value);
                if (value.endsWith('s')) return parseFloat(value) * 1000;
                return parseFloat(value) || 0;
            }

            /**
             * Style each pixel after step * delay ms, in random order.
             * @param {Function} styleFn
             * @param {string} delayProp - CSS custom property name.
             * @param {Function} [callback]
             */
            function siteLoaderRunPixelSequence(styleFn, delayProp, callback) {
                const order = Array.from({ length: SITE_CONFIG.loaderPixelCount }, (_, i) => i);
                for (let i = order.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [order[i], order[j]] = [order[j], order[i]];
                }
                const delay = siteLoaderParseDelay(
                    getComputedStyle(document.documentElement).getPropertyValue(delayProp)
                );
                order.forEach((idx, step) => {
                    setTimeout(() => styleFn(siteLoaderPixels[idx]), step * delay);
                });
                if (callback) setTimeout(callback, order.length * delay);
            }

            /**
             * Phase 1: pixels fade in and scale up one by one in random order.
             */
            function siteLoaderPhaseAppear() {
                siteLoaderRunPixelSequence(
                    (pixel) => { pixel.style.opacity = '1'; pixel.style.transform = 'scale(1)'; },
                    '--site-loader-pixel-appear-delay',
                    () => siteLoaderPhaseWave()
                );
            }

            /**
             * Phase 2: staggered pulse.
             */
            function siteLoaderPhaseWave() {
                const waveStagger = parseFloat(getComputedStyle(document.documentElement)
                    .getPropertyValue('--site-loader-pixel-wave-stagger')) || 0.08;
                for (let i = 0; i < siteLoaderPixels.length; i++) {
                    siteLoaderPixels[i].style.animationDelay = (i * waveStagger) + 's';
                }
                siteLoader.classList.add('loader-wave');
                window._siteLoaderWaveStarted = true;
            }

            /**
             * Phases 3 and 4: settle, hold, disappear. Dispatches
             * loaderAnimationDone on window when complete.
             */
            function siteLoaderPhaseSettleDisappear() {
                siteLoader.classList.remove('loader-wave');
                for (const pixel of siteLoaderPixels) {
                    pixel.style.animationDelay = '0s';
                    pixel.style.transform = 'scale(1)';
                    pixel.style.opacity = '1';
                }
                const endDelayStr = getComputedStyle(document.documentElement)
                    .getPropertyValue('--site-loader-end-delay').trim();
                const endDelay = siteLoaderParseDelay(endDelayStr);
                setTimeout(() => {
                    siteLoaderRunPixelSequence(
                        (pixel) => { pixel.style.opacity = '0'; pixel.style.transform = 'scale(0.7)'; },
                        '--site-loader-pixel-disappear-delay',
                        () => window.dispatchEvent(new CustomEvent('loaderAnimationDone'))
                    );
                }, endDelay);
            }

            /* BOOT */

            if (SITE_CONFIG.enableSiteLoader) {
                siteLoaderPhaseAppear();
                Promise.all([
                    document.fonts.ready,
                    new Promise(resolve => window.addEventListener('load', resolve))
                ]).then(() => {
                    function siteLoaderCheckWaveAndProceed() {
                        if (window._siteLoaderWaveStarted) {
                            const minWaveTime = 600;
                            setTimeout(siteLoaderPhaseSettleDisappear, minWaveTime);
                        } else {
                            setTimeout(siteLoaderCheckWaveAndProceed, 50);
                        }
                    }
                    siteLoaderCheckWaveAndProceed();
                });
            } else {
                if (siteLoader) {
                    siteLoader.style.transition = 'none';
                    siteLoader.classList.add('hidden');
                }
            }
        })();
    </script>

    <script type="module" src="/js/app.js" onerror="window._onAppLoadError?.()"></script>
</body>
</html>