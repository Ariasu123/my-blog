/* global hexo */

'use strict';

const fs = require('fs');
const path = require('path');

const TOP_LEVEL_VIEWS = ['index.ejs', 'tags.ejs'];

function getSynchronizedProjectViews() {
  const layoutDir = path.join(hexo.base_dir, 'layout');

  if (!fs.existsSync(layoutDir)) {
    return [];
  }

  return TOP_LEVEL_VIEWS.map((name) => {
    const filePath = path.join(layoutDir, name);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    if (!hexo.theme.getView(name)) {
      return null;
    }

    return {
      name,
      filePath
    };
  }).filter(Boolean);
}

hexo.extend.filter.register('before_generate', function() {
  getSynchronizedProjectViews().forEach(({ name, filePath }) => {
    const template = fs.readFileSync(filePath, 'utf8');
    hexo.theme.setView(name, template);
  });
});
