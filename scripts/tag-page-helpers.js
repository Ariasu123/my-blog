/* global hexo */

'use strict';

const { normalizeTags } = require('./lib/tag-page');

function toArray(tags) {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags.toArray === 'function') {
    return tags.toArray();
  }

  return [];
}

hexo.extend.helper.register('build_tag_cards', function(tags) {
  const cards = normalizeTags(toArray(tags));

  return cards.map((card) => {
    const palette = {
      background: card?.palette?.background || 'linear-gradient(135deg, hsl(210 20% 96%), hsl(210 16% 92%))',
      border: card?.palette?.border || 'hsl(210 18% 80%)',
      text: card?.palette?.text || 'hsl(210 24% 28%)'
    };
    const rawPath = typeof card?.rawPath === 'string' && card.rawPath.trim()
      ? card.rawPath
      : '#';
    const style = [
      `--tag-bg:${palette.background}`,
      `--tag-border:${palette.border}`,
      `--tag-text:${palette.text}`
    ].join(';');

    return {
      name: card?.name || '',
      path: this.url_for(rawPath),
      palette,
      style
    };
  });
});
