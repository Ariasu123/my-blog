/* global hexo */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * 加载 source/_data/portfolio.yml 作为个人展示内容的单一数据源,
 * 合并到 theme.portfolio,供布局模板(index / projects / banner hero)使用。
 */
hexo.extend.filter.register('before_generate', function() {
  const dataFile = path.join(hexo.source_dir, '_data', 'portfolio.yml');

  if (!fs.existsSync(dataFile)) {
    hexo.log.warn('[portfolio] source/_data/portfolio.yml 不存在,跳过个人展示数据加载');
    return;
  }

  try {
    const data = yaml.load(fs.readFileSync(dataFile, 'utf8')) || {};
    hexo.theme.config.portfolio = data;
  } catch (err) {
    hexo.log.error('[portfolio] portfolio.yml 解析失败: ' + err.message);
  }
});
