#!/usr/bin/env node
// Generates test HTML files by combining plugin files with sample body content.
// This simulates what Typora does: inject plugin.txt into <head />.
//
// Outputs:
//   test-cdn.html       — uses plugin-cdn.txt  (requires internet)
//   test-embedded.html  — uses plugin.txt      (fully self-contained)

const fs = require('fs');
const path = require('path');

const body = [
  '<div id="write">',
  '',
  '<h1>Building Microservices</h1>',
  '<h2>A Practical Architecture Guide</h2>',
  '',
  '<hr>',
  '',
  '<h2>Why Microservices?</h2>',
  '<p>Monoliths work &mdash; until they don\'t.</p>',
  '<ul>',
  '<li><strong>Team autonomy</strong> &mdash; each squad owns a service</li>',
  '<li><strong>Independent deployability</strong> &mdash; ship without coordinating</li>',
  '<li><strong>Technology heterogeneity</strong> &mdash; pick the right tool</li>',
  '</ul>',
  '',
  '<hr>',
  '',
  '<h2>Code Example</h2>',
  '<pre><code class="language-python">import httpx',
  '',
  'async def get_inventory(product_id: str) -&gt; dict:',
  '    async with httpx.AsyncClient() as client:',
  '        resp = await client.get(',
  '            f"http://inventory-svc/api/v1/products/{product_id}"',
  '        )',
  '        resp.raise_for_status()',
  '        return resp.json()',
  '</code></pre>',
  '<pre><code class="language-yaml">services:',
  '  jaeger:',
  '    image: jaegertracing/all-in-one:1.54',
  '    ports:',
  '      - "16686:16686"',
  '</code></pre>',
  '',
  '<hr>',
  '',
  '<h2>Math Example</h2>',
  '<p>Inline: the probability is $P = \\frac{1}{n+1}$ for each key.</p>',
  '<p>Display mode:</p>',
  '<p>$$E[\\text{moved}] = \\frac{K}{n+1}$$</p>',
  '',
  '<hr>',
  '',
  '<h2>Key Takeaways</h2>',
  '<ol>',
  '<li>Start with a modular monolith</li>',
  '<li>Boundaries should follow business domains</li>',
  '<li>Invest in observability <strong>before</strong> you need it</li>',
  '</ol>',
  '<blockquote><p>Note: Remind the audience about the ADRs template.</p></blockquote>',
  '',
  '<hr>',
  '',
  '<h2>Thank You</h2>',
  '<p>Questions?</p>',
  '',
  '</div>',
].join('\n');

function generate(pluginFile, outFile) {
  const plugin = fs.readFileSync(path.join(__dirname, pluginFile), 'utf8');
  const html = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<title>Test Export (' + pluginFile + ')</title>',
    '',
    plugin,
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
  ].join('\n');

  fs.writeFileSync(path.join(__dirname, outFile), html);
  console.log('  ' + outFile + ': ' + (Buffer.byteLength(html) / 1024).toFixed(0) + ' KB');
}

console.log('Generating test files...');
generate('plugin-cdn.txt', 'test-cdn.html');
generate('plugin.txt', 'test-embedded.html');
console.log('Done. Serve with: python3 -m http.server 8765');
