/* global hexo */

'use strict';

const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('before_generate', function() {
  const customIndexPath = path.join(hexo.base_dir, 'layout', 'index.ejs');

  if (!fs.existsSync(customIndexPath)) {
    return;
  }

  const template = fs.readFileSync(customIndexPath, 'utf8');
  hexo.theme.setView('index.ejs', template);
});
