---
revealjs-theme: white
revealjs-transition: slide
revealjs-slideNumber: true
---

# Teaching `build.js`

## A code-first Reveal.js walkthrough

Learn Node.js, JavaScript, and build tooling from the real file

---

## What This File Does

`build.js` is a packaging script.

It reads:

```js
src/theme.css
src/plugin.js
node_modules/reveal.js/...
node_modules/katex/...
```

It writes:

```js
plugin-cdn.txt
plugin.txt
```

Those output files get pasted into Typora's HTML export settings.

---

## Source We Are Studying

```js
#!/usr/bin/env node
/**
 * Build script for Typora → Reveal.js Export Plugin
 *
 * Produces TWO variants of plugin.txt:
 *
 *   plugin-cdn.txt   (~16 KB)
 *   plugin.txt       (~920 KB)
 */
```

- Line `1` is a shebang.
- Lines `2-9` are a block comment for humans.
- The file announces its contract before any code runs.

---

## Line 1: Shebang

```js
#!/usr/bin/env node
```

- Unix shells read this before Node does.
- `env node` asks the system to find the `node` executable in `PATH`.
- That lets someone run the script directly if the file is executable.

Equivalent command:

```bash
node build.js
```

---

## Lines 24-25: Core Modules

```js
const fs = require('fs');
const path = require('path');
```

- `require(...)` loads a CommonJS module.
- `fs` is Node's built-in filesystem library.
- `path` is Node's built-in path utility library.
- `const` means the binding will not be reassigned.

Teaching point:

```js
const name = 'build.js';   // allowed
name = 'other.js';         // error
```

---

## Why `fs` And `path` Matter

```js
fs.readFileSync(...)
fs.writeFileSync(...)
fs.statSync(...)
path.join(...)
```

- `fs` gives this script read/write access to files.
- `path.join(...)` avoids hardcoding slashes.
- These are Node standard library modules, so no npm install is needed for them.

---

## Lines 29-32: Configuration

```js
const REVEAL_VERSION = '5.2.1';
const KATEX_VERSION  = '0.16.38';
const REVEAL_CDN     = 'https://cdn.jsdelivr.net/npm/reveal.js@' + REVEAL_VERSION;
const KATEX_CDN      = 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION;
```

- These are constants.
- The first two are primitive strings.
- The next two are derived strings built from those versions.

This is plain JavaScript concatenation:

```js
'hello ' + 'world'   // "hello world"
```

---

## Why This Is Good Build-Script Design

```js
const REVEAL_VERSION = '5.2.1';
```

- One source of truth for each dependency version.
- If the project upgrades Reveal.js, one line changes.
- Hardcoding the version into many URLs would be brittle.

This is a basic config pattern you see in real build tools.

---

## Lines 36-38: Helper `pkg`

```js
function pkg(p) {
  return fs.readFileSync(path.join(__dirname, 'node_modules', p), 'utf8');
}
```

- `function pkg(p)` declares a named function.
- `p` is a parameter.
- `__dirname` is a Node global: the current file's directory.
- `path.join(...)` builds a full path.
- `readFileSync(..., 'utf8')` returns a string.

Example idea:

```js
pkg('reveal.js/dist/reveal.js')
```

That reads a file from `node_modules`.

---

## Important Node Concept: `__dirname`

```js
path.join(__dirname, 'node_modules', p)
```

- `__dirname` is not the shell's current directory.
- It is the directory that contains `build.js`.
- That makes the script robust even if run from another folder.

Without `__dirname`, this can break:

```bash
cd /tmp
node /path/to/project/build.js
```

---

## Lines 39-41: Helper `src`

```js
function src(p) {
  return fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
}
```

- Same pattern as `pkg(...)`.
- Different target folder.
- This is a small refactor that removes repeated code.

Instead of repeating:

```js
fs.readFileSync(path.join(__dirname, 'src', 'theme.css'), 'utf8')
```

the file can later say:

```js
src('theme.css')
```

---

## Lines 42-44: Helper `sizeKB`

```js
function sizeKB(s) {
  return (Buffer.byteLength(s, 'utf8') / 1024).toFixed(0);
}
```

- `Buffer.byteLength(...)` measures bytes.
- That matters because file size is about bytes, not characters.
- `/ 1024` converts bytes to kilobytes.
- `.toFixed(0)` rounds and returns a string.

Teaching point:

```js
(1536 / 1024).toFixed(0)   // "2"
```

---

## Why `Buffer.byteLength` Instead Of `s.length`

```js
Buffer.byteLength(s, 'utf8')
```

- `s.length` counts JavaScript string code units.
- File size on disk is about encoded bytes.
- UTF-8 characters can use more than one byte.

So `Buffer.byteLength(...)` is the correct Node choice here.

---

## Lines 45-50: Helper `writePlugin`

```js
function writePlugin(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log('  ✅ ' + name + ': ' + kb + ' KB');
}
```

- `name` is the output filename.
- `content` is the full string to write.
- `writeFileSync` writes the file.
- `statSync(...).size` gets the actual on-disk size.
- `console.log(...)` prints a build report.

---

## Synchronous I/O Is Fine Here

```js
fs.readFileSync(...)
fs.writeFileSync(...)
fs.statSync(...)
```

- These APIs block the Node event loop.
- That is acceptable in a short CLI build script.
- This is not a web server handling many requests.

Rule of thumb:

- server code: prefer async
- tiny build script: sync is often simpler and fine

---

## Lines 54-55: Read Local Project Files

```js
const customThemeCSS = src('theme.css');
const pluginJS       = src('plugin.js');
```

- `customThemeCSS` becomes a big string of CSS.
- `pluginJS` becomes a big string of browser JavaScript.
- The script is not executing those files here.
- It is loading their text so it can embed that text into HTML.

That distinction matters.

---

## Data Type Check

```js
const customThemeCSS = src('theme.css');
```

After this line:

```js
typeof customThemeCSS   // "string"
```

The script is assembling strings, not ASTs, not modules, and not DOM nodes.

This is text-based build tooling.

---

## Lines 61-63: Start The CDN Build

```js
console.log('Building plugin-cdn.txt ...');

const cdnParts = [];
```

- First line tells the user what stage is happening.
- Second line creates an array.
- The array will collect many pieces of HTML.

This is a common build pattern:

```js
parts.push('a')
parts.push('b')
parts.join('\n')
```

---

## Lines 65-92: Build The HTML Head

```js
cdnParts.push(
  '<!-- Typora → Reveal.js Export Plugin  (v3.0 — CDN)',
  '     Requires internet. Uses Reveal.js ' + REVEAL_VERSION + ' + KaTeX ' + KATEX_VERSION + ' from jsDelivr.',
  '',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reset.css">',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reveal.css">'
);
```

- `push(...)` can accept many items at once.
- Every item here is a string.
- Together those strings form HTML that Typora will inject into `<head>`.

---

## Teaching `Array.prototype.push`

```js
const cdnParts = [];

cdnParts.push('A');
cdnParts.push('B', 'C');
```

Now:

```js
cdnParts   // ['A', 'B', 'C']
```

That is why this file can call one large `push(...)` with dozens of strings.

---

## Real HTML Assembly

```js
'<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reset.css">'
```

This becomes something like:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/reset.css">
```

So the script is generating finished HTML as a string.

---

## Inline CSS In The Output

```js
'<style id="revealjs-custom-theme">',
customThemeCSS,
'</style>',
```

- The opening tag is one string.
- `customThemeCSS` is another string loaded from disk.
- The closing tag is another string.

Joined together, the final HTML contains a real inline `<style>` block.

---

## Inline JavaScript In The Output

```js
'<script id="typora-revealjs-plugin">',
pluginJS,
'</script>'
```

- Same pattern as the `<style>` block.
- The file is embedding browser code directly into the generated plugin text.
- This lets Typora export a self-booting HTML presentation.

---

## Line 94: Finish The CDN File

```js
writePlugin('plugin-cdn.txt', cdnParts.join('\n'));
```

- `join('\n')` combines the array into one big string.
- The newline separator keeps the generated HTML readable.
- `writePlugin(...)` then saves it to disk.

Simple example:

```js
['a', 'b', 'c'].join('\n')
```

becomes:

```txt
a
b
c
```

---

## Lines 102-118: Build An Asset Object

```js
const assets = {
  resetCSS:      pkg('reveal.js/dist/reset.css'),
  revealCSS:     pkg('reveal.js/dist/reveal.css'),
  monokaiCSS:    pkg('reveal.js/plugin/highlight/monokai.css'),
  revealJS:      pkg('reveal.js/dist/reveal.js'),
  highlightJS:   pkg('reveal.js/plugin/highlight/highlight.js'),
  notesJS:       pkg('reveal.js/plugin/notes/notes.js'),
  searchJS:      pkg('reveal.js/plugin/search/search.js'),
  zoomJS:        pkg('reveal.js/plugin/zoom/zoom.js')
};
```

- This is an object literal.
- Each key is a readable name.
- Each value is file content loaded from `node_modules`.

---

## Why Use An Object Here

```js
assets.revealJS
assets.zoomJS
assets.katexCSS
```

- Dot notation is readable.
- The code does not need to remember numeric indexes.
- This is better than:

```js
assets[0]
assets[1]
assets[2]
```

for named resources.

---

## Lines 105-110: Rewriting CSS URLs

```js
whiteThemeCSS: pkg('reveal.js/dist/theme/white.css')
  .replace(/url\(\.\/fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/')
  .replace(/url\(fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/'),
```

- `pkg(...)` returns a CSS string.
- `.replace(...)` returns a new modified string.
- The regex finds relative font URLs inside the CSS.
- The replacement rewrites them into absolute CDN URLs.

---

## Why This Rewrite Is Necessary

Suppose the original CSS contains:

```css
src: url(./fonts/source-sans-pro.woff) format('woff');
```

After embedding CSS into a random HTML file, that relative path may break.

So the build script converts it to a full URL like:

```css
src: url(https://cdn.jsdelivr.net/npm/reveal.js@5.2.1/dist/theme/fonts/source-sans-pro.woff) format('woff');
```

---

## Regex And `.replace(...)`

```js
.replace(/url\(\.\/fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/')
```

- `/.../g` means a regular expression with the global flag.
- `\(` escapes a literal parenthesis.
- The goal is not "learn all regex now".
- The goal is: build scripts often transform raw text with regex.

That is a very normal JavaScript tooling pattern.

---

## KaTeX Follows The Same Pattern

```js
katexCSS: pkg('katex/dist/katex.min.css')
  .replace(/url\(fonts\//g, 'url(' + KATEX_CDN + '/dist/fonts/'),
```

- Read distributed CSS from the package.
- Rewrite font paths.
- Store the final string in `assets.katexCSS`.

This is one of the core jobs of this build file:
prepare third-party assets so they survive being inlined.

---

## Lines 121-126: Print Asset Sizes

```js
console.log('  Asset sizes:');
for (const [k, v] of Object.entries(assets)) {
  console.log('    ' + k.padEnd(18) + sizeKB(v).padStart(6) + ' KB');
}
```

- `Object.entries(assets)` turns the object into key-value pairs.
- `const [k, v]` is destructuring assignment.
- `for ... of` loops over those pairs.
- `padEnd` and `padStart` align the output.

---

## Destructuring Example

```js
const pair = ['revealJS', '...big string...'];
const [k, v] = pair;
```

After this:

```js
k   // 'revealJS'
v   // '...big string...'
```

That is what the loop is doing on each iteration.

---

## Lines 128-134: The Compatibility Problem

```js
// All Reveal.js plugins use a UMD wrapper that checks `typeof exports`.
// When Typora (or any Node-ish context) defines `exports`, the plugin
// assigns to module.exports instead of window.RevealXxx.
// The zoom plugin also accesses document.body.style at parse time,
// which is null when the script runs in <head>.
```

- This comment is unusually important.
- It explains a real bug caused by runtime environment assumptions.
- Good build tooling often includes compatibility fixes like this.

---

## What UMD Means Here

UMD is a wrapper pattern that tries to run in different environments:

```js
if (typeof exports === 'object') {
  module.exports = factory();
} else {
  window.SomeGlobal = factory();
}
```

If Typora looks Node-like, a browser plugin may choose the wrong branch.

That is exactly the problem this script works around.

---

## Lines 135-137: `wrapUmd`

```js
function wrapUmd(js) {
  return '(function(){var exports=void 0,module=void 0,define=void 0;\n' + js + '\n})();';
}
```

- This function receives JavaScript source text.
- It returns new JavaScript source text.
- The returned text wraps the original code inside an IIFE.
- It shadows `exports`, `module`, and `define`.

That pushes UMD code toward browser behavior.

---

## IIFE Teaching Moment

```js
(function () {
  console.log('runs immediately');
})();
```

This is an IIFE:

- Immediately
- Invoked
- Function
- Expression

`wrapUmd(...)` generates one as a string.

---

## Why `void 0`?

```js
var exports=void 0,module=void 0,define=void 0;
```

- `void 0` evaluates to `undefined`.
- It is an old-school JavaScript idiom.
- So inside the wrapper, those names exist but are undefined.

That makes checks like this fail safely:

```js
typeof exports === 'object'
```

---

## Lines 139-152: `fixZoom`

```js
function fixZoom(js) {
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
```

- This function patches one vendor file by string replacement.
- It is surgical, not general-purpose parsing.
- The goal is to avoid touching `document.body` before it exists.

---

## The DOM Timing Bug

This is unsafe if the script runs in `<head>` before `<body>` exists:

```js
document.body.style
```

So the patch changes the logic to something guarded:

```js
document.body ? "transform" in document.body.style : true
```

That is a classic defensive JavaScript pattern.

---

## Why String-Patching Vendor Code Can Be OK

- In app code, patching minified vendor text is usually a last resort.
- In a build script, a narrow compatibility patch can be the simplest fix.
- The comments above the function make the choice maintainable.

This file is honest about the tradeoff.

---

## Lines 154-165: Start The Embedded Build

```js
const embParts = [];

embParts.push(
  '<!-- Typora → Reveal.js Export Plugin  (v3.0 — self-contained)',
  '     Bundled: Reveal.js ' + REVEAL_VERSION + ' • highlight.js • KaTeX ' + KATEX_VERSION + ' • notes • search • zoom',
  '     External: KaTeX fonts (CDN, loaded when math is present)',
  '',
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">'
);
```

- `embParts` is the offline version's fragment array.
- Same strategy as `cdnParts`.
- Different content policy: inline almost everything.

---

## Lines 168-176: Inline CSS

```js
embParts.push(
  '',
  '<style id="revealjs-reset-css">' + assets.resetCSS + '</style>',
  '<style id="revealjs-core-css">' + assets.revealCSS + '</style>',
  '<style id="revealjs-theme">' + assets.whiteThemeCSS + '</style>',
  '<style id="revealjs-highlight-theme">' + assets.monokaiCSS + '</style>',
  '<style id="katex-css">' + assets.katexCSS + '</style>',
  '<style id="revealjs-custom-theme">' + customThemeCSS + '</style>'
);
```

- Every dependency CSS file becomes an inline `<style>` tag.
- That is how the output becomes self-contained.
- The browser no longer needs separate CSS files on disk.

---

## Lines 179-190: Inline JavaScript

```js
embParts.push(
  '',
  '<script id="revealjs-core-js">' + wrapUmd(assets.revealJS) + '</script>',
  '<script id="revealjs-highlight-plugin">' + wrapUmd(assets.highlightJS) + '</script>',
  '<script id="revealjs-notes-plugin">' + wrapUmd(assets.notesJS) + '</script>',
  '<script id="revealjs-search-plugin">' + wrapUmd(assets.searchJS) + '</script>',
  '<script id="revealjs-zoom-plugin">' + wrapUmd(fixZoom(assets.zoomJS)) + '</script>',
  '<script id="katex-js">' + assets.katexJS + '</script>',
  '<script id="katex-auto-render">' + assets.katexAutoJS + '</script>',
  '<script id="typora-revealjs-plugin">' + pluginJS + '</script>'
);
```

- The script inlines browser JavaScript as text.
- `wrapUmd(...)` is applied to Reveal and plugin bundles.
- `fixZoom(...)` runs before `wrapUmd(...)` on the zoom plugin.

That composition matters.

---

## Function Composition In Real Code

```js
wrapUmd(fixZoom(assets.zoomJS))
```

Read it inside-out:

1. get the raw zoom plugin string
2. patch it with `fixZoom(...)`
3. wrap the patched result with `wrapUmd(...)`

This is normal JavaScript expression nesting.

---

## Load Order Matters

```js
revealJS
highlightJS
notesJS
searchJS
zoomJS
katexJS
katexAutoJS
pluginJS
```

- Reveal core must appear before Reveal plugins.
- KaTeX must exist before auto-render runs.
- The project's own `pluginJS` comes last because it depends on the others.

Build scripts often encode dependency order manually.

---

## Lines 193-195: Finish The Embedded File

```js
writePlugin('plugin.txt', embParts.join('\n'));

console.log('\nDone.');
```

- Join the full HTML string.
- Write it to disk.
- Print a final status line.
- Node exits naturally when the script has no more work to do.

---

## The Entire Program Shape

```js
read inputs
build string arrays
patch vendor assets
join strings
write output files
```

This is textbook build-tool logic.

It is mostly:

- filesystem work
- string transformation
- deterministic output generation

---

## What This Teaches About JavaScript

```js
function ...
const ...
object literals
arrays
.push(...)
.join(...)
.replace(...)
for ... of
destructuring
```

This file is useful because it teaches everyday JavaScript, not toy examples.

---

## What This Teaches About Node.js

```js
require('fs')
require('path')
__dirname
Buffer.byteLength(...)
readFileSync(...)
writeFileSync(...)
```

This is the Node.js "scripting and tooling" side of the platform:

- not HTTP servers
- not frameworks
- just practical automation

---

## What This Teaches About Libraries

```js
reveal.js
katex
Reveal plugins
```

- npm packages often ship ready-made browser assets in `dist/`.
- A build script can consume those files as text.
- Not all integration issues are solved by package managers.
- Sometimes the real work is adapting libraries to the host environment.

---

## Read The Real File Beside This Deck

Recommended workflow:

1. Keep [build.js](/Users/kundeng/Dropbox/Projects/typora-revealjs-export/build.js) open.
2. Advance one slide at a time.
3. Compare the excerpt to the real source.
4. Ask: data type, runtime environment, and output shape.

That is how to learn build tooling from real code.
