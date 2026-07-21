/* global hexo */

'use strict';

const { stripHTML } = require('hexo-util');

/**
 * 修正 Fluid 字数/阅读时长统计。
 *
 * markdown-it-mathjax3 会在文章 HTML 中注入 <style> 样式表与
 * <mjx-assistive-mml> 隐藏辅助 MathML。Fluid 默认算法是
 * stripHTML(content).length,会把这些 CSS/LaTeX 文本全部计入字数,
 * 导致字数与阅读时长严重虚高(例如 1.6k 字显示成 70k)。
 *
 * 主题 wordcount helper 会优先使用 post.wordcount 预设值,
 * 因此在本过滤器中预先计算剔除样式/脚本/隐藏 MathML 后的字数并写入。
 * 页面显示内容不受影响。
 */
hexo.extend.filter.register('after_post_render', function(data) {
  if (!data || typeof data.content !== 'string') {
    return data;
  }

  const cleaned = data.content
    .replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<mjx-assistive-mml[\s\S]*?<\/mjx-assistive-mml>/g, '');

  data.wordcount = stripHTML(cleaned).replace(/[\s\r\n]/g, '').length;
  return data;
});
