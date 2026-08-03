/* global hexo */

'use strict';

const MERMAID_CLASS = 'mermaid mermaid-pending';
const MERMAID_LOADER = 'assets/js/mermaid-init.js';
const MERMAID_FENCE = /<pre>\s*<code class="[^"]*\bmermaid\b[^"]*">([\s\S]*?)<\/code>\s*<\/pre>/gi;

function normalizeRoot(root) {
  const value = root || '/';
  return value.endsWith('/') ? value : `${value}/`;
}

hexo.extend.filter.register('after_render:html', function(html) {
  const rendered = html.replace(MERMAID_FENCE, function(_match, source) {
    return [
      `<div class="${MERMAID_CLASS}" role="img" aria-label="流程图" aria-busy="true">`,
      source.trim(),
      '</div>'
    ].join('');
  });

  if (rendered === html) {
    return html;
  }

  if (rendered.includes('data-mermaid-loader')) {
    return rendered;
  }

  const root = normalizeRoot(hexo.config.root);
  const loader = `<script src="${root}${MERMAID_LOADER}" defer data-mermaid-loader></script>`;

  return rendered.replace('</body>', `${loader}\n</body>`);
});
