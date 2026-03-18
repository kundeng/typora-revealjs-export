# Typora → Reveal.js Export Plugin

Export any Typora Markdown file as a [Reveal.js](https://revealjs.com/) slide deck — no command line, no build tools, just **File → Export**.

## Two Versions

| File | Size | Use when… |
|------|------|-----------|
| **`plugin-cdn.txt`** | ~20 KB | You have internet. Loads Reveal.js 5.2.1, plugins, and KaTeX from CDN. |
| **`plugin.txt`** | ~1.5 MB | You need offline/self-contained HTML. Everything is inlined. |

Both produce a single `.html` file that works in any modern browser.

## Installation

1. **Typora → Preferences → Export → + → HTML**
2. Rename the profile to **Reveal.js** (or **Reveal.js CDN**)
3. Under **"Append in `<head />`"**, paste the entire contents of `plugin-cdn.txt` or `plugin.txt`
4. Set the base export format to **HTML (without styles)**
5. Leave **"Append in `<body />`"** empty

That's it.

## Usage

1. Open any `.md` file in Typora
2. **File → Export → Reveal.js**
3. Open the exported `.html` in a browser

### Writing Slides

Separate slides with `---` (horizontal rule). The first slide becomes the title slide.

```markdown
# My Presentation
## Subtitle

---

## Slide Two

- Bullet one
- Bullet two

---

## Code Example

` `` `python
def hello():
    return "world"
` `` `

---

## Math

Inline: $E = mc^2$

Display:
$$\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}$$
```

### Speaker Notes

Blockquotes starting with `Note:` become speaker notes (press **S** to view):

```markdown
> Note: Remember to mention the performance tradeoffs here.
```

### Fragment Animations

Append `{.fragment}` to reveal items one at a time:

```markdown
- First {.fragment}
- Second {.fragment}
- Third {.fragment}
```

### Front Matter Overrides

```yaml
---
revealjs-theme: black
revealjs-transition: fade
revealjs-slideNumber: true
revealjs-width: 1920
revealjs-height: 1080
---
```

Supported: `theme`, `transition`, `controls`, `progress`, `slideNumber`, `center`, `width`, `height`, `view`, `scrollProgress`, `scrollSnap`, `scrollLayout`.

### Scroll View

Presentations automatically become scrollable on mobile-width viewports. To force scroll view on all devices:

```yaml
---
revealjs-view: scroll
---
```

You can also activate it via URL: append `?view=scroll` to the exported HTML URL.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| → / Space | Next slide |
| ← | Previous slide |
| Esc / O | Overview mode |
| S | Speaker notes |
| F | Fullscreen |
| Alt+Click | Zoom into element |
| Ctrl+Shift+F | Search slides |

## Features

- **Reveal.js 5.2.1** with highlight, notes, search, and zoom plugins
- **KaTeX 0.16.38** for fast math rendering (`$...$` and `$$...$$`)
- **Syntax highlighting** for 35+ languages via highlight.js
- **Scroll view** — auto-activates on mobile, or force with `revealjs-view: scroll`
- **Custom theme** with gradient title slides, clean typography
- **Speaker notes** via `> Note:` blockquotes
- **Fragment animations** via `{.fragment}`
- **YAML front matter** for per-presentation config

## Development

```bash
npm install          # install dependencies
npm run build        # build plugin-cdn.txt and plugin.txt
npm run test:gen     # generate test HTML files
```

### Project Structure

```
├── build.js               # Assembles both plugin files
├── src/
│   ├── plugin.js          # DOM transform + boot logic
│   └── theme.css          # Custom presentation theme
├── plugin-cdn.txt         # CDN version (paste into Typora)
├── plugin.txt             # Embedded version (paste into Typora)
├── gen-test.js            # Test file generator
├── sample-presentation.md # Example slide deck
└── harpanoteprompt.txt    # AI prompt for generating slide Markdown
```

## License

MIT
