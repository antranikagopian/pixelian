#!/bin/bash
# First-run configuration. Verifies PHP 8.4.27+ (hard) and
# nginx 1.26.3+ (soft - production only), prompts for project
# details, and substitutes the Your* placeholders across index.php,
# data/*.json, robots.txt, sitemap.xml, and site.webmanifest.
# Idempotent: exits early if already configured. Run once, then
# preview with:
#   php -S localhost:8000
#
# @copyright Copyright (c) 2026 Antranik Agopian. Antranik License 1.0.
# @author Antranik Agopian <hello@antranik.dev>
# @version 1.0.0

set -euo pipefail
cd "$(dirname "$0")"

# PREREQUISITES

if ! command -v php >/dev/null 2>&1; then
    echo "setup.sh: PHP is required. Install PHP 8.4.27+ and re-run." >&2
    exit 1
fi

if ! php -r 'exit(version_compare(PHP_VERSION, "8.4.27", ">=") ? 0 : 1);'; then
    echo "setup.sh: PHP 8.4.27+ required (found $(php -r 'echo PHP_VERSION;'))." >&2
    echo "  Upgrade PHP and re-run." >&2
    exit 1
fi

# nginx is a production requirement, not a local-dev requirement. Warn
# on older versions, note when absent - never fail. Setup runs on dev
# machines where php -S is the preview server and nginx is not installed.
if command -v nginx >/dev/null 2>&1; then
    NGINX_VERSION=$(nginx -v 2>&1 | sed -nE 's|.*nginx/([0-9.]+).*|\1|p' | head -1)
    if [ -n "$NGINX_VERSION" ]; then
        if ! NGINX_VER="$NGINX_VERSION" php -r 'exit(version_compare(getenv("NGINX_VER"), "1.26.3", ">=") ? 0 : 1);'; then
            echo "setup.sh: warning - nginx $NGINX_VERSION detected, 1.26.3+ required for production." >&2
        fi
    fi
else
    echo "setup.sh: note - nginx not detected. Fine for local dev (php -S); 1.26.3+ required for production."
fi

# IDEMPOTENCY GUARD

if [ ! -f "index.php" ]; then
    echo "setup.sh: run from the project root (index.php not found)." >&2
    exit 1
fi

TARGETS="index.php data/site.json data/card.json robots.txt sitemap.xml site.webmanifest"
FOUND=0
for f in $TARGETS; do
    if [ -f "$f" ] && grep -Eq "Your[A-Z]" "$f" 2>/dev/null; then
        FOUND=1
        break
    fi
done
if [ "$FOUND" -eq 0 ]; then
    echo "setup.sh: no placeholders found. Nothing to do."
    echo "  To re-run, restore the Your* placeholders in any target file."
    exit 0
fi

# PROMPTS

echo ""
echo "Pixelian: first-run setup"
echo ""

read -rp "Project name:                       " PROJECT
read -rp "Tagline:                            " TAGLINE
read -rp "SEO description (60-160 chars):     " DESCRIPTION
read -rp "SEO keywords (comma-separated):     " KEYWORDS
read -rp "Author name:                        " AUTHOR
read -rp "Domain (no https://, e.g. foo.com): " DOMAIN
read -rp "Contact email:                      " EMAIL
read -rp "Copyright holder:                   " COPYRIGHT

echo ""

# Empty required fields abort cleanly before any file is touched.
if [ -z "$PROJECT" ]; then
    echo "setup.sh: project name is empty. Aborting." >&2
    exit 1
fi
if [ -z "$DOMAIN" ]; then
    echo "setup.sh: domain is empty. Aborting." >&2
    exit 1
fi

# CONFIRM

echo "About to write:"
echo "  Project:      $PROJECT"
echo "  Tagline:      $TAGLINE"
echo "  Description:  $DESCRIPTION"
echo "  Keywords:     $KEYWORDS"
echo "  Author:       $AUTHOR"
echo "  Domain:       $DOMAIN"
echo "  Email:        $EMAIL  (entity-encoded in HTML)"
echo "  Copyright:    $COPYRIGHT"
echo ""
read -rp "Proceed? (y/N) " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }

# SUBSTITUTE
#
# Uses PHP because:
#   - PHP is already a hard dependency (this is a PHP project)
#   - strtr() does exact string replacement without regex escaping pitfalls
#   - Handles quotes, backslashes, ampersands, and UTF-8 in user input
#   - Works identically on Linux, macOS, and WSL
#
# Values are passed via environment variables (not shell interpolation)
# so anything the user types is safe. Heredoc is quoted ('PHP') so the
# shell does not expand anything inside.

export SETUP_PROJECT="$PROJECT"
export SETUP_TAGLINE="$TAGLINE"
export SETUP_DESCRIPTION="$DESCRIPTION"
export SETUP_KEYWORDS="$KEYWORDS"
export SETUP_AUTHOR="$AUTHOR"
export SETUP_DOMAIN="$DOMAIN"
export SETUP_EMAIL="$EMAIL"
export SETUP_COPYRIGHT="$COPYRIGHT"

php <<'PHP'
<?php
/* Substitution table. YourEmail is entity-encoded for the .no-js fallback
   obfuscation (defeats scrapers that grep for plaintext addresses). */
$replacements = [
    'YourProject'     => getenv('SETUP_PROJECT'),
    'YourTagline'     => getenv('SETUP_TAGLINE'),
    'YourDescription' => getenv('SETUP_DESCRIPTION'),
    'YourKeywords'    => getenv('SETUP_KEYWORDS'),
    'YourAuthor'      => getenv('SETUP_AUTHOR'),
    'YourDomain'      => getenv('SETUP_DOMAIN'),
    'YourEmail'       => str_replace(
        ['@', '.'],
        ['&#64;', '&#46;'],
        getenv('SETUP_EMAIL')
    ),
    'YourCopyright'   => getenv('SETUP_COPYRIGHT'),
];

/* Files that carry placeholders. Missing files are skipped with a warning. */
$files = [
    'index.php',
    'data/site.json',
    'data/card.json',
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest',
];

foreach ($files as $file) {
    if (!is_file($file)) {
        fwrite(STDERR, "  warn: $file not found, skipped.\n");
        continue;
    }
    $content = file_get_contents($file);
    /* strtr() does a simultaneous, longest-key-first replacement.
       Keys are distinct and non-overlapping here, so strtr's behavior
       is straightforward: every Your* placeholder becomes its value.
       Replaced substrings are not re-searched, so a project name that
       happens to contain another placeholder cannot cause recursion. */
    $content = strtr($content, $replacements);
    file_put_contents($file, $content);
    echo "  wrote: $file\n";
}
PHP

# MEDIA DIRECTORY
#
# Created empty with .gitkeep so the directory exists in a fresh clone.
# Users fill it with their own assets (project GIFs, client logos, OG image).

if [ ! -d "media" ]; then
    mkdir -p media
    touch media/.gitkeep
    echo "  created: media/ (empty, add your assets here)"
fi

# DONE

echo ""
echo "Setup complete."
echo ""
echo "Next steps:"
echo "  1. Review index.php and data/*.json for anything you want to tweak."
echo "  2. Replace icons/ with your project's favicon set."
echo "  3. Preview:  php -S localhost:8000"
echo "     Open:     http://localhost:8000"
echo ""
echo "Before going live, see GUIDE.md section 9 for the full deploy"
echo "checklist and the PRODUCTION CLEANUP list."
echo ""