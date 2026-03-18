/**
 * Typora → Reveal.js Export Plugin  —  Boot & Transformation Logic
 *
 * This script runs in the exported HTML page. It:
 *   1. Reads per-presentation config from YAML front matter
 *   2. Transforms Typora's flat HTML into Reveal.js slide structure
 *   3. Loads Reveal.js + plugins (CDN mode) or uses inlined globals (embedded mode)
 *   4. Triggers KaTeX math rendering on all slides
 *
 * Auto-detects mode: if window.Reveal exists, we're embedded; otherwise CDN.
 * Edit this file, then run `npm run build` to regenerate plugin files.
 */
(function () {
  'use strict';

  var REVEAL_CDN = 'https://cdn.jsdelivr.net/npm/reveal.js@5.2.1';
  var KATEX_CDN  = 'https://cdn.jsdelivr.net/npm/katex@0.16.38/dist';

  // ── Reveal.js defaults (overridable via front matter) ──
  var DEFAULTS = {
    transition:  'slide',
    controls:    true,
    progress:    true,
    slideNumber: true,
    center:      false,
    hash:        true,
    width:       1280,
    height:      720,
    margin:      0.08
  };

  // Keys that are ours (CSS / math), not Reveal.js config
  var NON_REVEAL_KEYS = { theme: 1, highlight: 1 };

  // ────────────────────────────────────────────────────────
  //  1. YAML FRONT MATTER
  //  Typora renders front matter as <meta> tags or as an
  //  HTML comment at the top of the exported document.
  //
  //  Supported keys (all optional):
  //    revealjs-theme:      white | black | moon | league | …
  //    revealjs-transition: slide | fade | convex | concave | zoom | none
  //    revealjs-controls:   true | false
  //    revealjs-progress:   true | false
  //    revealjs-slideNumber: true | false
  //    revealjs-center:     true | false
  //    revealjs-width:      number (e.g. 1920)
  //    revealjs-height:     number (e.g. 1080)
  // ────────────────────────────────────────────────────────
  function readFrontMatter() {
    var cfg = {};

    // Check <meta name="revealjs-*"> tags
    document.querySelectorAll('meta').forEach(function (m) {
      var name = m.getAttribute('name') || '';
      if (name.indexOf('revealjs-') === 0) {
        var key = name.replace('revealjs-', '');
        var val = m.getAttribute('content');
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
        cfg[key] = val;
      }
    });

    // Check first HTML comment in <body> (Typora sometimes puts YAML there)
    var walker = document.createTreeWalker(
      document.body, NodeFilter.SHOW_COMMENT, null, false
    );
    var c = walker.nextNode();
    if (c) (c.textContent || '').split('\n').forEach(function (line) {
      var m = line.match(/^\s*revealjs-(\w+)\s*:\s*(.+)\s*$/);
      if (m) {
        var val = m[2].trim();
        if (val === 'true') val = true;
        else if (val === 'false') val = false;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        cfg[m[1]] = val;
      }
    });

    return cfg;
  }

  // ────────────────────────────────────────────────────────
  //  2. DOM TRANSFORMATION
  //  Typora exports everything inside <div id="write">.
  //  Horizontal rules (<hr>, from "---") become slide breaks.
  //  We split at each <hr> and wrap in:
  //    .reveal > .slides > <section> per slide
  // ────────────────────────────────────────────────────────
  function transformDOM() {
    // Typora wraps content in: <body> > .typora-export-content > #write
    // Remove the wrapper if present so we work directly with #write.
    var wrapper = document.querySelector('.typora-export-content');
    if (wrapper && wrapper.parentNode === document.body) {
      while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);
      wrapper.remove();
    }

    var writeDiv = document.getElementById('write');
    if (!writeDiv) writeDiv = document.body;

    // Collect all child nodes
    var children = Array.prototype.slice.call(writeDiv.childNodes);
    var slides = [], current = [];

    // Split at each <hr>
    children.forEach(function (node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'HR') {
        slides.push(current);
        current = [];
      } else {
        current.push(node);
      }
    });
    if (current.length > 0) slides.push(current);

    // Drop empty leading slide (when doc starts with "---")
    if (slides.length > 0 && isEmptySlide(slides[0])) slides.shift();

    // Build Reveal.js DOM structure
    var revealDiv = document.createElement('div');
    revealDiv.className = 'reveal';
    var slidesDiv = document.createElement('div');
    slidesDiv.className = 'slides';

    slides.forEach(function (group, idx) {
      var section = document.createElement('section');

      // First slide gets special title styling
      if (idx === 0) section.className = 'title-slide';

      group.forEach(function (node) {
        // Convert blockquotes starting with "Note:" → speaker notes
        if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'BLOCKQUOTE') {
          var text = node.textContent.trim();
          if (/^Notes?:/i.test(text)) {
            var aside = document.createElement('aside');
            aside.className = 'notes';
            aside.innerHTML = node.innerHTML.replace(/^<p>\s*Notes?:\s*/i, '<p>');
            section.appendChild(aside);
            return;  // don't also add the blockquote
          }
        }
        section.appendChild(node);
      });

      slidesDiv.appendChild(section);
    });

    revealDiv.appendChild(slidesDiv);

    // Replace #write with the Reveal structure
    if (writeDiv.id === 'write') {
      writeDiv.parentNode.replaceChild(revealDiv, writeDiv);
    } else {
      while (document.body.firstChild)
        document.body.removeChild(document.body.firstChild);
      document.body.appendChild(revealDiv);
    }

    // Post-processing passes
    postProcessCodeBlocks(revealDiv);
    postProcessImages(revealDiv);
    postProcessFragments(revealDiv);
  }

  // Ensure "language-" prefix on code blocks for highlight.js
  function postProcessCodeBlocks(root) {
    root.querySelectorAll('pre code').forEach(function (block) {
      var cls = block.className || '';
      if (cls && cls.indexOf('language-') === -1)
        block.className = 'language-' + cls;
    });
  }

  // Center standalone images (img as only child of <p>)
  function postProcessImages(root) {
    root.querySelectorAll('img').forEach(function (img) {
      var p = img.parentNode;
      if (p.tagName === 'P' && p.childNodes.length === 1)
        p.style.textAlign = 'center';
    });
  }

  // Fragment syntax: {.fragment} or <!-- .element: class="fragment" -->
  function postProcessFragments(root) {
    root.querySelectorAll('li, p, img, span').forEach(function (el) {
      var html = el.innerHTML;
      if (html.indexOf('{.fragment}') !== -1) {
        el.classList.add('fragment');
        el.innerHTML = html.replace(/\s*\{\.fragment\}\s*/g, '');
      }
      if (html.indexOf('<!-- .element: class="fragment"') !== -1) {
        el.classList.add('fragment');
        el.innerHTML = html.replace(
          /\s*<!--\s*\.element:\s*class="fragment"\s*-->\s*/g, ''
        );
      }
    });
  }

  function isEmptySlide(group) {
    for (var i = 0; i < group.length; i++) {
      var n = group[i];
      if (n.nodeType === Node.ELEMENT_NODE) return false;
      if (n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== '') return false;
    }
    return true;
  }

  // ────────────────────────────────────────────────────────
  //  3. SCRIPT LOADER (CDN mode only)
  // ────────────────────────────────────────────────────────
  function loadScript(url) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load: ' + url)); };
      document.head.appendChild(s);
    });
  }

  // ────────────────────────────────────────────────────────
  //  4. INITIALIZE REVEAL + KATEX
  // ────────────────────────────────────────────────────────
  function initReveal(userCfg) {
    var cfg = {};
    var k;
    for (k in DEFAULTS) cfg[k] = DEFAULTS[k];
    for (k in userCfg) {
      if (!NON_REVEAL_KEYS[k]) cfg[k] = userCfg[k];
    }

    cfg.plugins = [
      RevealHighlight,
      RevealNotes,
      RevealSearch,
      RevealZoom
    ];

    Reveal.initialize(cfg).then(function () {
      // KaTeX: render math using auto-render extension
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(document.querySelector('.reveal'), {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false},
            {left: '\\[', right: '\\]', display: true}
          ],
          throwOnError: false
        });
        Reveal.layout();  // recalculate slide sizes after math renders
      }

      var count = document.querySelectorAll('.reveal .slides > section').length;
      console.log('[typora-revealjs] Ready \u2014 ' + count + ' slides');
    });
  }

  // ────────────────────────────────────────────────────────
  //  5. BOOT — runs once DOM is ready
  // ────────────────────────────────────────────────────────
  function boot() {
    document.body.classList.add('typora-revealjs-loading');
    var userCfg = readFrontMatter();

    // Non-white themes need CDN (only white is bundled/linked)
    if (userCfg.theme && userCfg.theme !== 'white') {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = REVEAL_CDN + '/dist/theme/' + userCfg.theme + '.css';
      document.head.appendChild(link);
    }

    // Transform flat Typora HTML → Reveal.js slides
    transformDOM();

    // Strip ALL Typora stylesheets to avoid CSS conflicts.
    // Typora exports styles as <style id="style-base">, <style id="style-codemirror">,
    // <style id="style-theme_css">, <style id="style-mathjax">, etc.
    // We remove every <style> whose id starts with "style-" (Typora's pattern),
    // plus any <link> referencing typora paths.
    document.querySelectorAll(
      'link[href*="typora"], style[id^="style-"], style[data-typora]'
    ).forEach(function (s) { s.remove(); });
    document.body.removeAttribute('style');
    document.body.className = '';  // clear typora-export and any other body classes

    // ── Detect mode: embedded (globals exist) vs CDN (need to load) ──
    if (typeof Reveal !== 'undefined') {
      // Embedded mode — everything is already inlined
      initReveal(userCfg);
    } else {
      // CDN mode — load Reveal.js core, then plugins + KaTeX in parallel
      loadScript(REVEAL_CDN + '/dist/reveal.js')
        .then(function () {
          return Promise.all([
            loadScript(REVEAL_CDN + '/plugin/highlight/highlight.js'),
            loadScript(REVEAL_CDN + '/plugin/notes/notes.js'),
            loadScript(REVEAL_CDN + '/plugin/search/search.js'),
            loadScript(REVEAL_CDN + '/plugin/zoom/zoom.js'),
            loadScript(KATEX_CDN + '/katex.min.js')
          ]);
        })
        .then(function () {
          return loadScript(KATEX_CDN + '/contrib/auto-render.min.js');
        })
        .then(function () {
          initReveal(userCfg);
        })
        .catch(function (err) {
          console.error('[typora-revealjs]', err);
          document.body.innerHTML =
            '<div style="padding:2em;font-family:sans-serif">' +
            '<h2 style="color:#dc2626">Reveal.js failed to load</h2>' +
            '<p>Check your internet connection. This version requires CDN access.</p>' +
            '<pre>' + err.message + '</pre></div>';
        });
    }
  }

  // ── Entry point ─────────────────────────────────────
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', boot);
  else
    boot();
})();
