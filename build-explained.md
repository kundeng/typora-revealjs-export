---
revealjs-theme: white
revealjs-transition: slide
revealjs-slideNumber: true
---

# How `build.js` Works

## A hands-on walkthrough for junior developers

Open `build.js` in your editor and follow along slide-by-slide

---

## What You'll Learn

This deck walks through a **real** build script, line by line.

By the end, you'll understand:

- How Node.js reads and writes files
- How to assemble HTML from pieces using JavaScript
- Why libraries sometimes need patching
- How a 200-line script replaces Webpack for small projects

---

## The Big Picture

`build.js` is a **packaging script**. It reads source files and library code, then glues them into two output files:

| Output | Size | What it contains |
|--------|------|-----------------|
| `plugin-cdn.txt` | ~20 KB | Links to CDN. Needs internet. |
| `plugin.txt` | ~1.5 MB | Everything inlined. Works offline. |

Users paste one of those into Typora's export settings — done.

---

## Mental Model: It's Just String Assembly

The whole script boils down to:

```
1. Read files into strings
2. Maybe patch some strings
3. Glue strings together with HTML tags
4. Write the result to disk
```

There's no compiler, no AST, no DOM — just text in, text out.

> Note: Keep this mental model in mind. Every section below is just a variation of "read → transform → write."

---

## Line 1: The Shebang

```js
#!/usr/bin/env node
```

This tells Unix: "run me with whatever `node` is in the PATH."

**Try it:** make the file executable and run it directly:

```bash
chmod +x build.js
./build.js          # works because of the shebang
node build.js       # also works, shebang is ignored
```

> Note: Windows ignores shebangs. The line is harmless there.

---

## Lines 24-25: Loading Node's Built-in Modules

```js
const fs = require('fs');
const path = require('path');
```

- `fs` = **f**ile **s**ystem — read, write, stat files
- `path` = build file paths safely across OS

These ship with Node. No `npm install` needed.

**Common mistake:** writing `require('Path')` — module names are case-sensitive on Linux.

---

## `const` — What It Actually Means

```js
const fs = require('fs');
fs = require('path');  // ❌ TypeError: Assignment to constant variable
```

`const` prevents **reassigning the variable**. It does NOT freeze the value.

```js
const arr = [1, 2];
arr.push(3);           // ✅ fine — the array itself is mutable
arr = [4, 5];          // ❌ can't reassign the binding
```

**Rule of thumb:** use `const` by default, `let` only when you need to reassign.

---

## Lines 29-32: Version Configuration

```js
const REVEAL_VERSION = '5.2.1';
const KATEX_VERSION  = '0.16.38';
const REVEAL_CDN     = 'https://cdn.jsdelivr.net/npm/reveal.js@' + REVEAL_VERSION;
const KATEX_CDN      = 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION;
```

**Why this matters:** the version appears in 10+ URLs later. If it were hardcoded everywhere, upgrading would mean hunting through the file.

**Try it:** change `REVEAL_VERSION` to `'4.0.0'`, run `node build.js`, and open the CDN output. You'll see every URL updated automatically.

---

## Lines 36-38: The `pkg()` Helper

```js
function pkg(p) {
  return fs.readFileSync(path.join(__dirname, 'node_modules', p), 'utf8');
}
```

Let's break this apart:

| Piece | What it does |
|-------|-------------|
| `__dirname` | Directory where `build.js` lives (not where you ran `node` from!) |
| `path.join(...)` | Combines path segments with the right slash for your OS |
| `readFileSync(...)` | Reads the file **right now**, blocks until done |
| `'utf8'` | Return a string, not a raw byte Buffer |

**Try it in the Node REPL:**

```bash
node -e "console.log(__dirname)"
```

---

## Why `__dirname`, Not `./`

```bash
cd /tmp
node /path/to/project/build.js
```

If the script used `'./node_modules'`, it would look in `/tmp/node_modules` — wrong!

`__dirname` always resolves to where the script file lives, regardless of your shell's working directory.

**Common mistake:** using relative paths in build scripts. Always anchor to `__dirname`.

---

## Lines 39-44: More Helpers

```js
function src(p) {
  return fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
}

function sizeKB(s) {
  return (Buffer.byteLength(s, 'utf8') / 1024).toFixed(0);
}
```

`src()` is just like `pkg()` but reads from the `src/` folder.

`sizeKB()` measures a string's size in kilobytes. Why not just `s.length`?

```js
'hello'.length                    // 5  (character count)
Buffer.byteLength('hello', 'utf8') // 5  (same for ASCII)
Buffer.byteLength('日本', 'utf8')   // 6  (3 bytes per CJK char!)
```

File sizes are about **bytes**, not characters. `Buffer.byteLength` is the right tool.

---

## Lines 45-50: The `writePlugin()` Helper

```js
function writePlugin(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log('  ✅ ' + name + ': ' + kb + ' KB');
}
```

This does three things:

1. **Writes** the file to disk
2. **Measures** the actual file size (not the string length)
3. **Reports** it to the console

**Why `statSync` instead of `sizeKB`?** Either would work here. Using `stat` on the written file is a double-check that the write succeeded and the OS-level size is what we expect.

---

## Sync vs Async — When To Use Which

All the `fs` calls in this script end with `Sync`:

```js
fs.readFileSync(...)   // blocks until file is read
fs.writeFileSync(...)  // blocks until file is written
```

| Context | Use |
|---------|-----|
| Web server handling 1000 users | Async (`fs.readFile`, `fs.promises`) |
| CLI script that runs once and exits | Sync is fine and simpler |

This script runs for ~100ms total. Blocking is not a problem.

---

## Lines 54-55: Loading Our Own Source

```js
const customThemeCSS = src('theme.css');
const pluginJS       = src('plugin.js');
```

After these lines, `customThemeCSS` is a **string** containing all of `theme.css`. The script hasn't executed that CSS — it's just text in memory.

```js
typeof customThemeCSS   // "string"
typeof pluginJS         // "string"
```

This is the core idea: the build script treats code files as **data**.

---

## Lines 61-94: Building the CDN Version

```js
const cdnParts = [];

cdnParts.push(
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reset.css">',
  '<link rel="stylesheet" href="' + REVEAL_CDN + '/dist/reveal.css">',
  // ... more links ...
  '<style id="revealjs-custom-theme">',
  customThemeCSS,
  '</style>',
  '<script id="typora-revealjs-plugin">',
  pluginJS,
  '</script>'
);

writePlugin('plugin-cdn.txt', cdnParts.join('\n'));
```

The pattern:

1. Create an empty array
2. Push strings (HTML tags, CSS, JS) into it
3. Join them with newlines into one big string
4. Write to disk

**Try it:** after the build, open `plugin-cdn.txt` in your editor. You'll see recognizable HTML — `<link>`, `<style>`, `<script>` tags.

---

## How `push` + `join` Works

```js
const parts = [];
parts.push('<p>Hello</p>');
parts.push('<p>World</p>');
console.log(parts.join('\n'));
```

Output:

```html
<p>Hello</p>
<p>World</p>
```

This is much cleaner than string concatenation with `+=` when you have dozens of pieces.

> Note: `.push()` can take multiple arguments: `parts.push('a', 'b', 'c')` adds all three.

---

## Lines 100-118: Loading All Library Assets

```js
const assets = {
  resetCSS:    pkg('reveal.js/dist/reset.css'),
  revealCSS:   pkg('reveal.js/dist/reveal.css'),
  revealJS:    pkg('reveal.js/dist/reveal.js'),
  highlightJS: pkg('reveal.js/plugin/highlight/highlight.js'),
  notesJS:     pkg('reveal.js/plugin/notes/notes.js'),
  searchJS:    pkg('reveal.js/plugin/search/search.js'),
  zoomJS:      pkg('reveal.js/plugin/zoom/zoom.js'),
  katexJS:     pkg('katex/dist/katex.min.js'),
  // ... etc
};
```

An **object literal** maps human-readable names to file contents. Later code can say `assets.zoomJS` instead of remembering a path.

**Key insight:** npm packages ship pre-built files in `dist/`. You can read them as text — you don't have to `require()` or `import` them.

---

## Lines 105-110: Fixing Relative URLs

```js
whiteThemeCSS: pkg('reveal.js/dist/theme/white.css')
  .replace(/url\(\.\/fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/')
  .replace(/url\(fonts\//g, 'url(' + REVEAL_CDN + '/dist/theme/fonts/'),
```

**The problem:** the original CSS says `url(./fonts/some-font.woff)`. That relative path works when the CSS file lives next to the `fonts/` folder — but we're inlining the CSS into a random HTML file. The path breaks.

**The fix:** rewrite relative paths to absolute CDN URLs.

**Before:** `url(./fonts/source-sans-pro.woff)`

**After:** `url(https://cdn.jsdelivr.net/.../fonts/source-sans-pro.woff)`

---

## Quick Regex Primer

```js
/url\(\.\/fonts\//g
```

| Symbol | Meaning |
|--------|---------|
| `/.../g` | Regular expression, **g**lobal (replace all matches, not just first) |
| `url\(` | Literal text `url(` — the `\(` escapes the parenthesis |
| `\.` | Literal dot — plain `.` means "any character" in regex |
| `\/` | Literal forward slash |

You don't need to master regex to work with build scripts. But you'll see `.replace(/pattern/g, 'replacement')` everywhere.

**Try it:**

```js
'url(./fonts/a.woff) url(./fonts/b.woff)'
  .replace(/url\(\.\/fonts\//g, 'url(https://cdn/fonts/')
// "url(https://cdn/fonts/a.woff) url(https://cdn/fonts/b.woff)"
```

---

## Lines 121-126: The Build Report

```js
for (const [k, v] of Object.entries(assets)) {
  console.log('    ' + k.padEnd(18) + sizeKB(v).padStart(6) + ' KB');
}
```

**New concepts:**

- `Object.entries(obj)` → `[['key1', val1], ['key2', val2], ...]`
- `const [k, v]` = **destructuring** — pull array items into named variables
- `.padEnd(18)` / `.padStart(6)` — pad strings for aligned columns

Output looks like:

```
    resetCSS               1 KB
    revealJS             110 KB
    highlightJS          918 KB
```

**Try it:** `'hi'.padEnd(10, '.')` → `'hi........'`

---

## Lines 128-137: The UMD Compatibility Problem

This is where the build script gets interesting.

**The problem:** Reveal.js plugins use a UMD wrapper:

```js
if (typeof exports === 'object') {
  module.exports = factory();     // Node path
} else {
  window.RevealZoom = factory();  // Browser path
}
```

Typora's export environment looks enough like Node that `exports` exists. So the plugin chooses the **wrong branch** and never sets the browser global.

---

## The Fix: `wrapUmd()`

```js
function wrapUmd(js) {
  return '(function(){var exports=void 0,module=void 0,define=void 0;\n'
       + js + '\n})();';
}
```

This wraps the library code in an **IIFE** (Immediately Invoked Function Expression) that shadows those variables:

```js
(function () {
  var exports = undefined;  // hides the outer `exports`
  var module = undefined;
  var define = undefined;
  // ... original library code runs here ...
  // UMD now sees exports === undefined → chooses browser path ✅
})();
```

**`void 0`** is just a fancy way to write `undefined` that can't be overridden (an old JS safety trick).

---

## Lines 139-152: Patching the Zoom Plugin

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

**The bug:** the zoom plugin accesses `document.body.style` at parse time. But our script runs in `<head>` — before `<body>` exists. Result: `Cannot read properties of null`.

**The fix:** add a guard — check if `document.body` exists first.

---

## Before vs After the Patch

**Original (crashes):**

```js
l = "transform" in document.body.style
//                   ^^^^^^^^^^^^^ null!
```

**Patched (safe):**

```js
l = document.body ? "transform" in document.body.style : true
//  ^^^^^^^^^^^^^ check first
```

This is a **defensive programming** pattern. You'll use it constantly in real code.

**Common mistake:** assuming DOM elements exist. Always check when code runs early in the page lifecycle.

---

## When Is String-Patching Vendor Code OK?

- **In app code:** rarely — it's fragile and hard to maintain
- **In a build script:** sometimes it's the simplest fix

The key is:

1. The patch is **narrow** (two specific string replacements)
2. The patch is **documented** (comments explain why)
3. The patch is **isolated** (only in the build output, not in `node_modules`)

If the upstream library updates and the strings change, `fixZoom` will silently fail to match. That's a maintenance risk worth noting.

---

## Lines 154-190: Building the Embedded Version

Same pattern as CDN, but everything is inlined:

```js
const embParts = [];

// CSS — all inlined
embParts.push(
  '<style>' + assets.resetCSS + '</style>',
  '<style>' + assets.revealCSS + '</style>',
  // ... more CSS ...
);

// JS — all inlined, wrapped for compatibility
embParts.push(
  '<script>' + wrapUmd(assets.revealJS) + '</script>',
  '<script>' + wrapUmd(assets.highlightJS) + '</script>',
  '<script>' + wrapUmd(fixZoom(assets.zoomJS)) + '</script>',
  '<script>' + assets.katexJS + '</script>',
  '<script>' + pluginJS + '</script>'
);

writePlugin('plugin.txt', embParts.join('\n'));
```

---

## Function Composition: Reading Inside-Out

```js
wrapUmd(fixZoom(assets.zoomJS))
```

Read it step by step:

1. `assets.zoomJS` — the raw zoom plugin source (a string)
2. `fixZoom(...)` — patches the `document.body` bug (returns a new string)
3. `wrapUmd(...)` — wraps in IIFE to fix UMD detection (returns a new string)

Each function takes a string and returns a transformed string. This is how real JavaScript pipelines work — even without fancy functional programming libraries.

---

## Why Load Order Matters

```js
revealJS         // 1. Reveal core (defines window.Reveal)
highlightJS      // 2. Plugins (register with Reveal)
notesJS
searchJS
zoomJS
katexJS          // 3. KaTeX core
katexAutoJS      // 4. KaTeX auto-render (needs KaTeX)
pluginJS         // 5. Our boot code (needs everything above)
```

In HTML, `<script>` tags execute in order. Our boot code calls `Reveal.initialize()`, so Reveal must already exist.

**Common mistake:** putting your app script before its dependencies. The browser won't wait — it just crashes with "X is not defined."

---

## Lines 193-195: Done

```js
writePlugin('plugin.txt', embParts.join('\n'));
console.log('\nDone.');
```

Node exits when there's nothing left to do. No explicit `process.exit()` needed.

The whole script runs in ~100ms. It read ~15 files, patched two of them, assembled two HTML fragments, and wrote them to disk. That's it.

---

## The Full Program, Zoomed Out

```
1. require('fs'), require('path')     ← load tools
2. define helpers: pkg, src, sizeKB   ← shortcuts for file I/O
3. read theme.css, plugin.js          ← our source files
4. build CDN version (links + inline) ← array → join → write
5. load all library assets            ← object of strings
6. patch zoom plugin, wrap UMD        ← fix compatibility
7. build embedded version (all inline)← array → join → write
8. print "Done."                      ← exit
```

Every build script you'll ever write follows some variation of this pattern.

---

## What You Just Learned

**JavaScript fundamentals used in this file:**

- `const`, `function`, object literals, arrays
- `.push()`, `.join()`, `.replace()`, `.padEnd()`
- `for...of`, destructuring, string concatenation
- IIFEs, `void 0`, regular expressions

**Node.js concepts:**

- `require()`, `__dirname`, `Buffer.byteLength()`
- `fs.readFileSync()`, `fs.writeFileSync()`, `fs.statSync()`
- `path.join()`, sync vs async I/O

**Build tooling patterns:**

- Config constants for version pinning
- Helper functions to reduce repetition
- Text-based patching of vendor code
- Array accumulation + join for HTML assembly
- Build reports for visibility

---

## Exercises

1. **Change the version**: set `REVEAL_VERSION = '4.0.0'`, rebuild, open `plugin-cdn.txt` — what changed?
2. **Add a report line**: after the asset size loop, log the total size of all assets combined
3. **Template literals**: rewrite one `push(...)` call using backtick strings instead of `+` concatenation
4. **Break it on purpose**: remove `wrapUmd()` from one plugin line, rebuild, export from Typora — what error do you get?
5. **Trace the data flow**: pick any line in `plugin-cdn.txt` and trace it back to the exact `push()` call that generated it

---

## Keep Going

To really learn this file:

1. Open `build.js` side by side with this deck
2. Advance one slide, find the matching code
3. For each section, ask yourself: **what is the data type?** (always a string)
4. Run `node build.js` after any experiment — it's fast and safe
