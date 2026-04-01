/* global hexo */

'use strict';

const path = require('path');

hexo.extend.filter.register('theme_inject', function(injects) {
  injects.postCopyright.file('default', path.join(hexo.base_dir, 'layout/_partials/post/copyright.ejs'));
});
