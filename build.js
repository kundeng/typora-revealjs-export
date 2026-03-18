#!/usr/bin/env node
/**
 * Build script for Typora → Reveal.js Export Plugin
 *
 * Produces TWO variants of plugin.txt:
 *
 *   plugin-cdn.txt   (~16 KB)  — loads Reveal.js, plugins, and KaTeX from CDN.
 *                                Requires internet. Tiny, always up to date.
 *
 *   plugin.txt       (~920 KB) — fully self-contained. Every dependency is
 *                                inlined. Works offline / from file://.
 *                                KaTeX fonts still loaded from CDN when math
 *                                is present (no good way to inline woff2).
 *
 * Both files are pasted into:
 *   Typora → Preferences → Export → HTML → "Append in <head />"
 *   Leave "Append in <body />" EMPTY.
 *
 * Usage:
 *   npm install          # first time only
 *   npm run build        # regenerate both plugin files
 */

const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────

const REVEAL_VERSION = '5.2.1';
const KATEX_VERSION  = '0.16.38';
const REVEAL_CDN     = 'https://cdn.jsdelivr.net/npm/reveal.js@' + REVEAL_VERSION;
const KATEX_CDN      = 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION;

// ── Helpers ──────────────────────────────────────────

function pkg(p) {
  return fs.readFileSync(path.join(__dirname, 'node_modules', p), 'utf8');
}
function src(p) {
  return fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
}
function sizeKB(s) {
  return (Buffer.byteLength(s, 'utf8') / 1024).toFixed(0);
}
function writePlugin(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log('  \u2705 ' + name + ': ' + kb + ' KB');
}

// ── Read our source files ────────────────────────────

const customThemeCSS = src('theme.css');
const pluginJS       = src('plugin.js');

// ============================================================
//  1. CDN VERSION  (plugin-cdn.txt)
// ============================================================

console.log('Building plugin-cdn.txt ...');

const cdnParts = [];

cdnParts.push(
  '<!-- Typora \u2192 Reveal.js Export Plugin  (v3.0 \u2014 CDN)',
  '     Paste into: Typora \u2192 Preferences \u2192 Export \u2192 HTML \u2192 Append in <head />',
  '     Requires internet. Uses Reveal.js ' + REVEAL_VERSION + ' + KaTeX ' + KATEX_VERSION + ' from jsDelivr.',
  '     Rebuild: npm run build -->',
  '',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '',
  '<!-- Reveal.js CSS -->',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reset.css">',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reveal.css">',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/theme/white.css" id="revealjs-theme">',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/plugin/highlight/monokai.css">',
  '',
  '<!-- KaTeX CSS -->',
  '<link rel="stylesheet" href="' + KATEX_CDN + '/dist/katex.min.css">',
  '',
  '<!-- Custom theme -->',
  '<style id="revealjs-custom-theme">',
  customThemeCSS,
  '</style>',
  '',
  '<!-- Boot logic: loads Reveal.js + plugins from CDN, transforms Typora HTML -->',
  '<script id="typora-revealjs-plugin">',
  pluginJS,
  '</script>'
);

writePlugin('plugin-cdn.txt', cdnParts.join('\n'));

// ============================================================
//  2. EMBEDDED VERSION  (plugin.txt)
// ============================================================

console.log('Building plugin.txt (embedded) ...');

const assets = {
  resetCSS:      pkg('reveal.js/dist/reset.css'),
  revealCSS:     pkg('reveal.js/dist/reveal.css'),
  whiteThemeCSS: pkg('reveal.js/dist/theme/white.css')
                   .replace(/url\(\.\/fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/')
                   .replace(/url\(fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/'),
  monokaiCSS:    pkg('reveal.js/plugin/highlight/monokai.css'),
  katexCSS:      pkg('katex/dist/katex.min.css')
                   .replace(/url\(fonts\//g, 'url(' + KATEX_CDN + '/dist/fonts/'),
  revealJS:      pkg('reveal.js/dist/reveal.js'),
  highlightJS:   pkg('reveal.js/plugin/highlight/highlight.js'),
  notesJS:       pkg('reveal.js/plugin/notes/notes.js'),
  searchJS:      pkg('reveal.js/plugin/search/search.js'),
  zoomJS:        pkg('reveal.js/plugin/zoom/zoom.js'),
  katexJS:       pkg('katex/dist/katex.min.js'),
  katexAutoJS:   pkg('katex/dist/contrib/auto-render.min.js'),
};

// Print size report
console.log('  Asset sizes:');
for (const [k, v] of Object.entries(assets)) {
  console.log('    ' + k.padEnd(18) + sizeKB(v).padStart(6) + ' KB');
}
console.log('    ' + 'theme.css'.padEnd(18) + sizeKB(customThemeCSS).padStart(6) + ' KB');
console.log('    ' + 'plugin.js'.padEnd(18) + sizeKB(pluginJS).padStart(6) + ' KB');

// All Reveal.js plugins use a UMD wrapper that checks `typeof exports`.
// When Typora (or any Node-ish context) defines `exports`, the plugin
// assigns to module.exports instead of window.RevealXxx.
// The zoom plugin also accesses document.body.style at parse time,
// which is null when the script runs in <head>.
// Fix: wrap each plugin script in a scope that shadows exports/module/define,
// and for the zoom plugin, also patch document.body access.
function wrapUmd(js) {
  return '(function(){var exports=void 0,module=void 0,define=void 0;\n' + js + '\n})();';
}

function fixZoom(js) {
  // Patch the two parse-time document.body accesses in the zoom IIFE:
  //   l="transform"in document.body.style  →  lazy check
  //   l&&(document.body.style.transition=   →  guarded
  return js
    .replace(
      'l="transform"in document.body.style',
      'l=document.body?"transform"in document.body.style:true'
    )
    .replace(
      'l&&(document.body.style.transition=',
      'l&&document.body&&(document.body.style.transition='
    );
}

const embParts = [];

embParts.push(
  '<!-- Typora \u2192 Reveal.js Export Plugin  (v3.0 \u2014 self-contained)',
  '     Paste into: Typora \u2192 Preferences \u2192 Export \u2192 HTML \u2192 Append in <head />',
  '     Bundled: Reveal.js ' + REVEAL_VERSION + ' \u2022 highlight.js \u2022 KaTeX ' + KATEX_VERSION + ' \u2022 notes \u2022 search \u2022 zoom',
  '     External: KaTeX fonts (CDN, loaded when math is present)',
  '     Rebuild: npm run build -->',
  '',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
  '<meta name="mobile-web-app-capable" content="yes">'
);

// CSS — all inlined
embParts.push(
  '',
  '<style id="revealjs-reset-css">' + assets.resetCSS + '</style>',
  '<style id="revealjs-core-css">' + assets.revealCSS + '</style>',
  '<style id="revealjs-theme">' + assets.whiteThemeCSS + '</style>',
  '<style id="revealjs-highlight-theme">' + assets.monokaiCSS + '</style>',
  '<style id="katex-css">' + assets.katexCSS + '</style>',
  '<style id="revealjs-custom-theme">' + customThemeCSS + '</style>'
);

// JS — all inlined, wrapped to fix UMD issues
embParts.push(
  '',
  '<script id="revealjs-core-js">' + wrapUmd(assets.revealJS) + '</script>',
  '<script id="revealjs-highlight-plugin">' + wrapUmd(assets.highlightJS) + '</script>',
  '<script id="revealjs-notes-plugin">' + wrapUmd(assets.notesJS) + '</script>',
  '<script id="revealjs-search-plugin">' + wrapUmd(assets.searchJS) + '</script>',
  '<script id="revealjs-zoom-plugin">' + wrapUmd(fixZoom(assets.zoomJS)) + '</script>',
  '',
  '<script id="katex-js">' + assets.katexJS + '</script>',
  '<script id="katex-auto-render">' + assets.katexAutoJS + '</script>',
  '',
  '<script id="typora-revealjs-plugin">' + pluginJS + '</script>'
);

writePlugin('plugin.txt', embParts.join('\n'));

console.log('\nDone.');
