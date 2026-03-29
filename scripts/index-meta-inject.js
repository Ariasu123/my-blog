/* global hexo */

'use strict';

const { stripHTML } = require('hexo-util');

function getWordCount(post) {
  const content = stripHTML(post.origin || post.content || '').replace(/[\s\r\n]/g, '');
  return content.length;
}

function getReadingMinutes(post, awl, wpm) {
  return Math.floor(getWordCount(post) / ((awl || 2) * (wpm || 60))) + 1;
}

hexo.extend.filter.register('after_render:html', function(html, locals) {
  if (!locals || locals.path !== 'index.html' || !locals.page || !locals.page.posts) {
    return html;
  }

  const theme = locals.theme || {};
  const postConfig = theme.post || {};
  const metaConfig = postConfig.meta || {};
  const min2read = metaConfig.min2read || {};
  const awl = parseInt(min2read.awl, 10) || 2;
  const wpm = parseInt(min2read.wpm, 10) || 60;
  const posts = locals.page.posts.toArray();

  const cardRegex = /<div class="index-btm post-metas">[\s\S]*?<\/div>\s*<\/article>/g;
  let index = 0;

  return html.replace(cardRegex, (match) => {
    const post = posts[index];
    index += 1;

    if (!post) {
      return match;
    }

    const injectedMeta = [
      '<div class="post-meta mr-3">',
      '  <i class="iconfont icon-chart"></i>',
      `  <span>${getWordCount(post)} 字</span>`,
      '</div>',
      '<div class="post-meta">',
      '  <i class="iconfont icon-clock-fill"></i>',
      `  <span>${getReadingMinutes(post, awl, wpm)} 分钟</span>`,
      '</div>'
    ].join('');

    return match.replace('</div>\n    </article>', `${injectedMeta}</div>\n    </article>`);
  });
});
