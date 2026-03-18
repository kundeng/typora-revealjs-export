---
revealjs-theme: white
revealjs-transition: slide
revealjs-slideNumber: true
---

# Understanding `build.js`

## A line-keyed Reveal.js walkthrough

---

## What This Deck Teaches

- What `build.js` does in this repo
- How Node.js scripts read and write files
- What `fs`, `path`, `Buffer`, and `__dirname` are doing
- How the script assembles HTML, CSS, and JavaScript into plugin files
- Why some library code is patched before it is embedded

---

## Repo Context

- `build.js` is the build-time assembler
- `src/plugin.js` is the runtime code injected into exported HTML
- `src/theme.css` is the custom presentation theme
- `plugin-cdn.txt` is the small internet-required output
- `plugin.txt` is the large self-contained output

---

## Big Picture Flow

1. Read local source files from `src/`
2. Read library assets from `node_modules/`
3. Build the CDN plugin payload as one long string
4. Build the embedded plugin payload as one long string
5. Write both outputs to disk

---

## Line 1

```js
#!/usr/bin/env node
```

- This is a shebang
- It tells Unix-like systems to run the file with `node`
- It matters when the file is executed directly from the shell
- It does not affect normal `node build.js` usage much, but it makes the script portable

---

## Lines 2-22

```js
/**
 * Build script for Typora -> Reveal.js Export Plugin
 * ...
 */
```

- This is a block comment used as developer documentation
- It explains the outputs, installation target, and usage
- Nothing inside this comment runs
- Good build scripts explain their side effects because they generate files

---

## Line 24

```js
const fs = require('fs');
```

- `require(...)` is CommonJS module loading in Node.js
- `fs` is Node's built-in file system module
- It gives functions like `readFileSync`, `writeFileSync`, and `statSync`
- No external package install is needed for built-in modules

---

## Line 25

```js
const path = require('path');
```

- `path` is another built-in Node.js module
- It builds file paths safely across operating systems
- This avoids hardcoding slash behavior like `/` versus `\\`
- In build scripts, `path.join(...)` is the standard way to compose paths

---

## Lines 29-32

```js
const REVEAL_VERSION = '5.2.1';
const KATEX_VERSION  = '0.16.38';
const REVEAL_CDN     = 'https://cdn.jsdelivr.net/npm/reveal.js@' + REVEAL_VERSION;
const KATEX_CDN      = 'https://cdn.jsdelivr.net/npm/katex@' + KATEX_VERSION;
```

- These constants centralize version control
- The script uses string concatenation to build CDN base URLs
- If the version changes, one edit updates many later references
- This is a simple configuration pattern

---

## Node.js Concept: Constants

- `const` means the variable binding will not be reassigned
- It does not make the value deeply immutable
- Strings are primitive values, so in this file that distinction is not important
- Using `const` here signals "configuration, not temporary state"

---

## Lines 36-38

```js
function pkg(p) {
  return fs.readFileSync(path.join(__dirname, 'node_modules', p), 'utf8');
}
```

- `pkg(...)` is a helper that reads dependency files from `node_modules`
- `__dirname` is a Node.js global containing the current file's directory
- `readFileSync(..., 'utf8')` returns a string instead of a raw byte buffer
- This function keeps later code short and readable

---

## Lines 39-41

```js
function src(p) {
  return fs.readFileSync(path.join(__dirname, 'src', p), 'utf8');
}
```

- This is the same pattern as `pkg(...)`, but for project-owned source files
- The script separates "our code" from "library code"
- That separation makes the later asset map easier to understand
- Helper functions are reducing duplication here

---

## Lines 42-44

```js
function sizeKB(s) {
  return (Buffer.byteLength(s, 'utf8') / 1024).toFixed(0);
}
```

- `Buffer.byteLength(...)` measures actual byte size of a string
- That matters more than `s.length` when encoding can affect size
- Dividing by `1024` converts bytes to kilobytes
- `.toFixed(0)` rounds and returns a string like `"16"`

---

## Node.js Concept: `Buffer`

- A `Buffer` is Node's binary data type
- Here the code does not create a `Buffer` object directly
- It uses the `Buffer` class utility method `byteLength(...)`
- Build scripts often use this when reporting output sizes

---

## Lines 45-50

```js
function writePlugin(name, content) {
  const p = path.join(__dirname, name);
  fs.writeFileSync(p, content);
  const kb = (fs.statSync(p).size / 1024).toFixed(0);
  console.log('  ✅ ' + name + ': ' + kb + ' KB');
}
```

- The function computes an output path, writes a file, then checks the file size
- `writeFileSync` is synchronous, so execution pauses until the write finishes
- `statSync(...).size` reads the file size from the filesystem
- `console.log(...)` gives build feedback to the developer

---

## JavaScript Concept: Why Sync APIs Here?

- `readFileSync` and `writeFileSync` block the thread
- That would be bad in a web server handling many users
- It is fine in a short build script that runs once and exits
- Synchronous code is often simpler for tooling

---

## Lines 54-55

```js
const customThemeCSS = src('theme.css');
const pluginJS       = src('plugin.js');
```

- These read the project's runtime assets into memory as strings
- `customThemeCSS` comes from `src/theme.css`
- `pluginJS` comes from `src/plugin.js`
- Both outputs reuse the same local source strings

---

## Lines 61-63

```js
console.log('Building plugin-cdn.txt ...');

const cdnParts = [];
```

- The build announces the first output file
- `cdnParts` is an array of string fragments
- The script builds HTML by collecting pieces, then joining them later
- This is simpler than repeated string concatenation across many lines

---

## Lines 65-92

```js
cdnParts.push(
  '...',
  customThemeCSS,
  '...',
  pluginJS,
  '...'
);
```

- `Array.prototype.push(...)` can append many items in one call
- The array contains HTML comments, meta tags, link tags, style tags, and script tags
- `customThemeCSS` is inlined inside a `<style>` block
- `pluginJS` is inlined inside a `<script>` block

---

## CDN Output: Lines 66-69

- These lines generate a descriptive HTML comment header
- The header explains where the user should paste the output
- It also embeds version information into the generated file
- This is documentation shipped inside the artifact

---

## CDN Output: Lines 71-72

```html
<meta name="viewport" ...>
<meta name="mobile-web-app-capable" ...>
```

- These are HTML metadata tags
- They help browser presentation behavior, especially on mobile
- The build script is not just bundling code; it is authoring a working HTML head fragment

---

## CDN Output: Lines 74-81

- These lines add external CSS references
- Reveal.js reset, core, theme, and syntax highlighting CSS come from jsDelivr
- KaTeX CSS also comes from jsDelivr
- This keeps `plugin-cdn.txt` small because the browser fetches the heavy assets later

---

## CDN Output: Lines 83-91

- The custom theme is inlined with `<style>`
- The plugin logic is inlined with `<script>`
- This means the repo's own behavior always ships with the build output
- Only third-party library assets stay external in the CDN variant

---

## Line 94

```js
writePlugin('plugin-cdn.txt', cdnParts.join('\n'));
```

- `.join('\n')` converts the array into one newline-separated string
- The output becomes readable HTML rather than one giant line
- Then `writePlugin(...)` persists it to disk

---

## Lines 100-118

```js
const assets = {
  resetCSS:      pkg('reveal.js/dist/reset.css'),
  ...
  katexAutoJS:   pkg('katex/dist/contrib/auto-render.min.js'),
};
```

- This object collects all embedded-mode dependencies
- Keys on the left are local names used by the script
- Calls to `pkg(...)` load actual library files from `node_modules`
- This is the core difference from the CDN build: dependencies are pulled into memory now

---

## Libraries Referenced Here

- `reveal.js`
  - Presentation framework
  - Provides slide layout, navigation, plugins, themes
- `katex`
  - Math rendering library
  - Provides CSS, runtime, and auto-render support
- Reveal plugins
  - `highlight`, `notes`, `search`, `zoom`

---

## Lines 105-110

```js
whiteThemeCSS: pkg('reveal.js/dist/theme/white.css')
  .replace(...)
  .replace(...),
katexCSS: pkg('katex/dist/katex.min.css')
  .replace(...),
```

- These lines patch CSS text after loading it
- `.replace(...)` performs string replacement using regular expressions
- The goal is to rewrite relative font URLs into CDN URLs
- Even the embedded build still relies on CDN-hosted font files for some assets

---

## JavaScript Concept: Chaining

- A function call can return a value that is used immediately by another call
- `pkg(...).replace(...).replace(...)` is method chaining
- Each `.replace(...)` returns a new string
- Strings in JavaScript are immutable, so the original string is not modified in place

---

## Lines 120-126

```js
console.log('  Asset sizes:');
for (const [k, v] of Object.entries(assets)) {
  console.log('    ' + k.padEnd(18) + sizeKB(v).padStart(6) + ' KB');
}
```

- `Object.entries(assets)` returns `[key, value]` pairs
- `for ... of` iterates through those pairs
- `[k, v]` is array destructuring
- `padEnd(...)` and `padStart(...)` align console output into columns

---

## Lines 125-126

```js
console.log('    ' + 'theme.css'.padEnd(18) + sizeKB(customThemeCSS).padStart(6) + ' KB');
console.log('    ' + 'plugin.js'.padEnd(18) + sizeKB(pluginJS).padStart(6) + ' KB');
```

- These lines include project-owned assets in the same report
- They are not in the `assets` object because they were loaded separately
- The report gives quick visibility into output weight drivers

---

## Lines 128-134

- This comment explains a compatibility problem
- Some Reveal.js plugin files use UMD wrappers
- UMD tries to support browser globals, AMD, and CommonJS at once
- In Typora-like contexts, that can cause plugins to attach to `module.exports` instead of `window`
- The comment tells you why the next helper exists

---

## Lines 135-137

```js
function wrapUmd(js) {
  return '(function(){var exports=void 0,module=void 0,define=void 0;\n' + js + '\n})();';
}
```

- This function wraps library code in an immediately invoked function expression
- It shadows `exports`, `module`, and `define` by making them `undefined`
- That nudges UMD detection toward browser-global behavior
- The returned value is still just a string of JavaScript source code

---

## JavaScript Concept: IIFE

- IIFE stands for Immediately Invoked Function Expression
- Example shape: `(function () { ... })();`
- It creates a local scope right away
- Build scripts often generate IIFEs when they need isolation

---

## Lines 139-152

```js
function fixZoom(js) {
  return js
    .replace(...)
    .replace(...);
}
```

- This helper patches the Reveal zoom plugin source code before embedding it
- The problem is an early access to `document.body.style` while the script is still in `<head>`
- If `document.body` does not exist yet, the plugin can crash during parse-time execution
- The fix rewrites the offending source text into guarded checks

---

## Important Build-Script Pattern

- This project does not fork Reveal.js source files on disk
- Instead, it patches the loaded string in memory during the build
- That keeps dependency management simple
- The tradeoff is that the replacement strings are brittle if upstream code changes

---

## Lines 154-155

```js
const embParts = [];
```

- This mirrors `cdnParts`
- The second half of the build script uses the same assembly strategy
- The difference is not the structure of the code
- The difference is which assets get linked versus inlined

---

## Lines 156-165

```js
embParts.push(
  '<!-- ... self-contained ... -->',
  '<meta ...>',
  '<meta ...>'
);
```

- This creates the top of the embedded output
- The generated comment clearly marks the file as self-contained
- The same viewport-related meta tags are included here too
- Good generators keep both variants structurally similar where possible

---

## Lines 167-176

```js
embParts.push(
  '<style id="revealjs-reset-css">' + assets.resetCSS + '</style>',
  ...
  '<style id="revealjs-custom-theme">' + customThemeCSS + '</style>'
);
```

- All CSS is embedded directly inside `<style>` tags
- This includes Reveal core CSS, theme CSS, highlight theme CSS, KaTeX CSS, and the custom theme
- The browser will not need separate CSS requests for these assets
- This is why `plugin.txt` is much larger

---

## Lines 178-190

```js
embParts.push(
  '<script id="revealjs-core-js">' + wrapUmd(assets.revealJS) + '</script>',
  ...
  '<script id="typora-revealjs-plugin">' + pluginJS + '</script>'
);
```

- All JavaScript is embedded directly inside `<script>` tags
- Several Reveal plugins are passed through `wrapUmd(...)`
- The zoom plugin is passed through both `fixZoom(...)` and `wrapUmd(...)`
- KaTeX scripts are embedded as-is

---

## Why `pluginJS` Comes Last

- `pluginJS` is the project's boot logic from `src/plugin.js`
- It expects Reveal and plugins to already exist when it runs
- Putting it last establishes load order
- In generated HTML, script order is often the dependency graph

---

## Lines 193-195

```js
writePlugin('plugin.txt', embParts.join('\n'));

console.log('\nDone.');
```

- The embedded array is joined into one HTML fragment
- The script writes `plugin.txt`
- Then it prints a final completion message
- At that point the Node.js process exits naturally

---

## What `build.js` Is Not Doing

- It is not transpiling JavaScript
- It is not using a bundler like Webpack, Vite, or esbuild
- It is not parsing HTML into a DOM during build time
- It is performing deterministic string assembly and file I/O

---

## Why This Approach Works Well Here

- The output target is a pasteable `<head>` fragment for Typora
- The project needs fine control over exact generated markup
- The dependency graph is small and stable
- A custom Node.js script is easier to audit than a full bundler stack for this use case

---

## How `build.js` Fits The Whole Repo

1. You edit [`src/theme.css`](./src/theme.css) and [`src/plugin.js`](./src/plugin.js)
2. You run `npm run build`
3. `build.js` reads those files plus installed library assets
4. It emits [`plugin-cdn.txt`](./plugin-cdn.txt) and [`plugin.txt`](./plugin.txt)
5. Typora users paste one of those outputs into the export profile

---

## Key Node.js Ideas To Remember

- `require(...)` loads CommonJS modules
- `__dirname` anchors file paths to the current script
- `fs` performs file reads, writes, and stats
- `path.join(...)` builds safe paths
- Synchronous APIs are acceptable in small CLI build tools

---

## Key JavaScript Ideas To Remember

- Arrays can accumulate output fragments cleanly
- Objects can map asset names to loaded content
- String methods like `.replace(...)` are useful build tools
- Destructuring and iteration make reports readable
- Functions keep repetitive file-handling logic compact

---

## Key Library Ideas To Remember

- `reveal.js` supplies the slideshow engine
- Reveal plugins extend code highlighting, notes, search, and zoom
- `katex` renders math quickly in the browser
- The build script chooses whether those libraries are linked remotely or embedded locally

---

## Suggested Exercises

1. Change `REVEAL_VERSION` and rebuild
2. Add another asset to the `assets` object and report its size
3. Replace string concatenation with template literals in one section
4. Add a new comment explaining a tradeoff you now understand
5. Compare the generated sizes of `plugin-cdn.txt` and `plugin.txt`

---

## Closing Summary

- `build.js` is the repo's packaging step
- It turns source files plus installed libraries into pasteable Typora plugin payloads
- The file is a practical example of Node.js scripting, file I/O, string processing, and lightweight build engineering

