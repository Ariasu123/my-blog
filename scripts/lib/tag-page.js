'use strict';

function splitTagName(name) {
  if (typeof name !== 'string') {
    return [];
  }

  return name
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
}

function slugifyTag(name) {
  if (typeof name !== 'string') {
    return '';
  }

  return encodeURIComponent(name.trim().replace(/[\s/]+/g, '-'));
}

function hashTagName(name) {
  let hash = 0;

  for (const char of name) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }

  return Math.abs(hash);
}

function buildTagPalette(name) {
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const seed = hashTagName(normalizedName);
  const hue = seed % 360;
  const accentHue = (hue + 28) % 360;

  return {
    background: `linear-gradient(135deg, hsl(${hue} 78% 96%), hsl(${accentHue} 72% 90%))`,
    border: `hsl(${hue} 52% 78%)`,
    text: `hsl(${hue} 42% 28%)`
  };
}

function getRawTagPath(tag) {
  const tagPath = typeof tag?.path === 'string' ? tag.path.trim() : '';

  if (tagPath) {
    return tagPath;
  }

  return `tags/${slugifyTag(tag?.originalName)}/`;
}

function normalizeTags(tags) {
  const cardsByName = new Map();
  const sortedTags = (Array.isArray(tags) ? tags : [])
    .map((tag) => ({
      ...tag,
      originalName: typeof tag?.name === 'string' ? tag.name.trim() : ''
    }))
    .sort((left, right) => left.originalName.localeCompare(right.originalName, 'zh-CN'));

  for (const tag of sortedTags) {
    const { originalName } = tag;

    if (!originalName) {
      continue;
    }

    const rawPath = getRawTagPath(tag);

    for (const name of splitTagName(originalName)) {
      if (!cardsByName.has(name)) {
        cardsByName.set(name, {
          name,
          directRawPath: originalName === name ? rawPath : '',
          fallbackRawPath: originalName === name ? '' : rawPath
        });
        continue;
      }

      const existing = cardsByName.get(name);

      if (originalName === name) {
        existing.directRawPath = rawPath;
        continue;
      }

      if (!existing.fallbackRawPath || rawPath.localeCompare(existing.fallbackRawPath, 'en') < 0) {
        existing.fallbackRawPath = rawPath;
      }
    }
  }

  return Array.from(cardsByName.values())
    .map(({ name, directRawPath, fallbackRawPath }) => ({
      name,
      rawPath: directRawPath || fallbackRawPath,
      palette: buildTagPalette(name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
}

module.exports = {
  splitTagName,
  slugifyTag,
  buildTagPalette,
  normalizeTags
};
