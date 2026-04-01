/* global hexo */

'use strict';

const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');
const { stripHTML } = require('hexo-util');

const env = new nunjucks.Environment();
const searchTemplatePath = path.join(path.dirname(require.resolve('hexo-generator-searchdb/package.json')), 'templates', 'search.xml');
const searchTemplate = nunjucks.compile(fs.readFileSync(searchTemplatePath, 'utf8'), env);

function isAssetPage(page) {
  return Boolean(page && page.path && page.path.startsWith('assets/'));
}

function toSearchEntry(article, config, isPost) {
  const entry = {};

  if (article.title) {
    entry.title = article.title;
  }

  if (article.path) {
    entry.url = encodeURI(config.root + article.path);
  }

  if (config.search.content !== false) {
    if (config.search.format === 'raw') {
      entry.content = article._content;
    } else {
      entry.content = article.content.replace(/<td class="gutter">.*?<\/td>/g, '');
      if (config.search.format === 'striptags') {
        entry.content = stripHTML(entry.content);
      }
    }
  } else {
    entry.content = '';
  }

  if (!isPost) {
    return entry;
  }

  if (article.categories && article.categories.length > 0) {
    entry.categories = article.categories.map((category) => category.name);
  }

  if (article.tags && article.tags.length > 0) {
    entry.tags = article.tags.map((tag) => tag.name);
  }

  return entry;
}

hexo.extend.generator.register('search_index', function(locals) {
  const config = this.config;
  const searchField = config.search.field;
  const database = [];

  if (searchField === 'all' || searchField === 'post') {
    locals.posts.forEach((post) => {
      database.push(toSearchEntry(post, config, true));
    });
  }

  if (searchField === 'all' || searchField === 'page') {
    locals.pages
      .filter((page) => !isAssetPage(page))
      .forEach((page) => {
        database.push(toSearchEntry(page, config, false));
      });
  }

  return {
    path: 'search.xml',
    data: searchTemplate.render({
      articles: database,
      config: config.search
    })
  };
});
