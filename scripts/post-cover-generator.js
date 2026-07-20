/* global hexo */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const DEFAULT_COVERS = new Set([
  '/assets/images/default-cover.svg',
  'assets/images/default-cover.svg'
]);

// 深蓝紫系色板,与全站设计令牌一致
const PALETTES = [
  { from: '#131c3f', to: '#2b3f8f', accent: '#4f7cff' },
  { from: '#1a1440', to: '#3b2a7a', accent: '#8b5cf6' },
  { from: '#0e1e3a', to: '#1d4e89', accent: '#38bdf8' },
  { from: '#221239', to: '#4c1d95', accent: '#a78bfa' },
  { from: '#0f1f33', to: '#155e75', accent: '#22d3ee' },
  { from: '#1c1533', to: '#3730a3', accent: '#818cf8' },
  { from: '#101a2e', to: '#1e3a5f', accent: '#6d8bff' },
  { from: '#241535', to: '#6d28d9', accent: '#c084fc' }
];

let coverMapCache = null;

function getCoverMap() {
  if (coverMapCache) {
    return coverMapCache;
  }

  const dataFile = path.join(hexo.source_dir, '_data', 'covers.yml');
  coverMapCache = {};

  if (fs.existsSync(dataFile)) {
    try {
      const data = yaml.load(fs.readFileSync(dataFile, 'utf8'));
      if (data && typeof data === 'object') {
        coverMapCache = data;
      }
    } catch (err) {
      hexo.log.warn('[post-cover] covers.yml 解析失败: ' + err.message);
    }
  }

  return coverMapCache;
}

function isExplicitCover(indexImg) {
  return Boolean(indexImg) && !DEFAULT_COVERS.has(indexImg);
}

function postHash(post) {
  const base = post.source ? path.basename(post.source).replace(/\.md$/, '') : '';
  const raw = String(post.title || '') + '|' + base;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 10);
}

function mappedCover(post) {
  const map = getCoverMap();
  if (post.slug && map[post.slug]) {
    return map[post.slug];
  }
  if (post.source) {
    const base = path.basename(post.source).replace(/\.md$/, '');
    if (map[base]) {
      return map[base];
    }
  }
  return null;
}

function xmlEscape(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, max) {
  const chars = Array.from(String(text || ''));
  return chars.length > max ? chars.slice(0, max).join('') + '…' : chars.join('');
}

function buildCoverSvg(post) {
  const hash = postHash(post);
  const hashNum = parseInt(hash.slice(0, 8), 16);
  const palette = PALETTES[hashNum % PALETTES.length];

  const title = xmlEscape(truncate(post.title || 'Untitled', 20));
  const categories = post.categories && post.categories.length > 0
    ? post.categories.toArray().map((item) => item.name).join(' / ')
    : '';
  const date = post.date && typeof post.date.format === 'function'
    ? post.date.format('YYYY-MM-DD')
    : '';
  const meta = xmlEscape(truncate([categories, date].filter(Boolean).join(' · '), 32));

  // 由哈希派生光斑位置,保证每篇构图不同
  const cx1 = 720 + (hashNum % 380);
  const cy1 = 120 + (hashNum % 180);
  const r1 = 180 + (hashNum % 120);
  const cx2 = 120 + (hashNum % 240);
  const cy2 = 480 + (hashNum % 120);
  const r2 = 120 + (hashNum % 90);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${palette.from}"/>
      <stop offset="1" stop-color="${palette.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.12" r="0.95">
      <stop offset="0" stop-color="${palette.accent}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M60 0H0V60" fill="none" stroke="#ffffff" stroke-opacity="0.06"/>
    </pattern>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect width="1200" height="675" fill="url(#grid)"/>
  <rect width="1200" height="675" fill="url(#glow)"/>
  <circle cx="${cx1}" cy="${cy1}" r="${r1}" fill="#ffffff" fill-opacity="0.07"/>
  <circle cx="${cx2}" cy="${cy2}" r="${r2}" fill="#ffffff" fill-opacity="0.05"/>
  <text x="72" y="556" font-family="-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif" font-size="52" font-weight="700" fill="#f1f4ff">${title}</text>
  <text x="72" y="612" font-family="-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif" font-size="26" fill="#aab4d4">${meta}</text>
</svg>
`;
}

// 封面优先级:front-matter 显式 index_img > covers.yml 映射 > 自动生成
hexo.extend.helper.register('post_cover', function(post) {
  if (isExplicitCover(post.index_img)) {
    return post.index_img;
  }

  const mapped = mappedCover(post);
  if (mapped) {
    return mapped;
  }

  return '/assets/covers/' + postHash(post) + '.svg';
});

hexo.extend.generator.register('post_covers', function(locals) {
  const routes = [];
  const seen = new Set();

  locals.posts.forEach((post) => {
    if (isExplicitCover(post.index_img) || mappedCover(post)) {
      return;
    }

    const hash = postHash(post);
    if (seen.has(hash)) {
      return;
    }
    seen.add(hash);

    routes.push({
      path: 'assets/covers/' + hash + '.svg',
      data: buildCoverSvg(post)
    });
  });

  hexo.log.info('[post-cover] 生成 ' + routes.length + ' 张自动封面');
  return routes;
});
