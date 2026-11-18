#!/bin/bash
# First-run project setup and optional production cleanup.
# Requires PHP 8.4.27+; nginx 1.26.3+ is checked when installed.
# Configures Your* placeholders, then offers separate cleanup prompts
# for a deployment copy. Nothing is deleted by default.
# Local preview: php -S localhost:8000
#
# @copyright Copyright (c) 2026 Antranik Agopian
# @license Pixelian License (see LICENSE)
# @author Antranik Agopian <hello@antranik.dev>

set -euo pipefail
cd "$(dirname "$0")"

# PREREQUISITES

if ! command -v php >/dev/null 2>&1; then
    echo "setup.sh: PHP 8.4.27+ is required." >&2
    exit 1
fi

if ! php -r 'exit(version_compare(PHP_VERSION, "8.4.27", ">=") ? 0 : 1);'; then
    echo "setup.sh: PHP 8.4.27+ required (found $(php -r 'echo PHP_VERSION;'))." >&2
    exit 1
fi

if command -v nginx >/dev/null 2>&1; then
    NGINX_VERSION=$(nginx -v 2>&1 | sed -nE 's|.*nginx/([0-9.]+).*|\1|p' | head -1)
    if [ -n "$NGINX_VERSION" ] && ! NGINX_VER="$NGINX_VERSION" php -r 'exit(version_compare(getenv("NGINX_VER"), "1.26.3", ">=") ? 0 : 1);'; then
        echo "setup.sh: warning - nginx $NGINX_VERSION detected; 1.26.3+ expected for production." >&2
    fi
else
    echo "setup.sh: nginx not detected (not needed for local development)."
fi

# FIRST-RUN CHECK

if [ ! -f index.php ]; then
    echo "setup.sh: index.php not found. Run from the project root." >&2
    exit 1
fi

TARGETS=(index.php data/site.json data/card.json robots.txt sitemap.xml site.webmanifest)
FOUND=0
for file in "${TARGETS[@]}"; do
    if [ -f "$file" ] && grep -Eq 'Your[A-Z]' "$file"; then
        FOUND=1
        break
    fi
done

# PRODUCTION CLEANUP (OPTIONAL)

# Cleanup is intentionally limited to known non-runtime paths. Do not
# delete files by extension: CSS, images, XML, TXT, and webmanifest files
# are also needed by Pixelian. Keep LICENSE in every distribution.
# Only run this on a separate deployment copy, not the source checkout.

ask_yes() {
    local answer
    read -r -p "$1 [y/N] " answer || return 1
    [[ "$answer" == "y" || "$answer" == "Y" ]]
}

cleanup_files() {
    CLEANUP_REMOVED=0
    local description="$1"
    shift
    local items=("$@")
    if [ "${#items[@]}" -eq 0 ]; then
        printf '\n%s: nothing to remove.\n' "$description"
        return 0
    fi

    printf '\n%s:\n' "$description"
    printf '  %s\n' "${items[@]}"
    if ask_yes "Remove these items?"; then
        local path
        for path in "${items[@]}"; do
            rm -rf -- "$path"
            printf '  removed: %s\n' "$path"
        done
        CLEANUP_REMOVED=1
    else
        echo "  kept."
    fi
}

optional_cleanup() {
    printf '\nOptional production cleanup\n'
    echo "This removes non-runtime files from the CURRENT directory."
    echo "Use only in a separate deployed copy, never in your source checkout."
    echo "Keep LICENSE and all runtime assets (PHP, JS, JSON, CSS, icons,"
    echo "media, robots.txt, sitemap.xml, and site.webmanifest)."

    if ! ask_yes "Review cleanup options?"; then
        echo "Cleanup skipped."
        return 0
    fi

    local acknowledgment
    read -r -p 'Type DEPLOY to confirm this is a deployment copy: ' acknowledgment || return 0
    if [ "$acknowledgment" != "DEPLOY" ]; then
        echo "Cleanup cancelled."
        return 0
    fi

    # 1. Root Markdown and Markdown inside docs/. Never remove other
    #    files from docs/ - future projects may store needed assets there.
    local markdown=() path
    for path in ./*.md; do
        [ -f "$path" ] && markdown+=("$path")
    done
    if [ -d ./docs ]; then
        while IFS= read -r -d '' path; do
            markdown+=("$path")
        done < <(find ./docs -type f -name '*.md' -print0)
    fi
    cleanup_files "1. Markdown documentation" "${markdown[@]}"
    # Remove empty docs/ directories only after approved documentation
    # removal. Leave any remaining non-Markdown assets untouched.
    if [ "$CLEANUP_REMOVED" -eq 1 ] && [ -d ./docs ]; then
        find ./docs -depth -type d -empty -delete
    fi

    # 2. Known Git/editor-only metadata, not arbitrary hidden files.
    local metadata=()
    for path in ./.gitignore ./.gitattributes ./.gitmodules ./.editorconfig \
                ./.github ./.vscode ./.idea ./media/.gitkeep; do
        if [ -e "$path" ] || [ -L "$path" ]; then
            metadata+=("$path")
        fi
    done
    cleanup_files "2. Git/editor configuration" "${metadata[@]}"

    # 3. The nginx example is a reference, not a runtime file.
    #    Copy the active config to the server configuration first.
    if [ -f ./nginx.example.conf ]; then
        echo "Copy and configure nginx.example.conf outside the document root first."
        cleanup_files "3. Example nginx configuration" ./nginx.example.conf
    else
        echo "3. Example nginx configuration: nothing to remove."
    fi

    # 4. Removing .git is irreversible for this copy. Never do this in
    #    the working source checkout. Require an extra exact phrase.
    if [ -e ./.git ] || [ -L ./.git ]; then
        printf '\n4. Git history: ./.git\n'
        echo "WARNING: removes commit history and Git metadata from this copy."
        if ask_yes "Remove .git from this deployment copy?"; then
            local git_confirmation
            read -r -p 'Type DELETE GIT to confirm: ' git_confirmation || return 0
            if [ "$git_confirmation" = 'DELETE GIT' ]; then
                rm -rf -- ./.git
                echo "  removed: ./.git"
            else
                echo "  kept: confirmation did not match."
            fi
        else
            echo "  kept."
        fi
    else
        echo "4. Git history: nothing to remove."
    fi

    # 5. Self-removal MUST be the final step. This script is only
    #    needed for setup and should not be served from a public root.
    if [ -f ./setup.sh ]; then
        printf '\n5. Setup script: ./setup.sh\n'
        if ask_yes "Remove setup.sh from this deployment copy?"; then
            rm -f -- ./setup.sh
            echo "  removed: ./setup.sh"
        else
            echo "  kept."
        fi
    fi

    printf '\nCleanup review finished. Verify the deployed site and nginx deny rules.\n'
}

# MAIN

if [ "$FOUND" -eq 0 ]; then
    echo "setup.sh: no placeholders found. Project already configured."
else
# PROJECT DETAILS

printf '\nPixelian: first-run setup\n\n'
read -rp "Project name:                       " PROJECT
read -rp "Tagline:                            " TAGLINE
read -rp "SEO description:                    " DESCRIPTION
read -rp "SEO keywords (comma-separated):     " KEYWORDS
read -rp "Author name:                        " AUTHOR
read -rp "Domain (e.g. example.com):          " DOMAIN
read -rp "Contact email:                      " EMAIL
read -rp "Copyright holder:                   " COPYRIGHT

if [ -z "$PROJECT" ] || [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "setup.sh: project name, domain, and contact email are required." >&2
    exit 1
fi

if ! SETUP_DOMAIN="$DOMAIN" php -r 'exit(filter_var(getenv("SETUP_DOMAIN"), FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) ? 0 : 1);'; then
    echo "setup.sh: enter a domain name without https://, a path, or a port." >&2
    exit 1
fi

if ! SETUP_EMAIL="$EMAIL" php -r 'exit(filter_var(getenv("SETUP_EMAIL"), FILTER_VALIDATE_EMAIL) ? 0 : 1);'; then
    echo "setup.sh: invalid contact email." >&2
    exit 1
fi

# CONFIRM

printf '\nAbout to write:\n'
printf '  Project:      %s\n' "$PROJECT"
printf '  Tagline:      %s\n' "$TAGLINE"
printf '  Description:  %s\n' "$DESCRIPTION"
printf '  Keywords:     %s\n' "$KEYWORDS"
printf '  Author:       %s\n' "$AUTHOR"
printf '  Domain:       %s\n' "$DOMAIN"
printf '  Email:        %s\n' "$EMAIL"
printf '  Copyright:    %s\n\n' "$COPYRIGHT"
read -rp "Proceed? (y/N) " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Cancelled."; exit 1; }

# SUBSTITUTE
# Pass user values through the environment, then escape them for the
# target format. Raw strtr() alone is not safe for JSON, HTML, or JS.

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
$replacements = [
    'YourProject'     => getenv('SETUP_PROJECT'),
    'YourTagline'     => getenv('SETUP_TAGLINE'),
    'YourDescription' => getenv('SETUP_DESCRIPTION'),
    'YourKeywords'    => getenv('SETUP_KEYWORDS'),
    'YourAuthor'      => getenv('SETUP_AUTHOR'),
    'YourDomain'      => getenv('SETUP_DOMAIN'),
    'YourEmail'       => getenv('SETUP_EMAIL'),
    'YourCopyright'   => getenv('SETUP_COPYRIGHT'),
];

$files = [
    'index.php',
    'data/site.json',
    'data/card.json',
    'robots.txt',
    'sitemap.xml',
    'site.webmanifest',
];

$encodeHtml = static fn(string $value): string =>
    htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
$encodeXml = static fn(string $value): string =>
    htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_XML1, 'UTF-8');
$encodeJs = static fn(string $value): string => json_encode(
    $value,
    JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
        | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
);

$replaceJsonValues = static function ($node) use (&$replaceJsonValues, $replacements) {
    if (is_string($node)) return strtr($node, $replacements);
    if (!is_array($node)) return $node;
    foreach ($node as $key => $value) {
        $node[$key] = $replaceJsonValues($value);
    }
    return $node;
};

/* Prepare every file before writing, so invalid JSON does not cause
   partially substituted configuration files. */
$updates = [];
try {
    foreach ($files as $file) {
        if (!is_file($file)) {
            fwrite(STDERR, "  warning: $file not found, skipped.\n");
            continue;
        }
        $source = file_get_contents($file);
        if ($source === false) throw new RuntimeException("Cannot read $file");

        if (str_ends_with($file, '.json') || $file === 'site.webmanifest') {
            $data = json_decode($source, true, 512, JSON_THROW_ON_ERROR);
            $updated = json_encode(
                $replaceJsonValues($data),
                JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
                    | JSON_THROW_ON_ERROR
            ) . "\n";
        } elseif ($file === 'index.php') {
            /* The existing inline SITE_CONFIG uses JS string literals.
               Replace those assignments with safe, JSON-encoded JS strings. */
            foreach (['brandLogo' => 'YourProject', 'brandName' => 'YourProject', 'tagline' => 'YourTagline'] as $property => $token) {
                $pattern = '/(\b' . preg_quote($property, '/') . '\s*:\s*)\'' . preg_quote($token, '/') . '\'/';
                $source = preg_replace_callback(
                    $pattern,
                    static fn(array $m): string => $m[1] . $encodeJs($replacements[$token]),
                    $source
                );
            }

            $htmlValues = array_map($encodeHtml, $replacements);
            /* Keep the contact email lightly obfuscated in HTML source. */
            $htmlValues['YourEmail'] = str_replace(
                ['@', '.'], ['&#64;', '&#46;'], $htmlValues['YourEmail']
            );
            $updated = strtr($source, $htmlValues);
        } elseif ($file === 'sitemap.xml') {
            $updated = strtr($source, array_map($encodeXml, $replacements));
        } else {
            $updated = strtr($source, $replacements);
        }

        $updates[$file] = $updated;
    }

    foreach ($updates as $file => $contents) {
        if (file_put_contents($file, $contents) === false) {
            throw new RuntimeException("Cannot write $file");
        }
        echo "  wrote: $file\n";
    }
} catch (Throwable $e) {
    fwrite(STDERR, "setup.sh: " . $e->getMessage() . "\n");
    exit(1);
}
PHP

# MEDIA DIRECTORY

if [ ! -d media ]; then
    mkdir -p media
    touch media/.gitkeep
    echo "  created: media/"
fi

    printf '\nSetup complete.\n'
fi

printf '\nBefore going live, review docs/deployment.md in your source copy.\n'
echo "Local preview: php -S localhost:8000 (http://localhost:8000)"
optional_cleanup
