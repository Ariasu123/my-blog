# Blog Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the extra post copyright URL, center only the about-page body content, and prevent static assets from entering the live search index.

**Architecture:** Keep the existing Hexo + Fluid structure intact and implement each fix at the narrowest stable extension point. Use a project-side `theme_inject` override for the copyright partial, scoped CSS in `custom.css` for the about page body, and a project-side search generator that produces the live `search.xml` while filtering out `assets/` pages.

**Tech Stack:** Hexo 8, Fluid theme, EJS partial overrides, custom project scripts, CSS, Node.js verification via `node -e`

---

## File Structure

- Modify: `_config.yml`
  - Keep the existing search settings, but move the third-party `hexo-generator-searchdb` output off `search.xml` so the project-side filtered generator can own the live index path.
  - Note: this file is already dirty in the working tree, so merge carefully and review the diff before committing.
- Modify: `source/assets/css/custom.css`
  - Add about-page-only centering rules scoped to `.about-content.page-content .markdown-body`.
- Create: `scripts/post-copyright-inject.js`
  - Override Fluid's default `postCopyright` inject point from the project side.
- Create: `layout/_partials/post/copyright.ejs`
  - Project-owned copy of the Fluid copyright partial with the article URL line removed.
- Create: `scripts/search-index-generator.js`
  - Generate the live `search.xml` and filter out static resources whose page path starts with `assets/`.

## Validation Targets

- `public/2026/03/29/hello-blog/index.html`
  - Used to confirm the copyright card no longer prints the bare article URL.
- `public/about/index.html`
  - Used to confirm the about page header block remains present after body-only CSS changes.
- `public/search.xml`
  - Used to confirm the live search index no longer includes `/assets/css/custom.css` and still contains normal pages such as `关于` and `项目`.
- `public/assets/css/custom.css`
  - Used to confirm the about-page centering CSS is emitted into the build output.

### Task 1: Override the post copyright card

**Files:**
- Create: `scripts/post-copyright-inject.js`
- Create: `layout/_partials/post/copyright.ejs`
- Test: `public/2026/03/29/hello-blog/index.html`

- [ ] **Step 1: Write the failing verification for the copyright card**

Run: `npm run build && node -e "const fs=require('fs'); const html=fs.readFileSync('public/2026/03/29/hello-blog/index.html','utf8'); if (html.includes('https://ariasu123.github.io/my-blog/2026/03/29/hello-blog/')) { console.error('copyright card still shows article URL'); process.exit(1); } if (!html.includes('icon-cc-by')) { console.error('license icon missing'); process.exit(1); } console.log('copyright card URL removed');"`

Expected: FAIL with `copyright card still shows article URL`

- [ ] **Step 2: Add a project-side inject override script**

Create `scripts/post-copyright-inject.js` with:

```js
/* global hexo */
'use strict';

const fs = require('fs');
const path = require('path');

hexo.extend.filter.register('theme_inject', function(injects) {
  const overridePath = path.join(hexo.base_dir, 'layout/_partials/post/copyright.ejs');

  if (!fs.existsSync(overridePath)) {
    return;
  }

  injects.postCopyright.file('default', overridePath);
});
```

- [ ] **Step 3: Add the overridden copyright partial without the bare URL line**

Create `layout/_partials/post/copyright.ejs` with:

```ejs
<% if (theme.post.copyright.enable && page.copyright !== false) { %>
  <%
    var license = theme.post.copyright.license || ''
    if (typeof page.copyright === 'string') {
      license = page.copyright
    } else if (typeof page.license === 'string') {
      license = page.license
    }
    license = license.toUpperCase()
  %>

  <div class="license-box my-3">
    <div class="license-title">
      <div><%= page.title %></div>
    </div>
    <div class="license-meta">
      <% if (theme.post.copyright.author.enable && (page.author || config.author)) { %>
        <div class="license-meta-item">
          <div><%- __('post.copyright.author') %></div>
          <div><%- page.author || config.author %></div>
        </div>
      <% } %>
      <% if (theme.post.copyright.post_date.enable && page.date) { %>
        <div class="license-meta-item license-meta-date">
          <div><%- __('post.copyright.posted') %></div>
          <div><%= full_date(page.date, theme.post.copyright.post_date.format || 'LL') %></div>
        </div>
      <% } %>
      <% if (theme.post.copyright.update_date.enable && page.updated && compare_date(page.date, page.updated)) { %>
        <div class="license-meta-item license-meta-date">
          <div><%- __('post.copyright.updated') %></div>
          <div><%= full_date(page.updated, theme.post.copyright.update_date.format || 'LL') %></div>
        </div>
      <% } %>
      <% if (license) { %>
        <div class="license-meta-item">
          <div><%- __('post.copyright.licensed') %></div>
          <div>
            <% if (['BY', 'BY-SA', 'BY-ND', 'BY-NC', 'BY-NC-SA', 'BY-NC-ND'].indexOf(license) !== -1) { %>
              <% var items = license.split('-') %>
              <% for (var idx = 0; idx < items.length; idx++) { %>
                <a class="print-no-link" target="_blank" href="https://creativecommons.org/licenses/<%= license.toLowerCase() %>/4.0/">
                  <span class="hint--top hint--rounded" aria-label="<%- __('post.copyright.' + items[idx]) %>">
                    <i class="iconfont icon-cc-<%= items[idx].toLowerCase() %>"></i>
                  </span>
                </a>
              <% } %>
            <% } else if (license === 'ZERO') {  %>
              <a class="print-no-link" target="_blank" href="https://creativecommons.org/publicdomain/zero/1.0/">
                <span class="hint--top hint--rounded" aria-label="<%- __('post.copyright.ZERO') %>">
                  <i class="iconfont icon-cc-zero"></i>
                </span>
              </a>
            <% } else { %>
              <%- license %>
            <% } %>
          </div>
        </div>
      <% } %>
    </div>
    <div class="license-icon iconfont"></div>
  </div>
<% } %>
```

- [ ] **Step 4: Run the verification again and confirm the license stays intact**

Run: `npm run build && node -e "const fs=require('fs'); const html=fs.readFileSync('public/2026/03/29/hello-blog/index.html','utf8'); if (html.includes('https://ariasu123.github.io/my-blog/2026/03/29/hello-blog/')) { console.error('copyright card still shows article URL'); process.exit(1); } if (!html.includes('icon-cc-by')) { console.error('license icon missing'); process.exit(1); } console.log('copyright card URL removed and license preserved');"`

Expected: PASS with `copyright card URL removed and license preserved`

- [ ] **Step 5: Commit the copyright override**

Run:

```bash
git add scripts/post-copyright-inject.js layout/_partials/post/copyright.ejs
git commit -m "fix: remove extra post copyright url"
```

### Task 2: Center only the about-page body content

**Files:**
- Modify: `source/assets/css/custom.css`
- Test: `public/assets/css/custom.css`
- Test: `public/about/index.html`

- [ ] **Step 1: Write the failing verification for about-page centering CSS**

Run: `npm run build && node -e "const fs=require('fs'); const css=fs.readFileSync('public/assets/css/custom.css','utf8'); if (!css.includes('.about-content.page-content .markdown-body') || !css.includes('text-align: center')) { console.error('about centering rule missing'); process.exit(1); } console.log('about centering rule present');"`

Expected: FAIL with `about centering rule missing`

- [ ] **Step 2: Add a narrow, about-only centering block to custom CSS**

Append this block near the end of `source/assets/css/custom.css`, before the media query if possible:

```css
.about-content.page-content .markdown-body {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.about-content.page-content .markdown-body ul,
.about-content.page-content .markdown-body ol {
  padding-left: 0;
  list-style-position: inside;
}

.about-content.page-content .markdown-body li + li {
  margin-top: 0.5rem;
}
```

- [ ] **Step 3: Rebuild and verify the about header remains untouched while the body CSS is present**

Run: `npm run build && node -e "const fs=require('fs'); const html=fs.readFileSync('public/about/index.html','utf8'); const css=fs.readFileSync('public/assets/css/custom.css','utf8'); ['.about-content.page-content .markdown-body','text-align: center','list-style-position: inside'].forEach((token) => { if (!css.includes(token)) { console.error('missing about centering CSS'); process.exit(1); } }); if (!html.includes('about-info')) { console.error('about header block missing'); process.exit(1); } console.log('about body centered and header preserved');"`

Expected: PASS with `about body centered and header preserved`

- [ ] **Step 4: Commit the about-page styling change**

Run:

```bash
git add source/assets/css/custom.css
git commit -m "fix: center about page body content"
```

### Task 3: Replace the live search index with a filtered project-side generator

**Files:**
- Modify: `_config.yml`
- Create: `scripts/search-index-generator.js`
- Test: `public/search.xml`

- [ ] **Step 1: Write the failing verification for the live search index**

Run: `npm run build && node -e "const fs=require('fs'); const xml=fs.readFileSync('public/search.xml','utf8'); if (xml.includes('/assets/css/custom.css')) { console.error('search.xml still includes assets'); process.exit(1); } ['<title>关于</title>','<title>项目</title>'].forEach((token) => { if (!xml.includes(token)) { console.error('missing expected page entry'); process.exit(1); } }); if (xml.includes('<title>Untitled</title>')) { console.error('search.xml still includes Untitled entries'); process.exit(1); } console.log('search.xml filtered correctly');"`

Expected: FAIL with `search.xml still includes assets`

- [ ] **Step 2: Move the third-party plugin output off the live search path**

Update the `search` block in `_config.yml` to:

```yml
search:
  path: searchdb.xml
  field: all
  content: true
  format: html
```

Only change the `path` value. Keep the rest of the block intact.

- [ ] **Step 3: Add a project-side generator that owns `search.xml` and filters out `assets/` pages**

Create `scripts/search-index-generator.js` with:

```js
/* global hexo */
'use strict';

const { stripHTML } = require('hexo-util');

function removeCodeGutters(content) {
  return (content || '').replace(/<td class="gutter">.*?<\/td>/g, '');
}

function buildContent(article, searchConfig) {
  if (searchConfig.content === false) {
    return '';
  }

  if (searchConfig.format === 'raw') {
    return article._content || '';
  }

  const html = removeCodeGutters(article.content || '');
  return searchConfig.format === 'striptags' ? stripHTML(html) : html;
}

function wrapTerms(tagName, collection) {
  if (!collection || collection.length === 0) {
    return '';
  }

  const body = collection
    .map((item) => `      <${tagName}>${item.name}</${tagName}>`)
    .join('\n');

  return `    <${tagName}s>\n${body}\n    </${tagName}s>`;
}

function buildEntry(article, root, searchConfig, isPost) {
  const entry = [
    '  <entry>',
    `    <title>${article.title || ''}</title>`,
    `    <url>${encodeURI(root + article.path)}</url>`,
    `    <content><![CDATA[${buildContent(article, searchConfig).replace(/]]>/g, ']]]]><![CDATA[>')}]]></content>`
  ];

  if (isPost) {
    const categoriesXml = wrapTerms('category', article.categories);
    const tagsXml = wrapTerms('tag', article.tags);

    if (categoriesXml) {
      entry.push(categoriesXml);
    }

    if (tagsXml) {
      entry.push(tagsXml);
    }
  }

  entry.push('  </entry>');
  return entry.join('\n');
}

function isSearchablePage(page) {
  return Boolean(page.path) && !page.path.startsWith('assets/');
}

hexo.extend.generator.register('custom_search_xml', function(locals) {
  const searchConfig = this.config.search || {};
  const field = (searchConfig.field || 'all').trim() || 'all';
  const entries = [];

  if (field === 'all' || field === 'post') {
    locals.posts.sort('-date').forEach((post) => {
      entries.push(buildEntry(post, this.config.root, searchConfig, true));
    });
  }

  if (field === 'all' || field === 'page') {
    locals.pages.filter(isSearchablePage).forEach((page) => {
      entries.push(buildEntry(page, this.config.root, searchConfig, false));
    });
  }

  return {
    path: 'search.xml',
    data: `<?xml version="1.0" encoding="utf-8"?>\n<search>\n${entries.join('\n')}\n</search>\n`
  };
});
```

- [ ] **Step 4: Rebuild and verify the live search index keeps normal pages but drops assets**

Run: `npm run build && node -e "const fs=require('fs'); const xml=fs.readFileSync('public/search.xml','utf8'); if (xml.includes('/assets/css/custom.css')) { console.error('search.xml still includes assets'); process.exit(1); } if (xml.includes('<title>Untitled</title>')) { console.error('search.xml still includes Untitled entries'); process.exit(1); } ['<title>关于</title>','<title>项目</title>','<title>Hello Blog</title>'].forEach((token) => { if (!xml.includes(token)) { console.error('missing expected page entry'); process.exit(1); } }); console.log('search.xml filtered and content pages preserved');"`

Expected: PASS with `search.xml filtered and content pages preserved`

- [ ] **Step 5: Review the config diff and commit the filtered search generator**

Run:

```bash
git diff -- _config.yml scripts/search-index-generator.js
git add _config.yml scripts/search-index-generator.js
git commit -m "fix: filter static assets from search index"
```

### Task 4: Run final regression checks for all three fixes

**Files:**
- Test: `public/2026/03/29/hello-blog/index.html`
- Test: `public/about/index.html`
- Test: `public/search.xml`
- Test: `public/assets/css/custom.css`

- [ ] **Step 1: Run a clean build of the site**

Run: `npm run build`

Expected: PASS with Hexo generation completing successfully

- [ ] **Step 2: Run a combined regression assertion across the built output**

Run: `node -e "const fs=require('fs'); const post=fs.readFileSync('public/2026/03/29/hello-blog/index.html','utf8'); const about=fs.readFileSync('public/about/index.html','utf8'); const xml=fs.readFileSync('public/search.xml','utf8'); const css=fs.readFileSync('public/assets/css/custom.css','utf8'); if (post.includes('https://ariasu123.github.io/my-blog/2026/03/29/hello-blog/')) { throw new Error('post copyright URL still rendered'); } if (!post.includes('icon-cc-by')) { throw new Error('license icon missing'); } if (!about.includes('about-info')) { throw new Error('about header missing'); } if (!css.includes('.about-content.page-content .markdown-body')) { throw new Error('about centering CSS missing'); } if (xml.includes('/assets/css/custom.css')) { throw new Error('search index still includes custom.css'); } ['<title>关于</title>','<title>项目</title>'].forEach((token) => { if (!xml.includes(token)) { throw new Error(`missing ${token}`); } }); console.log('blog iteration regression checks passed');"`

Expected: PASS with `blog iteration regression checks passed`

- [ ] **Step 3: Start the local preview server for a manual smoke check**

Run: `npm run server`

Expected: PASS with Hexo serving a local preview URL; open the local site and verify:
- `/2026/03/29/hello-blog/` shows the copyright card without the bare URL
- `/about/` keeps the avatar header and centers the markdown body
- Search for `d`, `cuda`, `项目`, and `关于` and confirm the `Untitled` CSS result is gone

- [ ] **Step 4: Stop the server and confirm the working tree is clean after the task commits**

Run: `git status --short`

Expected: no unexpected source changes beyond intentional docs/spec artifacts

## Self-Review

- **Spec coverage:** Task 1 covers removing the copyright-card URL while preserving the CC license display. Task 2 covers centering only the about-page body content. Task 3 covers source-level filtering of static assets from the live search index while preserving normal pages. Task 4 covers the final regression pass, including the requirement that the homepage structure remains unaffected by scoped changes.
- **Placeholder scan:** No `TBD`, `TODO`, or implied "write tests later" steps remain. Every code-changing step includes the exact file contents or snippet to apply, and every verification step includes an executable command plus an expected result.
- **Type consistency:** The search plan uses one generator name (`custom_search_xml`) and one filter helper (`isSearchablePage`) consistently. The copyright override path is the same in the inject script and in the file map.
