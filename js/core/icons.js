/**
 * Core icon set. Inline SVG so icons render identically across
 * platforms and inherit the current text color. Used by js/core/window.js
 * and js/core/theme.js. Modules own their icons in
 * js/modules/{name}/icons.js and do not import from this file.
 *
 * Every value is an HTML string. Assign it to `element.innerHTML`, not
 * `element.textContent`. The SVG strings are constants, not user input,
 * so innerHTML is safe here.
 *
 * Every icon is 1em square and uses `currentColor`, so it inherits the
 * color of the button, link, or label it lives in. Theme switching
 * happens through the CSS cascade, not through the icon file.
 *
 * @copyright Copyright (c) 2026 Antranik Agopian
 * @license Pixelian License (see LICENSE)
 * @author Antranik Agopian <hello@antranik.dev>
 */

/* PIXEL */

export const ICON_PIXEL = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M2.5 2.5h11v11h-11z" fill="currentColor"/>
</svg>`;


/* WINDOW CONTROLS */

export const ICON_MINIMIZE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M3 8h10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

export const ICON_MAXIMIZE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <rect x="3.5" y="3.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/>
</svg>`;

export const ICON_RESTORE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M8 2.5 13.5 8 8 13.5 2.5 8Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

export const ICON_CLOSE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

/* THEME */

export const ICON_PALETTE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M8 1.5a6.5 6.5 0 0 0 0 13h.2a2 2 0 0 0 2-2c0-.57-.2-1.1-.46-1.59-.21-.4-.36-.75-.36-1.09 0-.65.47-1.12 1.12-1.12H12c1.86 0 3-1.15 3-2.8C15 3.46 12.04 1.5 8 1.5Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="4.1" cy="8.3" r=".8" fill="currentColor"/>
  <circle cx="5" cy="5.3" r=".8" fill="currentColor"/>
  <circle cx="8" cy="3.9" r=".8" fill="currentColor"/>
  <circle cx="11.2" cy="5.4" r=".8" fill="currentColor"/>
</svg>`;

export const ICON_MOON = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M6.39 2.22A6 6 0 1 0 13.78 9.61A5.5 5.5 0 0 1 6.39 2.22Z" fill="currentColor"/>
</svg>`;


export const ICON_SUN = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <circle cx="8" cy="8" r="2.8" fill="currentColor"/>
  <path d="M8 1v1.8M8 13.2V15M1 8h1.8M13.2 8H15M3.05 3.05l1.27 1.27M11.68 11.68l1.27 1.27M3.05 12.95l1.27-1.27M11.68 4.32l1.27-1.27" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

/* GENERAL PURPOSE (available to modules) */

export const ICON_USER = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <circle cx="8" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <path d="M2.5 13.75c.2-2.65 2.3-4.25 5.5-4.25s5.3 1.6 5.5 4.25" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
</svg>`;

export const ICON_BRIEFCASE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <rect x="1.75" y="5" width="12.5" height="8.5" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <path d="M5.5 5V3.5A1.5 1.5 0 0 1 7 2h2a1.5 1.5 0 0 1 1.5 1.5V5M1.75 8.5c1.8 1.1 4 1.6 6.25 1.6s4.45-.5 6.25-1.6M8 9.2v1.8" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_ENVELOPE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <rect x="1.75" y="3.5" width="12.5" height="9" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <path d="M2.2 4.4 8 8.6l5.8-4.2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_GLOBE = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <path d="M2 8h12M8 2c-1.7 1.6-2.6 3.6-2.6 6s.9 4.4 2.6 6M8 2c1.7 1.6 2.6 3.6 2.6 6s-.9 4.4-2.6 6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_COG = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M8 1l1 2.2 2.4-.3.3 2.4L14 6l-1.4 2 1.4 2-2.3.6-.3 2.4-2.4-.3L8 15l-1-2.3-2.4.3-.3-2.4L2 10l1.4-2L2 6l2.3-.6.3-2.4L7 3.3 8 1z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.3"/>
</svg>`;

export const ICON_ARROW_UP = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export const ICON_NEWSPAPER = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <rect x="1.5" y="4" width="13" height="9" rx="0.5" fill="none" stroke="currentColor" stroke-width="1.3"/>
  <rect x="3.5" y="6" width="4" height="3.2" fill="currentColor" opacity="0.5"/>
  <path d="M9 6h3M9 8h3M9 10h3M3.5 11h8.5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
</svg>`;

export const ICON_TERMINAL = `<svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
  <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.2"/>
  <path d="m4.5 6 2.5 2-2.5 2M8.5 10.5h3" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
