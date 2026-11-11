# Pixelian

> Last updated: `20261111`
> Version: `1.0.0`
> Author: Antranik Agopian <hello@antranik.dev>
> License: Antranik License 1.0 (see [LICENSE](LICENSE))

Frontend foundation for PHP projects. Core primitives, a dynamic module system, and the Card module. Ships as static JS + CSS with a minimal PHP entry point.
**Details** live in the code: every `.js` file has a full JSDoc header with signatures and inline comments on non-obvious logic. This guide is the map; the code is the territory.

---

## 1. Overview

```yaml
architecture:
  type: "Module-based"
  core: "Always in Pixelian"
  modules: "Optional per deployment (config in data/modules.json)"
  releases: "Version-bumped on every release (MAJOR.MINOR.PATCH)"

core:
  - Panel
  - Window
  - Taskbar
  - Events
  - Theme
  - ErrorDialog
  - Api
  - Sanitize
  - Utils

modules:
  card:
    - "Headerless panel driven by /data/card.json"
    - "Demonstrates the module pattern; replace or extend as needed"

license: "Terms covered in LICENSE"
```

### 1.1 Quick Start

```bash
# FIRST RUN
./setup.sh              # Prompts for project details, fills the Your*
                        #   placeholders across index.php, data/*.json,
                        #   robots.txt, sitemap.xml, site.webmanifest.
                        #   Idempotent: exits early if already configured.
                        #   Requires PHP 8.4.27+.
                        #   Warns if nginx < 1.26.3 is found (soft check -
                        #   local dev uses php -S, nginx is production).

# Or manually edit each file. Find every placeholder with:
#   grep -rn "Your[A-Z]" --include="*.php" --include="*.json" .
#   grep -rn "Your[A-Z]" robots.txt sitemap.xml site.webmanifest

# THEN REVIEW
/index.php              # <title>, meta, OG tags, SITE_CONFIG (§5.4)
/data/site.json         # Brand, tagline, footer, copyright
/data/card.json         # Card content
/data/modules.json      # Active module list, e.g. {"modules": ["card"]}
                        #   Add module names here (see §8.2)
/icons/                 # Replace template favicon with your own set
/media/                 # Project GIFs, OG image, client logos

# LOCAL DEV
php -S localhost:8000
# open http://localhost:8000
# (php -S serves index.php for / only. Pixelian has no path routing, so
#  every other path 404s locally. Card renders at /.)

# WHEN YOU ADD OR MODIFY FILES
#   New files you create keep @copyright and use your name as @author:
#       @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
#       @author {YourName} <{your@email}>
#   Modified files keep both lines and add @modified-by:
#       @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
#       @author Antranik Agopian <hello@antranik.dev>
#       @modified-by {YourName} <{your@email}> on {YYYY-MM-DD}
#   See §3.3 for the full policy.

# RESET PERSISTED STATE
Reset all               # localStorage.clear(); location.reload();
Reset one window        # localStorage.removeItem('panel:{id}:state');
                        #   location.reload();
# Card is not draggable - no panel:{id}:state, no reset needed for it.

# DEBUG
window.getLoadedModules({ logToConsole: true })   # Module registry dump
                                                  # See §10 for options

# PRODUCTION DEPLOY
#   See §9. The deploy checklist includes the full cleanup step:
#   delete setup.sh, nginx.example.conf, non-runtime files, docs.
```

### 1.2 Boot Sequence

```bash
# 1. index.php inline <script>
#    - read saved site theme, apply body class (no FOUC)
#    - check URL for ?error=<code> -> set window._urlErrorCode
#      (and window._hasUrlError = true)
#    - if URL error: hide loader, skip animation, exit early
#    - build loader pixels, start wave (if enabled)

# 2. <script type="module" src="/js/app.js"> loads

# 3. app.js top-level
#    - registerCore(CORE_VERSION, CORE_CODE_NAME)
#    - const TASKBAR = new TaskbarManager({ target: '.taskbar' })
#    - new ThemeSelector({ target: TASKBAR.widgetSlot, position: 'first' })
#    - const INIT_PROMISE = initApp() (parallel with loader animation)

# 4. initApp()
#    - fetchSiteData() -> apply header/footer bindings
#    - MODULE_LIST is resolved dynamically: js/modules/index.js reads
#      data/modules.json (e.g. ["card"]) and imports each module's
#      manifest.js
#    - for each resolved module entry in parallel:
#        read /data/{name}.json (inline first)
#        assertRequirements(name, version, requiresCore, deps, primitives)
#        mod.init(data)

# 5. Loader hidden when:
#    - no URL error AND initPromise + loaderAnimationDone both settle
#    - OR _urlErrorCode was set (skip animation wait)
#    - OR _siteLoaderEnabled === false (skip entirely)
#    - Promise.allSettled so a rejected initApp cannot strand the loader

# 6. Card module init (parallel with loader fade)
#    - panel.css and card.css already in <head> (core stylesheet +
#      module CSS auto-injected from data/modules.json)
#    - build a headerless Panel (showHeader: false)

# LOADER PHASES (index.php inline script)
#    appear    siteLoaderPhaseAppear           -> wave
#              Random-order pixel reveal
#              --site-loader-pixel-appear-delay (100ms)
#    wave      siteLoaderPhaseWave             sets _siteLoaderWaveStarted
#              Staggered pulse
#              --site-loader-pixel-wave-duration (0.8s)
#              --site-loader-pixel-wave-stagger (0.08s)
#    settle    siteLoaderPhaseSettleDisappear  waits --site-loader-end-delay
#              Resets pixels to full opacity
#              Requires min 600ms wave first
#    disappear siteLoaderPhaseSettleDisappear  dispatches loaderAnimationDone
#              Random-order pixel fade
#              --site-loader-pixel-disappear-delay (120ms)
#
# Waits for document.fonts.ready + window load, then requires a minimum
# 600ms wave before settling.

# GLOBAL STATE
window._siteLoaderEnabled        # read by app.js to skip loader
window._siteLoaderWaveStarted    # set by inline loader once wave begins
window._urlErrorCode             # set by index.php inline script
                                 #   (siteCheckErrorFromURL) when ?error=NNN
window._hasUrlError              # set by index.php inline script alongside
                                 #   _urlErrorCode; read by app.js to skip
                                 #   the module-failure ErrorDialog
window._siteErrorMessages        # error code -> message map (SITE_CONFIG)
window.__SITE_DATA__             # parsed data/site.json
window._onAppLoadError()         # <script onerror> handler
window.siteShowError(code)       # backward-compatible alias
window.siteShowErrorByCode(code) # convenience wrapper (resolves message)
window.siteInit()                # re-dispatch loaderFinished once _appReady
window.getLoadedModules(opts)    # version registry dump (see §10)

# FALLBACK OVERLAY (only fires when js/app.js fails to load)
siteShowError(container, code, message)
                                 # Internal builder. Grid shape from
                                 #   SITE_CONFIG.errorPixelCols +
                                 #   errorPixelPattern. Hides loader.
siteShowErrorByCode(code)        # Resolves message from errorMessages,
                                 #   calls siteShowError
window.siteShowError             # Aliased to siteShowErrorByCode
window._onAppLoadError()         # <script onerror> handler on app.js tag
                                 #   Falls back to _urlErrorCode if set,
                                 #   otherwise 500
```

### 1.3 Scope

Pixelian is a foundation, not a finished application. What it intentionally does not include:

- **Path routing** - no `/help`, `/about`, or other path-based entry points. Add a resolver if you want deep-linking.

- **Server-side API** - `core/api.js` is ready, but no backend ships in Pixelian. Implement your own `/api/*` endpoints.

- **Authentication** - no auth wiring. Wire your own session/CSRF on top of the existing meta tag + cookie pattern (see §4.3).

- **Additional modules** - only Card ships. Add your own under `js/modules/` and register them in `data/modules.json` (see §8.2).

Pixelian provides the primitives to build these on top. What you build, how you build it, and when you ship it is up to you.

## 2. Requirements

> Tested on the exact versions below. Newer patch/minor versions in the same major line work; older versions may work but are not verified. `setup.sh` hard-fails on PHP below 8.4.27 and warns on nginx below 1.26.3.

### 2.1 Frontend

```yaml
firefox: "153.6.0"
chrome: "157.0.8103.38"
```

### 2.2 Backend

```yaml
PHP: "8.4.27"
nginx: "1.26.3"
```

## 3. Coding Standards

### 3.1 Units

```bash
# REM
font-size        # Scales with the user's browser font-size
margin
padding
gap
border-radius
width
height
min
max
                 # Example: padding: 1.5rem 1rem;

# EM
                 # Only when scoped to the parent's font-size
                 # Example: .brand h1 { padding-bottom: 0.3em }

# PX
border-width     # Pixel-perfect values that must not scale
scrollbar-size
box-shadow       # Offsets
media-queries    # Breakpoints
                 # Example: border: 1px solid var(--panel-border);
```

### 3.2 Naming

```bash
# JS
Class            # PascalCase - Panel, Window, ErrorDialog
Factory          # init + Class - initCard
Method           # camelCase - show, setTitle, appendContent
Private          # _ + camelCase - _applyCenter, _saveState
Constant         # UPPER_SNAKE_CASE - DEFAULT_RULES, MODULE_LIST, FALLBACK_WIDTH
State            # _ + camelCase - module-scope mutable state
                 #   _zIndexCounters, _jsonCache, _urlErrorDialog, _registry,
                 #   _seed, _appReady
                 #   The _ prefix signals "not exported"
Directory        # lowercase, single word - core, modules
File             # lowercase, dot-separated - api.js, version-registry.js

# CSS
Module root      # .module-{name} - .module-error-panel
Module part      # .module-{name}-{part} - .module-error-message
Module state     # .module-{name}.is-{state} - convention for your own
                 #   modules (Pixelian ships none)
Shared state     # .is-{state} - .core-panel-window.is-minimized
Utility          # .{scope}-{part} - .module-error-message
Variable         # --{scope}-{part} - --site-bg, --panel-accent
Type scale       # --fs-{scope}-{tier} - --fs-ui-sm
Data attribute   # data-{name} - data-status, data-cmd

# JSON
Field            # camelCase - launchDate, showBrand, poweredBy
```

### 3.3 Comments

```bash
# FILE HEADER - one per .js, .css, and .php file
                 /**
                  * Description prose, one or two sentences. WHAT this
                  * file is for and WHY it exists. Reference related
                  * files by path when helpful.
                  *
                  * @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
                  * @author {YourName} <{your@email}>
                  */

# SHELL SCRIPT HEADER - every .sh file
                 #!/bin/bash
                 # Description prose.
                 #
                 # @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
                 # @author {YourName} <{your@email}>
                 # @version 1.0.0

# INLINE PHP BLOCKS - index.php top comment only
                 # The same header rules apply to the FIRST comment
                 #   block of index.php, the one that opens the file
                 #   after the php opening tag.
                 # Section-marker comments INSIDE index.php do not
                 #   carry their own @copyright/@author. Those are:
                 #     /* MODULE CONFIG */
                 #     /* RESOLVE ACTIVE MODULES */
                 #     /** Inline module data... */
                 #   They are internal structure of a file that already
                 #   has one header at the top. Adding attribution to
                 #   each would repeat the same three lines 3-4 times
                 #   per file.
                 # The same rule applies to any large .php file:
                 #   attribution once at the top, not per section.
```

```bash
# @copyright SEMANTICS
                 # @copyright names the copyright holder and license
                 #   type. Ships unchanged in every file:
                 #     Antranik Agopian owns the template code.
                 # Keep this line in every file you redistribute,
                 #   including files you modify. See LICENSE §2.a
                 #   and §2.c.
                 # Do not change @copyright to your own name. The
                 #   template code is Antranik's work even after you
                 #   modify it. Attribution to the original author is
                 #   a license requirement, not a stylistic choice.
                 #   Your contribution is recorded in @author (new
                 #   files) or @modified-by (modified files).
```

```bash
# @author SEMANTICS
                 # @author names the AUTHOR OF THE FILE.
                 # Template files ship with:
                 #   @author Antranik Agopian <hello@antranik.dev>
                 # because Antranik wrote them. Those lines are
                 #   correct as-shipped.
                 #
                 # CO-AUTHORED FILES
                 # If two or more people meaningfully wrote a file,
                 #   use one @author line per person. Order: whoever
                 #   contributed most, first. If 50/50, whoever
                 #   started the file, first.
                 #   Example:
                 #     @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
                 #     @author Antranik Agopian <hello@antranik.dev>
                 #     @author Jane Doe <jane@example.com>
                 #
                 # MODIFYING SOMEONE ELSE'S FILE
                 # Keep the original @copyright and @author lines
                 #   unchanged. Add one @modified-by line per modifier,
                 #   with the date of change.
                 #   Example:
                 #     @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
                 #     @author Antranik Agopian <hello@antranik.dev>
                 #     @modified-by Jane Doe <jane@example.com> on 2026-11-15
                 # This satisfies the attribution requirement of
                 #   LICENSE §2.c and maintains an honest history.
                 #
                 # NEW FILES YOU CREATE
                 # Retain the @copyright line (required by LICENSE §2.c)
                 #   to indicate the file belongs to a Pixelian-derived
                 #   project. Your original contributions remain your
                 #   copyright.
                 # Use YOUR name and email in @author:
                 #     @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
                 #     @author {YourName} <{your@email}>
                 #   e.g. @author Jane Doe <jane@example.com>
                 # Do NOT copy @author Antranik Agopian <hello@antranik.dev>
                 #   into a file you wrote from scratch. It is a lie
                 #   about authorship.
                 #
                 # NON-CODE CONTRIBUTIONS
                 # People who helped conceptually (design discussions,
                 #   code reviews, debugging sessions, bug reports)
                 #   without authoring code go in a CREDITS.md file at
                 #   the repo root, not in file headers.
```

```bash
# ATTRIBUTION TIER
                 # The LICENSE requires different footer text
                 #   depending on whether the shipped code was modified
                 #   (see LICENSE §2.d).
                 #
                 # UNMODIFIED - "Powered by Antranik.dev"
                 #   Trigger: no shipped code file ("*.js", "*.css",
                 #     "index.php") contains a @modified-by line.
                 #   Configuration edits (data/*.json, robots.txt,
                 #     sitemap.xml, site.webmanifest) and setup.sh
                 #     placeholder substitution do NOT count.
                 #   Adding new files (custom modules, new CSS, new
                 #     data) does NOT count.
                 #   The default data/site.json already satisfies this.
                 #
                 # MODIFIED - "Extends Antranik.dev"
                 #   Trigger: any shipped code file contains a
                 #     @modified-by line.
                 #   Editing one line in a shipped stylesheet
                 #     switches the tier.
                 #   Update data/site.json -> poweredBy to reflect it:
                 #     "Powered by Antranik.dev" -> "Extends Antranik.dev"
                 #
                 # The @modified-by line is the machine-checkable test.
                 # No grep automation ships with the template - this is
                 #   a discipline, not an enforcement.
```

```bash
# PUBLIC METHOD - JSDoc @param + @returns
                 /**
                  * Set the header title. No-op when showHeader was false.
                  * @param {string} text - New title.
                  * @returns {Panel} This panel (for chaining).
                  */
                 setTitle(text) { ... }

# PRIVATE METHOD - one-line block comment
                 /* Build the localStorage key for this window's saved state. */
                 _storageKey() { ... }

# LOGIC BLOCK - explain WHY, not WHAT
                 /* Reject rollovers: 2026-02-31 silently becomes
                    March 3 without this check. */
                 if (date.getMonth() !== m - 1) return null;

# SECTION DIVIDER - group related code (see §3.4)
                 /* ASYNC */
                 /* DATES */
                 /* PUBLIC API */
```

### 3.4 Category Dividers

```bash
# FORMAT
ALL CAPS         # Not mixed case, not sentence case
1-2 words        # Max two words
No parens        # No (internal) qualifier
                 # Examples: CONSTANTS, STATE, PUBLIC API, DATES, ASYNC

# NO DECORATION
                 # Do NOT use decorative dashes, equals signs, or
                 # asterisk borders around the label.
                 #   Wrong: /* ----- ASYNC ----- */
                 #   Wrong: # ===== PREREQUISITES =====
                 #   Right: /* ASYNC */
                 #   Right: # PREREQUISITES
                 # The label alone is the divider.

# SCOPE
                 # Every file with more than one concern gets dividers
                 # Single-concern files skip dividers (e.g. a file exporting
                 # only constants)

# PUBLIC API
                 # Default category for exports
                 # Use a more specific category (CONSTANTS, STATE, REGISTRY,
                 # ERROR CLASS, ERROR MESSAGES, URL ERRORS, EVENTS, etc.)
                 # when one fits better
                 # Category name describes what the item IS, not just
                 # that it is exported

# ORDER
                 # Logical flow within categories
                 # Dependency flow across categories
                 # Simplest first, lowest-level first
```

```bash
# PUBLIC API = the exported names of a file.
#
# `export` is the boundary. Any name with `export` can be imported by
# other files. Any name without `export` cannot.
#
#   export function wait(ms) { ... }      <- public (importable)
#   function step() { ... }               <- private
#   export const EVENTS = new Events();   <- public
#   const _listeners = new Map();         <- private
#
# "Public" does NOT mean:
#   - visible to the end user (all JS ships to the browser)
#   - documented (an export is public whether documented or not)
#   - stable (breaking an export is a version bump, not a violation)
#
# "Public" DOES mean:
#   - any other file can `import` it
#   - renaming or removing it breaks callers
#   - its JSDoc header is the contract callers rely on
```

## 4. Global Rules

Rules that apply everywhere. Read once, reference per module.

### 4.1 Dates

```bash
# FORMAT BY CONTEXT
Static JSON      # data/*.json values
                 #   YYYYMMDD or YYYY-MM-DD
                 #   Examples: 20261112, 2026-11-12
API response     # GET /api/* responses
                 #   Full ISO 8601 with timezone
                 #   Example: 2026-11-12T12:00:00Z
                 #   Why: core/api.js responses are consumed by
                 #   new Date() in the frontend, which parses ISO 8601
                 #   reliably. YYYYMMDD returns Invalid Date on Firefox
                 #   and Safari.
Times            # HH:MM or HH:MM:SS (local)
                 #   Examples: 12:00, 12:00:30

# PARSING
parseDate()      # YYYYMMDD, YYYY-MM-DD, full ISO 8601, Date, epoch
                 #   YYYYMMDD and YYYY-MM-DD resolve to LOCAL midnight
                 #   Full ISO 8601 with time preserves exact instant
                 #   Rollovers rejected (Feb 31, month 13 -> null)
parseDateTime()  # Combine date + 'HH:MM[:SS]' (local)

# ROLLOVERS
Rollover dates   # Impossible calendar dates rejected, render blank, no crash
                 #   Examples: 20260231 (Feb 31), 20261301 (month 13)
                 #   Why: JS new Date(2026, 1, 31) silently returns March 3.
                 #   parseDate() catches this by comparing month/day back
                 #   and returns null.
                 #   Backend generating real dates never hits this.
                 #   Hand-crafted strings must be real dates.
```

### 4.2 HTML Sanitization

```bash
# PRINCIPLE
Frontend         # Sanitizes as defense in depth
Backend          # MUST sanitize first. Do not rely on the frontend to
                 # catch your bugs. The safe version is whatever survives
                 # the frontend pass.

# WHEN TO SANITIZE
Rule             # Sanitize any HTML that reaches innerHTML from an
                 # untrusted source. Card uses textContent, so card
                 # content needs no sanitization. Any module you add
                 # that renders HTML from a backend or user input
                 # MUST pass through sanitizeHTML() first.

# RULES PRIORITY
sanitizeHTML()   # caller rules (code) > JSON override > DEFAULT_RULES

# DEFAULT ALLOW-LIST (DEFAULT_RULES in sanitize.js)
allowed_tags     # p, br, hr, h1-h6, ul, ol, li, strong, em, b, i, u, s,
                 #   del, ins, a, code, pre, blockquote
allowed_attrs    # a: href, title
forbidden        # javascript, data, vbscript, file
                 #   Always stripped regardless of allowedProtocols override
anchor_defaults  # rel="noopener noreferrer" target="_blank"
                 #   Forced on every <a> after sanitization

# URL FIELDS
Rule             # URL fields that feed an href or a redirect are NOT
                 #   sanitized by sanitizeHTML - they do not pass through
                 #   innerHTML. When a URL comes from a data file or a
                 #   backend response, validate it server-side to
                 #   http/https only.
                 # warning: "javascript:alert(1)" renders and executes
                 #   on click. The frontend does NOT strip javascript:
                 #   from element.href = value assignments.
                 # Applies to any "url" field in data/*.json that becomes
                 #   an <a href> or a window.location target.
```

### 4.3 CSRF

```bash
# WHAT
Rule             # Every /api/* request carries a CSRF token in headers.
                 #   Backend validates to prevent cross-site requests.
                 #   Example: POST /api/contact -> X-CSRF-TOKEN: abc123

# HEADERS SENT
X-CSRF-TOKEN     # From meta tag or XSRF-TOKEN cookie
X-XSRF-TOKEN     # Same value

# TOKEN SOURCES (priority)
1                # <meta name="csrf-token"> in index.php
2                # XSRF-TOKEN cookie
                 #   If neither is populated, no headers sent
                 #   Example:
                 #     <meta name="csrf-token" content="abc123">
                 #     Set-Cookie: XSRF-TOKEN=abc123; Path=/; Secure; SameSite=Lax

# BACKEND MUST
Populate         # Meta tag OR XSRF-TOKEN cookie
Validate on      # POST, PUT, PATCH, DELETE
                 #   Laravel's default (both meta tag + cookie) satisfies
                 #   both automatically
```

### 4.4 API Client

```bash
# WHAT
Rule             # All /api/* calls go through core/api.js. Never raw fetch.

# HEADERS SENT
Accept           # application/json
X-Requested-With # XMLHttpRequest
Content-Type     # application/json (POST/PUT/PATCH only)
Credentials      # same-origin
X-CSRF-TOKEN     # When token available (see §4.3)
X-XSRF-TOKEN     # When token available (see §4.3)

# TIMEOUT
Default          # 15s (AbortController)
                 #   No response -> ApiError(408)

# ERRORS
Timeout          # ApiError(408) -> "Request timed out."
Network fail     # ApiError(0) -> "Network error. Backend may be unavailable."
Non-2xx          # ApiError(status) with parsed body
                 #   Message priority:
                 #     1. JSON body "message" or "error" field
                 #     2. Plain text body (not HTML), truncated to 200 chars
                 #     3. Status-based fallback
HTML body        # Detected and replaced with status fallback
                 #   User sees: "request failed (HTTP <code>)."
                 #   Markup discarded

# BACKEND MUST
Content-Type     # application/json
Error body       # Include "message" or "error" field in non-2xx
X-Requested-With # Branch on XMLHttpRequest in nginx (see §9)
```

### 4.5 Error Routing

```bash
# WHAT
Rule             # Two error paths. HTML navigation gets a full error
                 #   dialog. API calls get inline messages. Do not mix.

# HTML NAVIGATION
Flow             # Backend returns real HTTP status
                 #   -> nginx error_page 4xx/5xx -> 302 /?error=<code>
                 #   -> index.php sets window._urlErrorCode
                 #   -> app.js opens ErrorDialog with SITE_CONFIG.errorMessages
                 #   -> frontend strips ?error=<code>
                 #   Example: /missing -> 302 /?error=404 -> dialog appears

# API FETCH
Flow             # Backend returns real HTTP status, no redirect
                 #   -> nginx returns bare status (no Location, no 302)
                 #   -> api.js throws ApiError with parsed body
                 #   -> caller renders the message in its own UI
                 #   Example: 404 {"message": "Not found"} -> caller displays

# ERROR MESSAGES
File             # SITE_CONFIG.errorMessages in index.php
Scope            # HTML navigation only (NOT API errors)
Must include     # 400, 401, 403, 404, 500
Recommended      # 413, 429
Fallback         # "An unexpected error occurred"
                 #   Example:
                 #     'errorMessages': {
                 #       '400': 'Bad request. Please check the URL and try again.',
                 #       '404': 'Page not found...',
                 #       '500': 'Internal server error...',
                 #       '413': 'Upload too large.',
                 #       '429': 'Too many requests. Wait a moment.'
                 #     }

# CRITICAL
Rule             # index.php must return 200 for /?error=NNN
Why              # A 5xx triggers a redirect loop
                 #   /?error=500 -> 5xx -> error_page 500 -> 302 -> loop
Implementation   # Guard /data/*.json loading and JSON decoding.
                 #   Corrupt data must still produce a 200 shell with the
                 #   error code set.
                 #   Example: /?error=500 with corrupt site.json still
                 #   emits 200 with _urlErrorCode = '500'

# BACK-BUTTON RE-SHOW
Back after error # Pressing Back re-visits the URL that produced
                 #   the error, which 302s to /?error=<code> again ->
                 #   dialog shows again. Documented limitation.
```

### 4.6 Persistence

```bash
# KEY                        # WRITTEN BY                # CONTAINS
siteTheme                    # index.php inline script,  # 'dark' | 'light'
                             #   ThemeManager
panelTheme                   # ThemeManager              # 'dark' | 'light'
panel:{id}:state             # Window._saveState()       # { x, y, width, height }

# BEHAVIOR
Cleared on close             # window.close() removes panel:{id}:state
Invalid state rejected       # saved state with size < 100px treated as
                             #   corrupted and ignored
Bails on display: none       # _saveState skips when element is hidden
                             #   (prevents persisting {width:0, height:0})

# CARD MODULE
No localStorage keys         # Card is not draggable; no per-card state

# RESET
Reset all                    # localStorage.clear(); location.reload();
Reset one window             # localStorage.removeItem('panel:{id}:state');
                             #   location.reload();
```

### 4.7 No-JS Fallback

```bash
# WHAT
Rule             # When JS is disabled, index.php renders a full-page card
                 #   in place of the shell. Hides loader, shows message.

# STRUCTURE
Outer            # .no-js-backdrop (fixed overlay)
Card             # .core-panel.panel-dark.no-js-card
Contents         # pixel canvas -> dashed divider -> message

# EMAIL OBFUSCATION
Encoding         # mailto href and visible text both use:
                 #   &#64; for @
                 #   &#46; for .
                 #   setup.sh entity-encodes YourEmail automatically
                 #   Example: hello&#64;example&#46;com
Why              # Raw HTML contains no plaintext @
                 #   Defeats scrapers that grep fetched HTML
Limitation       # Does NOT stop scrapers that decode HTML entities

# PATTERN SYNC
Rule             # Pixel canvas uses data-filled markers matching
                 #   SITE_CONFIG.errorPixelPattern
                 #   If you change one, change both
                 #   Current pattern: 28 cells, 7 cols, 4 rows,
                 #   filled at indices 3, 9, 11, 15, 19, 21, 27

# STYLE OVERRIDE
Base             # .no-js-backdrop { display: none } in inline <style>
Noscript         # Overrides to display: flex when JS disabled
                 #   Also sets #siteLoader { display: none !important }
Why              # Loader never receives .hidden without JS, so it would
                 #   paint a solid rectangle over the page forever
```

## 5. File Structure

### 5.1 Structure

```bash
# PRODUCTION CLEANUP (run after setup.sh, before going live)
#
# DELETE from docroot:
#   setup.sh            - once configured, not needed
#   nginx.example.conf  - copy to /etc/nginx/, then delete from docroot
#   GUIDE.md            - documentation, not served
#   CHANGELOG.md        - documentation, not served
#   README.md           - documentation, not served
#   .editorconfig       - editor defaults, not served
#   .gitattributes      - git line-ending rules, not served
#   .gitignore          - git ignore rules, not served
#   .git/               - version history (capistrano excludes it)
#
# KEEP:
#   LICENSE             - legal notice (required by license terms)
#   All runtime files   - index.php, css/, js/, data/, media/, icons/,
#                         site.webmanifest, robots.txt, sitemap.xml
#
# DEFENSE IN DEPTH:
# The nginx reference config denies dotfiles, .md, .sh, .conf, and other
# source extensions. Even if a file is forgotten during cleanup, it is
# never served. Delete + deny, not delete alone. See §9.
```

```bash
pixelian/
├── index.php                    # SPA entry, inline SITE_CONFIG, inline data, noscript
├── setup.sh                     # [delete] First-run config. Delete after setup.
├── nginx.example.conf           # [delete] Nginx reference. Copy to /etc/nginx/, delete from docroot.
├── LICENSE                      # Antranik License 1.0. Legal notice.
├── GUIDE.md                     # [delete] This document.
├── CHANGELOG.md                 # [delete] Version history.
├── README.md                    # [delete] Repo landing page.
├── site.webmanifest             # PWA manifest (setup.sh fills placeholders)
├── robots.txt                   # Crawler rules (setup.sh fills YourDomain)
├── sitemap.xml                  # Sitemap (setup.sh fills YourDomain)
├── .editorconfig                # [delete] Editor defaults.
├── .gitattributes               # [delete] Git line-ending rules.
├── .gitignore                   # [delete] Ignored paths.
│
├── css/
│   ├── site.css                 # Empty (tokens inline in index.php)
│   ├── panel.css                # Panel frame, window, resize, scrollbar
│   ├── taskbar.css              # Taskbar, buttons, states, mobile grid
│   ├── theme.css                # Theme selector widget
│   ├── error.css                # ErrorDialog panel + overlay
│   └── card.css                 # Card module content overrides
│
├── js/
│   ├── app.js                   # Boot entry (imports the manifest)
│   │
│   ├── core/                    # Primitives + services (no content)
│   │   ├── api.js               # Secure fetch client
│   │   ├── config.js            # CORE_VERSION, CORE_CODE_NAME
│   │   ├── data.js              # readInlineData
│   │   ├── error.js             # ErrorDialog + URL error routing
│   │   ├── events.js            # Pub/sub bus
│   │   ├── panel.js             # Panel
│   │   ├── sanitize.js          # HTML allow-list sanitizer
│   │   ├── taskbar.js           # TaskbarManager
│   │   ├── theme.js             # ThemeManager, ThemeSelector
│   │   ├── utils.js             # Pure helpers
│   │   ├── version-registry.js  # registerCore, registerModule, assertRequirements
│   │   └── window.js            # Window, WINDOW_REGISTRY
│   │
│   └── modules/
│       ├── index.js             # Dynamic module loader
│       └── card/
│           ├── config.js        # VERSION, REQUIRES_CORE, REQUIRES_DATA
│           ├── manifest.js      # Module descriptor (default export)
│           └── main.js          # Card class + initCard factory
│
├── data/
│   ├── site.json                # Brand, tagline, footer, copyright
│   ├── card.json                # Card heading + body
│   └── modules.json             # {"modules": ["card"]}
│
├── media/                       # Project GIFs, OG image, client logos
│   └── .gitkeep                 # Ships empty (setup.sh creates this)
│
└── icons/                       # Favicon set (replace with your own)
```

```bash
# MODULE CONVENTION (js/modules/)
Module dir       # Each subdirectory is one module: js/modules/{name}/
                 #   Must contain config.js (exports VERSION, REQUIRES_*)
                 #   Must contain manifest.js (default export:
                 #     { name, config, init })
                 #   Must contain main.js (exports class + init factory)
                 #   May contain additional support files
Loader           # js/modules/index.js dynamically imports each active
                 #   module's manifest.js based on data/modules.json
Active list      # data/modules.json -> {"modules": ["card"]}
                 #   Override per deployment. Pixelian default: ["card"]
                 #   Every name must have js/modules/{name}/manifest.js
```

```bash
# EXTERNAL DEPENDENCY
Font Awesome 6.5.0               # https://cdnjs.cloudflare.com/ajax/libs/
                                 #   font-awesome/6.5.0/css/all.min.css
                                 # Used by: window controls (window.js),
                                 #   theme widget (theme.js)
                                 # License: OFL 1.1 (fonts) / MIT (CSS/JS) /
                                 #   CC BY 4.0 (icons). See §11.
                                 # CDN usage requires no extra action.
                                 # Self-hosting requires bundling the
                                 #   license texts (see §11.3).
```

### 5.2 CSS Tokens

All design tokens live in the inline `<style>` in `index.php` (except module-scoped ones, noted per row).

```bash
# SITE (on :root, overridden per theme on .site-dark / .site-light)
--site-font-family
--site-font-size-base
--site-bg-{dark,light}
--site-text-{dark,light}
--site-accent-{dark,light}
--site-text-shadow
--site-pixel-size               # 2.4rem - canonical pixel motif
--site-gap                      # 1rem
--site-radius-{sm,md,lg}        # 0.25 / 0.375 / 0.5 rem
--site-shadow-{sm,md}
--site-transition-{fast,base,slow}
--site-main-border-width
--site-main-inner-inset
--site-warning-{bg,border,text}
--site-text-rgb                 # "255, 255, 255" or "0, 0, 0"
--site-bg / --site-fg / --site-text / --site-accent / --site-copyright
--site-error-bg                 # #1a1a1a (dark) | #ffffff (light)
--site-button-{bg,hover,active,border,focus}
--site-loader-pixel-{size,border-width,gap,opacity-min,scale-min}
--site-loader-pixel-{appear,disappear}-delay
--site-loader-pixel-{wave-duration,wave-stagger,settle-duration,fade-duration}
--site-loader-end-delay

# PANEL (on .panel-dark / .panel-light)
--panel-bg / --panel-text / --panel-border / --panel-header-bg
--panel-accent                  # Mint on dark, blue on light
--panel-command-color           # Amber on dark, brown on light
--panel-shadow / --panel-shadow-focus
--panel-scrollbar-{track,thumb,thumb-hover}
--panel-btn-{border,hover-bg,hover-border,close-hover-bg,close-hover-border}

# THEME WIDGET (css/theme.css - on #themeSelector, .theme-options)
--fs-ui-{lg,md,sm,xs}           # 0.875 / 0.8125 / 0.75 / 0.6875 rem
--theme-toggle-bg
--theme-toggle-border
```

### 5.3 CSS Classes

Reference list of class patterns and their purpose.

```bash
# THEME
.site-{dark,light}              # On <body>
.panel-{dark,light}             # On #module

# LAYOUT
.core-panel                     # Base panel frame
.core-panel-header              # Title bar
.core-panel-content             # Content area
.core-panel-window              # Draggable variant
.core-panel-no-header           # Headerless panel
.core-panel-window.is-{minimized,maximized,dragging,resizing}
.core-panel-resize-{n,s,e,w,ne,nw,se,sw}
.core-panel-controls / .core-panel-btn

# TASKBAR
#windowTaskbar / .taskbar-container / .taskbar-slot
.taskbar-windows / .taskbar-widgets
.taskbar-button.is-{open,minimized,closed}
.taskbar-windows.taskbar-visible

# THEME WIDGET
#themeSelector.theme-{footer,inline}
.theme-trigger-btn / .theme-options
.theme-options.open / .drop-{up,down}
.theme-option.selected / [aria-selected="true"]

# ERROR DIALOG
.module-error-panel / .module-error-message
.module-error-overlay / .module-error-overlay-dialog / -header / -title
.module-error-overlay-close / -body

# LOADER / FALLBACK
#siteLoader.hidden / .loader-wave / .site-loader-pixel
.site-error / .site-error-card / .site-error-canvas
.site-error-badge / .site-error-pixel.on / .site-error-divider
.site-error-message

# NO-JS
.no-js-backdrop / .no-js-card / .no-js-canvas
.no-js-pixel-grid / .no-js-pixel-cell[data-filled]
.no-js-divider / .no-js-message / .no-js-headline / .no-js-accent / .no-js-body

# CARD
.core-panel.core-panel-no-header        # What Card renders (headerless
                                        #   panel). Style card content via
                                        #   these existing classes, or add
                                        #   a custom className via the Panel
                                        #   option if you need module-specific
                                        #   styles.
```

### 5.4 SITE_CONFIG

Defined inline in `index.php` `<script>`. Edit these values per project.

```bash
# IDENTITY
brandLogo         # Reserved. Currently unused - no code in index.php
                  #   or app.js reads it. Kept for future use.
brandName         # Unused today. <title> and OG tags hardcoded in
                  #   index.php <head>. Wire in if you want SITE_CONFIG
                  #   to drive them.
tagline           # Unused today

# LOADER
enableSiteLoader  # false skips loader animation entirely
                  #   Also sets window._siteLoaderEnabled
loaderPixelCount  # Pixel count for site loader (7)

# ERROR OVERLAY (fallback only - fires when js/app.js fails to load)
errorPixelCols    # Column count for overlay grid (7)
errorPixelPattern # 0/1 pattern. Length must be a multiple of
                  #   errorPixelCols (currently 28 / 7 = 4 rows).
                  #   Same shape used by no-JS card data-filled markers.
                  #   Keep in sync - see §4.7.
errorMessages     # code -> message map (HTML navigation only)
                  #   See §4.5 for full rules
errorContainer    # CSS selector for overlay mount. Current value:
                  #   'main'. Passed to document.querySelector().
```

## 6. Data Files

`index.php` reads each `data/*.json` file at request time and inlines it as `<script type="application/json" id="data-{id}">`. Save a file, reload the page, the edit applies.

Core data (`site.json`, `modules.json`) is always inlined. Per-module data is inlined only for modules listed in `data/modules.json`. Every active module inlines `<name>.json` (if present) and `<name>/*.json` subfiles (if a subdir exists).

```bash
# DATA FLOW
Browser              # GET / -> nginx -> PHP-FPM -> index.php
index.php reads      # /data/site.json, /data/modules.json (always)
                     # /data/{module}.json and /data/{module}/*.json
                     #   for each module listed in /data/modules.json
Inlines each as      # <script type="application/json" id="data-{id}">
JS reads via         # readInlineData(urlToInlineId(url))

# CSS FLOW
index.php reads      # /data/modules.json
Emits in <head>      # <link rel="stylesheet" href="/css/{name}.css">
                     #   for each active module with a matching file
Skipped silently     # if /css/{name}.css does not exist
Module extras        # modules with additional CSS files (beyond
                     #   {name}.css) load them via loadCSS() in init()

# MODULE PRELOADS
index.php reads      # /data/modules.json
Emits in <head>      # <link rel="modulepreload" href="/js/modules/{name}/manifest.js">
                     # <link rel="modulepreload" href="/js/modules/{name}/main.js">
                     #   for each active module, per file that exists
Why                  # the dynamic import in js/modules/index.js resolves
                     #   from cache instead of starting a fresh fetch

# INLINE ID DERIVATION
/data/site.json            -> data-site
/data/card.json            -> data-card

# {year} PLACEHOLDER
                     # Replaced with current year before emission.
                     # Works in any string value.
                     # Example: "© {year} YourCopyright"

# MODULE AWARENESS
                     # index.php reads data/modules.json first, then
                     #   inlines only the data files belonging to active
                     #   modules. Add a module's data without editing
                     #   index.php - just add the module name to
                     #   data/modules.json.

# TOLERANT LOADING
Missing file         # Logs console warning, does not throw
                     # Module guards its data access
                     # Example: missing card.json -> card uses its
                     #   Lorem Ipsum fallback
Version requirements # Still throw - assertRequirements runs at boot
                     #   (e.g. missing peer module aborts that module)
```

### 6.1 Site

`data/site.json`:

```bash
title            # Header brand text
tagline          # Subtitle below the brand
showBrand        # false hides the header brand block entirely
                 #   true or missing = show when value is non-empty
                 #   Wrapper (header .brand) collapses when both children are hidden
showTagline      # false hides the tagline only
                 #   true or missing = show when value is non-empty
copyright        # Footer copyright line
                 #   Rendered as innerHTML - never put user input here
                 #   {year} works in any string value, replaced with the current year
                 #   Example: "© {year} YourCopyright"
poweredBy        # Footer "powered by" line
                 #   Rendered as innerHTML - never put user input here
                 #   Must satisfy LICENSE §2.d (see §3.3 Attribution Tier)
                 #   Unmodified code: "Powered by Antranik.dev"
                 #   Modified code:   "Extends Antranik.dev"
showPoweredBy    # false hides the powered-by line
                 #   true or missing = show when value is non-empty
                 #   Wrapper (footer .legal) collapses when both children are hidden
                 #   Pixelian ships true (credits Antranik.dev by default)
```

### 6.2 Card

`data/card.json`:

```bash
heading          # Card heading text (textContent, no HTML)
body             # Card body text (textContent, no HTML)
                 # Fallback when data missing:
                 #   heading = 'Welcome'
                 #   body    = 'Add content to /data/card.json to customize this card.'
```

### 6.3 Modules

`data/modules.json`:

```bash
modules          # Array of module names to load at boot
                 #   Pixelian default: ["card"]
                 #   Each name must have js/modules/{name}/manifest.js
                 #   Unknown names are skipped with a console warning
                 #   Missing file falls back to ["card"]
```

## 7. Core

Primitives and services in `js/core/`. No module-specific content. Every export has a full JSDoc header in its source file. This section is the map: what exists and what it does, one line each.

**Files ordered** by dependency flow:

```text
Foundation -> Helpers -> Service -> Primitives
```

### 7.1 Config

`js/core/config.js`:

```bash
# CONSTANTS
CORE_VERSION             # '1.0.0' - the core build version
                         #   Bump MAJOR.MINOR.PATCH on every release
CORE_CODE_NAME           # 'Pixelian' - the project name
```

### 7.2 Version Registry

`js/core/version-registry.js`:

```bash
# CONSTANTS
KNOWN_PRIMITIVES         # Set of valid primitive names for REQUIRES_PRIMITIVES
                         #   Panel  Window  TaskbarManager  Events
                         #   ThemeManager  ThemeSelector  ErrorDialog  Api  Sanitize
                         #   Anything else throws at boot

# REGISTRY
_registry                # { core: { version, codeName }, modules: {} }
                         #   Populated by registerCore and registerModule
                         #   Read by assertRequirements and getLoadedModules

# PUBLIC API
registerCore(version, codeName)
                         # Called once from app.js at boot
                         #   Sets the running core version and code name

registerModule(name, version, requiresCore)
                         # Called once per module at boot
                         #   Records module version and minimum core requirement

assertRequirements(name, version, requiredCore, dependencies, requiredPrimitives)
                         # Throws if any requirement is not satisfied
                         #   requiredCore:        minimum core version (e.g. '1.0.0')
                         #   dependencies:        { otherModule: minVersion } peer deps
                         #   requiredPrimitives:  names must be in KNOWN_PRIMITIVES
                         # Example error:
                         #   Module "blog" v1.0.0 requires "card", but it
                         #   is not registered.

getLoadedModules(opts)
                         # Version info dump
                         #   opts.format:        'object' (default) | 'array'
                         #   opts.includeCore:   true (default)
                         #   opts.logToConsole:  false (default)
                         #
                         # Object shape:
                         #   { core: { version, codeName },
                         #     modules: { name: { version, requiresCore } } }
                         #
                         # Array shape:
                         #   [{ name: 'core', version, codeName }, ...modules]
```

### 7.3 Utils

`js/core/utils.js`:

```bash
VERSION                  # Module version constant

# SEEDED RANDOM
seededRandom()           # LCG pseudo-random in [0, 1). Deterministic across reloads.
resetSeed(newSeed)       # Reset the LCG seed (default: 42)

# ASYNC
wait(ms)                 # Pause for ms. Returns Promise.
debounce(fn, ms)         # Delay invocation until ms after last call. Returns wrapped fn with .cancel().
throttle(fn, ms)         # Invoke at most once per ms window. Returns wrapped fn.

# MATH
clamp(v, min, max)       # Clamp a number between min and max (inclusive).
shuffle(arr)             # Fisher-Yates permutation. Returns new array, does not mutate.

# STRINGS
escapeHTML(text)         # Safe for text content. Does NOT escape quotes.
escapeAttr(text)         # Safe for attribute values. Escapes quotes too.
formatMessage(templates, key, vars, fallback)  # Resolve {placeholder} tokens.
truncate(text, max, suffix)                    # Truncate with suffix (default: ellipsis).
slugify(text)                                  # URL-safe slug.
splitParagraphs(text)                          # Split on \n\n. Drops empty.

# DATES
MONTHS                   # Array of month names
pad2(n)                  # Zero-pad to two digits
parseDate(value)         # YYYYMMDD, YYYY-MM-DD, ISO 8601, Date, epoch -> Date|null
                         #   YYYYMMDD and YYYY-MM-DD resolve to LOCAL midnight
                         #   Rollovers (Feb 31, month 13) return null
                         #   Full ISO 8601 with time preserves exact instant
parseDateTime(date, time)  # Combine date + 'HH:MM[:SS]' (local) -> Date|null
formatDate(d)              # "November 12, 2026"
formatTime(d)              # "14:00:00" (local)
formatDateTime(d)          # "November 12, 2026 at 14:00:00"
formatRemaining(ms)        # "3d 04:22:11" or "Live now"
relativeTime(d)            # "2 days ago", "in 3 hours" (uses Intl.RelativeTimeFormat)

# DOM
isAtBottom(el, threshold)  # True when scrolled within threshold px of bottom (default: 20)

# EMAIL
maskEmail(user, domain)    # "user [at] domain [dot] tld"
encodeEmail(user, domain)  # Base64 payload
decodeEmail(payload)       # { user, domain } | null
copyToClipboard(text)      # Clipboard API with execCommand fallback. Promise<boolean>.

# SECURITY
getCsrfToken()             # Read from <meta name="csrf-token"> or XSRF-TOKEN cookie

# LOADING
waitForLoaderHidden(safetyMs)  # Resolve when #siteLoader fades. Default safety: 3000ms.
urlToInlineId(url)             # "/data/site.json" -> "site"
                               # "/data/blog/about.json" -> "blog-about"
loadCSS(href)                  # Dynamically load stylesheet. Promise.
loadJSON(url)                  # Fetch + parse JSON. Cached. Returns null on failure.
fetchSiteData()                # Inline first -> fetch -> hard-coded fallback

# VERSIONING
versionSatisfies(actual, required)  # MAJOR.MINOR only. Patch ignored.
```

### 7.4 Data

`js/core/data.js`:

```bash
# PUBLIC API
readInlineData(name)     # Object|null
                         #   Reads <script type="application/json" id="data-{name}">
                         #   from the DOM and parses it. Zero fetches.
                         #
                         #   Returns the parsed object on success.
                         #   Returns null if:
                         #     - element is missing (data file was not inlined)
                         #     - JSON.parse fails (logs warning to console)
```

### 7.5 Events

`js/core/events.js`:

```bash
# EVENTS
EVENTS                   # Singleton pub/sub bus shared across the app
                         #   Used by Window and Taskbar

# PUBLIC API
EVENTS.on(name, fn)      # Subscribe. Returns unsubscribe function.
EVENTS.off(name, fn)     # Unsubscribe
EVENTS.emit(name, payload)
                         # Emit. Listeners run synchronously in registration order.
                         # A listener that throws logs and continues - does not block others.
                         #
                         # Window lifecycle events:
                         #   window:opened  window:minimized  window:restored  window:closed
                         #   window:destroyed  window:focused  window:maximized  window:unmaximized
                         # Payload: { id, label, icon, showInTaskbar, persistInTaskbar }
```

### 7.6 API

`js/core/api.js`:

```bash
# CONSTANTS
BASE_URL                 # '/api' - base path for every request
TIMEOUT_MS               # 15000 - default timeout in ms

# ERROR CLASS
ApiError(status, message, body)   # Error subclass
                                  #   status:  HTTP code (0 for network/timeout)
                                  #   message: always safe to display; HTML stripped
                                  #   body:    parsed response body for inspection

# HELPERS
isHTMLContent(text)      # Detects HTML error bodies (nginx pages, CDN errors)
statusMessage(status)    # Human-readable fallback per HTTP status

# REQUEST
request(method, path, body, options)
                         # Builds headers, sends fetch, parses response
                         # Throws ApiError on non-2xx or network failure
                         # Returns parsed JSON on success
                         #
                         # Every request sends (see §4.4):
                         #   Accept: application/json
                         #   X-Requested-With: XMLHttpRequest
                         #   Content-Type: application/json (POST/PUT/PATCH only)
                         #   Credentials: same-origin
                         #   X-CSRF-TOKEN / X-XSRF-TOKEN when token available
                         # Timeout: 15s (AbortController)
                         # HTML error bodies replaced with status fallback message

# PUBLIC API
apiGet(path, options)    # GET /api/{path}
apiPost(path, body, options)     # POST with JSON body
apiPut(path, body, options)      # PUT with JSON body
apiPatch(path, body, options)    # PATCH with JSON body
apiDelete(path, options)         # DELETE

# ERROR MESSAGES
describeApiError(err, opts)
                         # err -> human-readable message
                         #   opts: { prefix, resource, id }
                         #   Example:
                         #     describeApiError(err, { prefix: 'blog', resource: 'post', id: 'x' })
                         #     -> "blog: post \"x\" not found."
```

### 7.7 Sanitize

`js/core/sanitize.js`:

```bash
# CONSTANTS
DEFAULT_RULES            # Conservative allow-list
                         #   allowedTags: p, br, hr, h1-h6, ul, ol, li, strong, em,
                         #                b, i, u, s, del, ins, a, code, pre, blockquote
                         #   allowedAttrs: { a: [href, title] }
                         #   allowedProtocols: [http, https, mailto]

FORBIDDEN_PROTOCOLS      # Always stripped regardless of allowedProtocols
                         #   javascript, data, vbscript, file

# PUBLIC API
sanitizeHTML(html, rules)
                         # Safe HTML string
                         #   Disallowed tags unwrapped (children preserved)
                         #   Disallowed attrs stripped
                         #   Forbidden protocols always stripped
                         #   Relative paths and #anchors always pass
                         #   Every <a> forced to rel="noopener noreferrer" target="_blank"
                         #   Rules priority: caller rules > DEFAULT_RULES
                         # See §4.2 for full sanitization rules
```

### 7.8 Window

`js/core/window.js`:

```bash
# STATE
_zIndexCounters          # Per-tier focus counters (Map keyed by zIndexBase)
                         #   Mutates on every focus(). Not exported.

# CONSTANTS
FALLBACK_WIDTH           # 500 - used when offsetWidth is 0
FALLBACK_HEIGHT          # 400 - used when offsetHeight is 0
MIN_SAVED_DIMENSION      # 100 - saved state below this is treated as corrupted
DEFAULT_MIN_WIDTH        # 260 - default resize floor width
DEFAULT_MIN_HEIGHT       # 80 - default resize floor height
DEFAULT_Z_INDEX_BASE     # 2000 - default tier for content panels
ICON_MAXIMIZE            # HTML for maximize button icon
ICON_RESTORE             # HTML for restore button icon
RESIZE_DIRECTIONS        # 8-way resize handle definitions (n, s, e, w, ne, nw, se, sw)

# REGISTRY
WINDOW_REGISTRY          # Global registry by id
  .get(id)               # -> Window|null
  .getAll()              # -> Window[]
  .has(id)               # -> boolean
  .delete(id)            # Remove from registry

# HELPERS
assertDependencies()     # Throws if EVENTS bus is missing or broken

# PUBLIC API
Window                   # Draggable + resizable window behavior
                         #   Adds drag, 8-way resize, controls, persistence, focus
                         #   Emits lifecycle events on the bus (see §7.5)

new Window({
  id,                    # Unique id (persistence key)
  element,               # Root element to drag/resize
  header,                # Drag handle
  label,                 # Taskbar label (falls back to id)
  icon,                  # Taskbar icon (falls back to square glyph)
  showInTaskbar,         # Show taskbar button (default true)
  showMinimize,          # Add minimize button (default true)
  showMaximize,          # Add maximize button (default true)
  persistInTaskbar,      # Keep taskbar button after close (default false)
  autoMaximizeMobile,    # Fill <main> on mobile <=768px (default false)
                         #   OPT-IN. Default false so detail panels
                         #   peek at their natural size.
  zIndexBase,            # Tier base (default 2000)
  minWidth,              # Resize floor (default 260px)
  minHeight              # Resize floor (default 80px)
})

# PROPERTIES
window.isMinimized       # Boolean
window.isMaximized       # Boolean
window.isVisible         # element.style.display !== 'none'
window.canMinimize       # Boolean (reflects showMinimize)
window.canMaximize       # Boolean (reflects showMaximize)

# ACTIONS
window.minimize()        # display: none. Emits window:minimized. No-op if !showMinimize.
window.restore()         # Reverse minimize or close. Emits window:restored.
window.toggleMinimize()  # minimize <-> restore
window.maximize()        # Fill available space. Emits window:maximized.
                         #   Desktop: 20px viewport inset (CSS fallback)
                         #   Mobile: fills <main> via --maximize-* properties
window.unmaximize()      # Restore pre-maximize rect. Emits window:unmaximized.
window.toggleMaximize()  # maximize <-> unmaximize

# LIFECYCLE
window.focus()           # Bring to front within tier. Emits window:focused.
                         #   z-index counters are per-tier (Map keyed by
                         #   zIndexBase), not global. Focus bumps within
                         #   a tier (base to base + 999). Higher tiers win.
window.close()           # Hide + clear persisted state. Emits window:closed.
                         #   Taskbar handling depends on persistInTaskbar.
window.destroy()         # Teardown all listeners + unregister.
                         #   Emits window:destroyed.
                         #   Every event handler is stored as an instance
                         #   property in the constructor before being
                         #   attached, so destroy() removes it cleanly.
                         #   No leaked listeners.

# CONTROLS
window._createControls() # Build minimize / maximize / close buttons in header

# RESIZE
window._createResizeHandles()    # Add 8 resize handle divs to element
window._onResizeStart(e, dir)    # Begin resize on handle mousedown/touchstart
window._resizeMove(x, y)         # Compute new rect from pointer delta + clamp

# DRAG
window._onHeaderDown(e)          # Begin drag on header mousedown/touchstart
window._onHeaderDblClick(e)      # Toggle maximize on header double-click
window._onElementMouseDown()     # Focus on any element mousedown
window._onDocMove(e)             # Dispatch to _moveTo or _resizeMove based on state
window._onDocUp()                # End drag/resize + save state
window._moveTo(x, y)             # Move window to (x, y), clamped to bounds

# VIEWPORT
window._getBounds()              # Viewport rect (desktop) or <main> rect (mobile <=768px)
window._shouldAutoMaximizeOnMobile()  # Pure viewport check (ANDed with _autoMaximizeMobile)
window._applyMaximizeBounds()    # Set/clear --maximize-* props for mobile maximize
window._clampRectToBounds(rect)  # Clamp { x, y, width, height } to bounds
window._onResizeViewport()       # Handle window resize (re-clamp or re-maximize)

# PERSISTENCE
window._storageKey()             # 'panel:{id}:state'
window._saveState()              # Persist { x, y, width, height }. Skipped if max/min/closed.
window._loadState()              # Restore from storage. Rejects corrupted state (<100px).

# LAYOUT
window._applyCenter()            # Center on viewport (clamped to <main> on mobile)
window._resetToDefault()         # Reset size + position after close->reopen
window._applyRect(rect)          # Apply a rect, clamped to bounds
window._setPosition(x, y)        # Set position without clamping

# PAYLOAD
window._payload()                # Build { id, label, icon, showInTaskbar, persistInTaskbar }
                                 #   Used by every event bus emit
```

### 7.9 Panel

`js/core/panel.js`:

```bash
# PUBLIC API
Panel                    # Reusable frame. Header optional.
                         #   Wraps Window when draggable.
                         #   Inherits frame, shadow, radius from panel.css

new Panel({
  title,                 # Header title
  icon,                  # Header icon glyph
  showHeader,            # Render title bar (default true)
  id,                    # Unique id (required when draggable)
  draggable,             # Default: showHeader && id !== null
                         #   Pass false to force non-draggable
                         #   true without header or id throws
  showMinimize,          # Add minimize button (default true)
  showMaximize,          # Add maximize button (default true)
  showInTaskbar,         # Default: same as showMinimize
  persistInTaskbar,      # Keep taskbar button after close (default false)
  autoMaximizeMobile,    # Fill <main> on mobile <=768px (default false)
  label,                 # Taskbar label (default: title)
  zIndexBase,            # Z-index tier base (default 2000)
  minWidth,              # Resize floor (default 260px)
  minHeight,             # Resize floor (default 80px)
  className              # Extra class on root element
})

# PROPERTIES
panel.element            # Root .core-panel element
panel.content            # .core-panel-content element
panel.hasHeader          # Boolean
panel.hasWindow          # Boolean (true after mountWindow)

# TITLE AND ICON
panel.setTitle(text)     # Chainable
panel.setIcon(text)      # Chainable

# CONTENT
panel.clearContent()     # Chainable
panel.appendContent(...nodes)  # Chainable

# LIFECYCLE
panel.mountWindow()      # Attach Window if draggable. Idempotent.
panel.destroy()          # Detach Window + remove element

# Z-INDEX TIERS

# JS-CONTROLLED (Window focus bumps base+1 .. base+999 per tier)
                         # 2000         Panel window default
                         # 4000         Error panel (4001..4999)

# FIXED (no focus counter)
                         # 5000         Theme dropdown (portaled to body)
                         # 9000         Site loader (boot only)
                         # 9999         Fallback overlay (app.js failed to load)
```

### 7.10 Taskbar

`js/core/taskbar.js`:

```bash
# HELPERS
assertDependencies()     # Throws if EVENTS or WINDOW_REGISTRY is missing

# PUBLIC API
TaskbarManager           # Window taskbar. In-flow block inside the footer.
                         #   Manages window buttons via the EVENTS bus

new TaskbarManager({
  target,                # Mount target selector (default: '.taskbar')
  slotOrder              # Slot order (default: ['widgets', 'buttons'])
})
                         # Mobile (<=600px): buttons + theme widget share
                         #   one centered CSS Grid. Slots get
                         #   display: contents so their children become
                         #   direct grid items.

# PROPERTIES
taskbar.widgetSlot       # .taskbar-widgets - mount widgets here
taskbar.buttonSlot       # .taskbar-windows - auto-managed window buttons
taskbar.container        # #windowTaskbar - full taskbar element

# CONTROLS
taskbar._onButtonClick(id)
                         # Button is a TOGGLE, not just a restore trigger:
                         #   open, not minimized       -> minimize
                         #   minimized                 -> restore
                         #   closed (persistInTaskbar) -> restore
                         #   closed (non-persistent)   -> no button exists
                         # focus() runs last so the window always ends up
                         #   at the front of its tier.

# CSS STATES
                         # .is-open       open, not minimized
                         # .is-minimized  minimized, click restores
                         # .is-closed     closed (persistInTaskbar only)

# BEHAVIOR
                         # persistInTaskbar (Window option, consumed by
                         #   Taskbar on window:closed):
                         #   true  -> button stays dimmed after close,
                         #            click restores
                         #   false -> button removed on close,
                         #            reopen via your own API call
```

### 7.11 Theme

`js/core/theme.js`:

```bash
# PUBLIC API
ThemeManager             # Site and panel theme state
new ThemeManager()       # Reads current state from DOM, syncs localStorage
                         #   Persistence: localStorage.siteTheme,
                         #   localStorage.panelTheme

ThemeManager.getCurrentSite()   # 'dark' | 'light' (static)
ThemeManager.getCurrentPanel()  # 'dark' | 'light' (static)

manager.handleSelection(datasetTheme)
                         # 'site-dark' | 'site-light' | 'panel-dark' | 'panel-light'
                         # Applies class + persists to localStorage

ThemeSelector            # Theme switching widget
new ThemeSelector({
  target,                # Mount target (default: 'header')
  position               # 'first' | 'last' (default: 'first')
})

selector.element         # #themeSelector root element

# CONTROLS
selector._init()
                         # Registers event listeners:
                         #   trigger click -> toggle
                         #   option click -> apply + close
                         #   outside click -> close
                         #   ArrowDown / ArrowUp -> navigate options
                         #   ESC (document-level, bubble phase) -> close
                         # ESC fires after ErrorDialog's capture-phase
                         #   handler, so an open error dialog always closes
                         #   first. Matches the priority chain.

selector._open()
                         # Portal behavior: moves .theme-options to <body>
                         #   with position: fixed + z-index 5000 while open.
                         #   Restores to original DOM position after the
                         #   closing transition.
                         # Rapid-reopen race protection: cancels any pending
                         #   restore timeout from a recent _close().

# CSS CLASSES
                         # Site     .site-dark / .site-light on <body>
                         # Panel    .panel-dark / .panel-light on #module
```

### 7.12 Error

`js/core/error.js`:

```bash
# PUBLIC API
ErrorDialog              # Error dialog service
new ErrorDialog({
  target,                # Mount container (default: '#module')
  mode                   # 'panel' (default) | 'overlay' | Function
                         #   panel    close-only Panel at tier 4000, ESC + backdrop dismiss
                         #   overlay  full-screen modal, ESC + backdrop dismiss
                         #   function custom renderer, receives { title, message, container }
})

dialog.show(title, message)
dialog.hide()

# STATE
_urlErrorDialog          # Singleton ErrorDialog for URL error routing
                         #   Reused across calls. Not exported.

# URL ERRORS
showUrlErrorDialog(code, messages, { target })
                         # Opens ErrorDialog with message from messages[code],
                         # then calls stripUrlErrorParam() synchronously so
                         # the URL is clean before the dialog renders.
                         # Fallback message when code missing:
                         #   "An unexpected error occurred."

stripUrlErrorParam(messages)
                         # Remove ?error=<code> from URL via history.replaceState.
                         # No-op if param missing or code not in messages.
                         # Preserves other query params and hash.
                         # Runs synchronously INSIDE showUrlErrorDialog(),
                         # immediately after dialog.show(). URL is clean
                         # before the user sees or dismisses the dialog.

# BEHAVIOR
                         # ESC priority (capture phase):
                         #   1. Error dialog open -> close it
                         #   2. Theme dropdown open -> close it (bubble phase)
                         # Error always wins when both are open.
```

## 8. Modules

Content modules in `js/modules/`. Each has `config.js` (VERSION, REQUIRES_CORE, REQUIRES_DATA, DEPENDENCIES, REQUIRES_PRIMITIVES) and `main.js` (class + init factory).

### 8.1 Card

`js/modules/card/`:

```bash
# CONFIG
VERSION                    # '1.0.0'
REQUIRES_CORE              # '1.0.0'
REQUIRES_PRIMITIVES        # ['Panel']
REQUIRES_DATA              # ['/data/card.json']
DEPENDENCIES               # {}
Factory                    # initCard({ target, position, data })

# CONSTRUCTOR
new Card({
  target,                  # Container selector (default: '#module')
  position,                # 'first' | 'last' (default: 'first')
  data,                    # Content from /data/card.json
})

# PUBLIC API
card.init()                # Promise. Builds panel, mounts.
                           #   No destroy() - card has no timers, no listeners,
                           #   no state to tear down.

# BEHAVIOR
                           # Headerless Panel (showHeader: false)
                           # Renders heading + body from data/card.json
                           # Heading and body use textContent - no HTML,
                           #   no sanitization needed
                           # FALLBACK: if data is undefined (data/card.json
                           #   missing), uses Lorem Ipsum so the frame
                           #   still renders. Card never shows
                           #   "no content configured".
                           # NOT DRAGGABLE
                           #   Panel({ showHeader: false }) -> draggable = false
                           #   No Window wrapper, no taskbar button, no
                           #   localStorage state. Card is a static frame.
                           # CSS loading
                           #   Auto-injected by index.php in <head> for every active
                           #   module with a matching css/{name}.css.
                           #   card/main.js does not call loadCSS() at runtime.

# ENABLED BY DEFAULT
                           # data/modules.json ships ["card"].
                           # To disable: override data/modules.json with
                           #   {"modules": []}.
```

### 8.2 Add / Remove a Module

Cross-cutting reference for adding or removing a module. Applies to any new module, not just Card.

```bash
# ANATOMY (minimum files)
js/modules/{name}/config.js    # VERSION, REQUIRES_CORE, REQUIRES_PRIMITIVES,
                               #   REQUIRES_DATA, DEPENDENCIES
js/modules/{name}/main.js      # class {Name} + init{Name}() factory
js/modules/{name}/manifest.js  # default export { name, config, init }

# OPTIONAL
css/{name}.css                 # If the module has UI
data/{name}.json               # If the module loads data

# ADD - STEP BY STEP
1  Create js/modules/{name}/config.js
   - export const VERSION, REQUIRES_CORE, REQUIRES_PRIMITIVES,
     REQUIRES_DATA, DEPENDENCIES
   - REQUIRES_PRIMITIVES must reference names in KNOWN_PRIMITIVES (§7.2)
   - DEPENDENCIES for peer modules: { other: '1.0.0' }

2  Create js/modules/{name}/main.js
   - export class {Name}
   - export function init{Name}(options) returning instance.init()
   - Guard container: if (!this.container) return;

3  Create js/modules/{name}/manifest.js
   - import * as config from './config.js'
   - import { init{Name} } from './main.js'
   - export default {
       name: '{name}',
       config,
       init: async (moduleData) => {
           await init{Name}({ target: '#module', position: 'first',
                             data: moduleData?.['/data/{name}.json'] });
       }
     }

4  Create css/{name}.css (if UI)
   - File header per §3.3 (with @copyright + @author)
   - Module root class .module-{name}
   - Reuse tokens (§5.2) - do not hardcode colors
   - AUTO-INJECTED: index.php reads data/modules.json and emits
     <link rel="stylesheet" href="/css/{name}.css"> in <head>. No PHP
     edit needed.

5  Create data/{name}.json (if data)
   - Shape: see §6 conventions

6  Update data/modules.json
   - Add "{name}" to the modules array:
     {"modules": ["card", "{name}"]}

7  No preload edit needed
   - index.php auto-emits modulepreload for manifest.js and
     main.js of every active module. CSS auto-inject covers the
     stylesheet.

8  Update documentation
   - §5.1 File Structure tree: add js/modules/{name}/ entries
   - §8: add a new subsection for the module

# NOTE: No index.php edit needed for data inlining. index.php reads
# data/modules.json and inlines data automatically for every active
# module. Adding a module never requires editing PHP.

# REMOVE - STEP BY STEP
1  Update data/modules.json
   - Remove "{name}" from the modules array
   - Preloads, CSS injection, and data inlining all stop automatically
     because index.php reads data/modules.json on every request
2  Delete js/modules/{name}/
3  Delete css/{name}.css
4  Delete data/{name}.json (or keep if reused elsewhere)
5  Update §5.1 and §8 documentation

# GOTCHAS
Boot fails silently   # If REQUIRES_CORE in config.js exceeds CORE_VERSION,
                      #   assertRequirements throws at boot. See §7.2.
Missing manifest      # js/modules/{name}/manifest.js missing -> module
                      #   skipped with a console warning (not fatal).
Missing import        # Broken import paths in a manifest abort the whole
                      #   app.js graph (browser refuses to execute parent).
                      #   Fallback overlay shows at z-index 9999.
Missing data          # Logs warning, does not fail. Module must guard.
Peer not registered   # DEPENDENCIES check throws with a clear message.
Preloads forgotten    # Module works but CSS/JS download starts later -
                      #   slower boot, no visual bug.
```

## 9. Deployment

Pixelian ships as plain PHP + static files. A minimal reference nginx config ships in [`nginx.example.conf`](nginx.example.conf) at the repo root. **Copy it to `/etc/nginx/sites-available/`, edit paths, then delete it from the docroot** - see "PRODUCTION CLEANUP" in §5.1.

```bash
# NGINX - REQUIRED BEHAVIOUR
SPA fallback     # try_files $uri $uri/ /index.php?$query_string
PHP-FPM          # Pass .php files to PHP-FPM
Static assets    # Serve /css/, /js/, /icons/, /media/ as static
Data files       # Serve /data/ as static with short Cache-Control (60s)
Error routing    # 4xx/5xx -> 302 /?error=<code>
                 #   Without this, the ErrorDialog never fires; users see
                 #   the raw nginx error page instead.
Deny dotfiles    # location ~ /\.(?!well-known) { return 404; }
                 #   Prevents .git, .env, .editorconfig, etc. from being
                 #   served even if accidentally deployed.
Deny source/docs # location ~* \.(?:md|sh|conf|yml|yaml|lock)$ { return 404; }
                 #   Belt-and-suspenders. Delete these files on live (see
                 #   PRODUCTION CLEANUP in §5.1), but deny in nginx so a
                 #   forgotten file is still not served.
                 #   Note: .json is NOT in this list - data files under
                 #   /data/ must remain served.

# PRODUCTION HARDENING (beyond the example config)
HTTPS + HSTS     # Redirect HTTP -> HTTPS, add Strict-Transport-Security
Security headers # X-Frame-Options, X-Content-Type-Options, Referrer-Policy,
                 #   Permissions-Policy (see GUIDE reference configs)
Rate limits      # limit_req + limit_conn zones on /api/ and /data/
Error messages   # Add 413 and 429 to SITE_CONFIG.errorMessages if you
                 #   use rate limits or a body-size cap

# LOCAL DEV
php -S           # php -S localhost:8000 -t . (serves index.php for /)
                 # No nginx needed. Pixelian has no path routing.

# DEPLOY CHECKLIST
1                # Run setup.sh on a local copy (fills placeholders)
2                # Copy Pixelian files to the server's docroot
3                # Copy /data/ writable (writable by the user running PHP)
4                # Copy /media/ (empty is fine; fill with your assets)
5                # Copy nginx.example.conf to /etc/nginx/sites-available/
                 #   Edit server_name, root, php-fpm socket, SSL paths
                 #   Symlink into /etc/nginx/sites-enabled/
                 #   nginx -t && systemctl reload nginx
6                # Delete from docroot: setup.sh, nginx.example.conf,
                 #   GUIDE.md, CHANGELOG.md, README.md, .editorconfig,
                 #   .gitattributes, .gitignore, .git/
                 #   (See PRODUCTION CLEANUP in §5.1 for the full list.)
7                # Verify:  curl -sI https://<domain>/            # 200
                 #          curl -sI https://<domain>/data/site.json  # 200
                 #          curl -sI https://<domain>/missing     # 302 -> /?error=404
                 #          curl -sI https://<domain>/setup.sh    # 404
                 #          curl -sI https://<domain>/.gitignore  # 404
8                # Verify in browser: / loads; /missing -> ErrorDialog;
                 #   /?error=404 -> ErrorDialog; URL strips to /
9                # Disable JS in DevTools: styled no-JS card visible
```

## 10. Troubleshooting

```bash
# CONSOLE
window.getLoadedModules()          # Version registry dump
                                   #   format 'object' (default) | 'array'
                                   #   includeCore: true (default)
                                   #   logToConsole: false (default)
window.__SITE_DATA__               # Parsed site.json
window._siteErrorMessages          # Error code -> message map
window.siteInit()                  # Re-fire loaderFinished once _appReady
window.siteShowError('404')        # Force the fatal fallback overlay
window._urlErrorCode               # Boot-time error code (string | null)
window._siteLoaderEnabled          # Read by modules to skip loader waits

# URL FLAGS
?error=404                         # Triggers ErrorDialog panel via app.js
                                   #   400, 401, 403, 404, 500 supported
                                   #   URL is stripped after dialog opens

# EVENTS ON WINDOW
loaderAnimationDone                # Site loader animation finished
loaderFinished                     # All modules initialized
window:{opened,minimized,restored,closed,destroyed,focused,maximized,unmaximized}
                                   # Window lifecycle events on EVENTS bus

# LOADER
Loader stuck                        # check console for app.js errors
                                    # or set enableSiteLoader: false
Loader never fades + modules boot   # 3s safety timeout in waitForLoaderHidden
Loader stuck at opacity 1           # initPromise reject path is caught

# WINDOWS
Wrong window position on open       # localStorage.removeItem('panel:{id}:state')
New panel opens too small           # saved state corrupted; remove state
Panel not centered on mobile        # _applyCenter uses clientWidth/clientHeight;
                                    # check <main>'s rect

# CARD
Card shows fallback content         # data/card.json missing or failed to
                                    # inline. Check data file exists and is
                                    # valid JSON. Fallback is
                                    # "Welcome / Add content to..."
Card frame empty                    # heading/body both empty in data file
Card CSS has no effect              # css/card.css ships empty. Add rules
                                    # there; index.php auto-injects the
                                    # file via data/modules.json.

# MODULES
Module not appearing                # verify data/modules.json includes the
                                    # name. Verify js/modules/{name}/manifest.js
                                    # exists. Check browser console for
                                    #   [modules] "x" not found, skipping
Module loads but nothing renders    # check init() throws. Look for
                                    # assertRequirements error in console.
Wrong CSS for module                # verify /css/{name}.css exists. Pixelian
                                    # skips injection silently when missing.
Duplicate module load               # data/modules.json has same name twice.
                                    # Each name loads once; duplicates
                                    # produce duplicate init calls.

# DATA
Light theme dividers invisible      # --site-text-rgb is undefined
Missing data file warning           # check path matches REQUIRES_DATA in
                                    # the module's config.js

# ERROR OVERLAY
Shows 9999 z-index                  # js/app.js failed to load; check Network
Module fails to boot                # check console for assertRequirements error
```

## 11. Third-Party Licenses

Pixelian depends on one external asset: **Font Awesome 6.5.0** (Free), loaded via CDN in `index.php`. It is used by the window controls (minimize, maximize, restore, close) and the theme selector widget.

### 11.1 License

Font Awesome Free is released under three licenses, one per asset type:

| Asset                        | License                   | Key condition                                                 |
| ---------------------------- | ------------------------- | ------------------------------------------------------------- |
| Web fonts (`.woff2`, `.ttf`) | SIL Open Font License 1.1 | Redistribution permitted with copyright notice + license text |
| CSS/JS (`.css`, `.js`)       | MIT                       | Include copyright notice + permission text                    |
| Icons (`.svg`, `.js`)        | CC BY 4.0                 | Attribution to Fonticons, Inc. required                       |

### 11.2 Usage in Pixelian

Pixelian links to Font Awesome via CDN:

https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css

The browser fetches the assets from the CDN. **No redistribution occurs from your server.** No extra files are required for CDN usage.

### 11.3 Self-Hosting

If you download Font Awesome and serve it from your own server, you are redistributing the assets and must comply with all three licenses above. Include a `THIRD-PARTY-LICENSES.md` file in your repo containing:

- The copyright notice for Fonticons, Inc.

- The full text of SIL OFL 1.1

- The full text of MIT

- A statement of CC BY 4.0 for icons

The full license texts ship with every Font Awesome download in `LICENSE.txt` at the package root. Copy that file to `THIRD-PARTY-LICENSES.md` and commit it.

### 11.4 Replacing Font Awesome

If you remove Font Awesome:

1. Delete the `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/...">` line from `index.php`.

2. Replace every `<i class="fas fa-...">` icon in the codebase (window controls in `core/window.js`, theme widget in `core/theme.js`) with your own icon solution or a Unicode glyph.
