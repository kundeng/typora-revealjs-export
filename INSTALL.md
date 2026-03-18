# Typora → Reveal.js Export Plugin (v2.1 — self-contained)

Self-contained: Reveal.js 5.1.0, highlight.js, MathJax 3.2.2, and plugins are all
bundled inline (~2.5 MB). MathJax math fonts load from CDN when math is used.
Code highlighting, slides, notes, search, zoom all work fully offline.

## Installation (one-time setup)

### Step 1: Create a new HTML export profile in Typora

1. Open **Typora → Preferences → Export**
2. Click the **+** button at the bottom-left
3. Choose **HTML**
4. Rename the new profile to **Reveal.js** (click the name to edit)

### Step 2: Paste the plugin

1. In the new export profile, find **"Append in `<head />`"**
2. Open `plugin.txt` from this folder
3. Copy the **entire contents** and paste into that field
4. Leave **"Append in `<body />`"** empty

That's it — one file, one field.

### Step 3: Export

1. Open any `.md` file in Typora
2. Go to **File → Export → Reveal.js**
3. The exported `.html` file is a working presentation — open it in any browser

## Writing Slides

Separate slides with `---` (horizontal rule) in your markdown. The first slide automatically becomes the title slide with centered, gradient-styled headings.

Everything you already know in Typora works: headings, lists, code blocks, tables, images, blockquotes, math (`$...$` and `$$...$$`).

### Speaker Notes

Any blockquote starting with `Note:` becomes a speaker note (visible only in speaker view, press `S`):

```markdown
> Note: This will only appear in the speaker notes panel.
```

### Fragment Animations

Append `{.fragment}` to make items appear one by one:

```markdown
- First point {.fragment}
- Second point {.fragment}
- Third point {.fragment}
```

### Front Matter Overrides

Add YAML front matter to customize per-presentation:

```yaml
---
revealjs-theme: black
revealjs-transition: fade
revealjs-slideNumber: false
revealjs-width: 1920
revealjs-height: 1080
---
```

Supported keys: `theme`, `transition`, `controls`, `progress`, `slideNumber`, `center`, `width`, `height`.

## Rebuilding the Plugin

If you edit `src/theme.css` or `src/plugin.js`, regenerate `plugin.txt`:

```bash
npm install    # first time only
npm run build  # regenerate plugin.txt
```

Then re-paste the updated `plugin.txt` into Typora's export settings.

## Project Structure

```
├── build.js               # Build script (assembles plugin.txt)
├── package.json           # Dependencies: reveal.js, mathjax
├── src/
│   ├── theme.css          # Custom presentation theme (edit this)
│   └── plugin.js          # DOM transform + boot logic (edit this)
├── plugin.txt             # GENERATED — paste into Typora
├── sample-presentation.md # Example markdown
└── INSTALL.md             # This file
```

## Keyboard Shortcuts (in the browser)

| Key | Action |
|-----|--------|
| → / Space | Next slide |
| ← | Previous slide |
| Esc / O | Overview mode |
| S | Speaker notes window |
| F | Fullscreen |
| Ctrl+Shift+F | Search slides |
| ? | Show all shortcuts |
