# Obsidian-to-Hexo Automated Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hexo + Fluid personal blog that supports article covers, category/tag navigation, local search, an independent projects page, MapleMono font wiring, and GitHub Pages project-site deployment for `my-blog`.

**Architecture:** Use Hexo as the static site generator and Fluid as the low-intrusion theme base. Keep custom behavior in root config, standalone pages, a lightweight `sync-covers.js` preprocessing script, custom CSS, and one root-level homepage template override for index reading-time metadata. Configure the site for GitHub Pages project-path deployment so future GitHub repository creation and push are straightforward.

**Tech Stack:** Node.js, Hexo 8, Hexo Fluid theme, hexo-generator-searchdb, gray-matter, GitHub Actions, GitHub Pages

---

## File Map

- `package.json` — project metadata, scripts, and Hexo/Fluid/search dependencies
- `package-lock.json` — npm lockfile for deterministic installs
- `_config.yml` — Hexo root config, project-site `url/root`, searchdb plugin config
- `_config.fluid.yml` — Fluid theme configuration, menus, search modal, cover defaults, reading metadata, about page config
- `layout/index.ejs` — homepage override to add index-level wordcount and reading-time display without touching theme internals
- `source/_posts/hello-blog.md` — sample post for local verification
- `source/about/index.md` — about page content
- `source/projects/index.md` — independent project cards page
- `source/categories/index.md` — categories listing page
- `source/tags/index.md` — tags listing page
- `source/assets/css/custom.css` — custom style overrides and MapleMono font-face wiring
- `source/assets/fonts/.gitkeep` — placeholder until the real MapleMono font file is added
- `source/assets/images/default-cover.svg` — default post cover asset
- `source/assets/images/default-banner.svg` — default banner asset
- `source/assets/images/avatar.svg` — default about/avatar asset
- `scripts/sync-covers.js` — front-matter cover synchronization skeleton
- `.github/workflows/deploy.yml` — GitHub Pages deployment workflow
- `.gitignore` — local build and dependency ignores
- `docs/superpowers/specs/2026-03-28-obsidian-to-hexo-blog-design.md` — approved design spec

### Task 1: Initialize Hexo Runtime

**Files:**
- Modify: `package.json`
- Generate: `package-lock.json`

- [ ] **Step 1: Verify runtime dependencies in `package.json`**

```json
{
  "dependencies": {
    "gray-matter": "^4.0.3",
    "hexo": "^8.1.1",
    "hexo-cli": "^4.3.2",
    "hexo-generator-archive": "^2.0.0",
    "hexo-generator-category": "^2.0.0",
    "hexo-generator-index": "^4.0.0",
    "hexo-generator-searchdb": "^1.5.0",
    "hexo-generator-tag": "^2.0.0",
    "hexo-renderer-ejs": "^2.0.0",
    "hexo-renderer-marked": "^7.0.0",
    "hexo-renderer-stylus": "^3.0.1",
    "hexo-server": "^3.0.0",
    "hexo-theme-fluid": "^1.9.9"
  }
}
```

- [ ] **Step 2: Install dependencies and refresh lockfile**

Run: `npm install`
Expected: install succeeds and `package-lock.json` records the same dependency graph.

- [ ] **Step 3: Smoke-check Hexo CLI availability**

Run: `npx hexo version`
Expected: output includes Hexo 8.x and Node version information.

### Task 2: Configure Root Hexo Settings

**Files:**
- Modify: `_config.yml`

- [ ] **Step 1: Set GitHub Pages project-site URL and root**

```yml
url: https://<username>.github.io/my-blog
root: /my-blog/
```

- [ ] **Step 2: Configure searchdb plugin output and core generators**

```yml
index_generator:
  path: ''
  per_page: 10
  order_by: -date

theme: fluid

search:
  path: search.xml
  field: all
  content: true
  format: html
```

- [ ] **Step 3: Verify config is valid YAML**

Run: `node -e "const fs=require('fs'); const yaml=require('js-yaml'); yaml.load(fs.readFileSync('_config.yml','utf8')); console.log('ok')"`
Expected: `ok`

### Task 3: Configure Fluid Theme

**Files:**
- Modify: `_config.fluid.yml`

- [ ] **Step 1: Configure menu, search, and page defaults**

```yml
navbar:
  menu:
    - { key: "home", name: "首页", link: "/", icon: "iconfont icon-home-fill" }
    - { key: "category", name: "分类", link: "/categories/", icon: "iconfont icon-category-fill" }
    - { key: "tag", name: "标签", link: "/tags/", icon: "iconfont icon-tags-fill" }
    - { key: "projects", name: "项目", link: "/projects/", icon: "iconfont icon-link-fill" }
    - { key: "about", name: "关于", link: "/about/", icon: "iconfont icon-user-fill" }

search:
  enable: true
  path: /search.xml
  generate_path: /local-search.xml
  field: post
  content: true
```

- [ ] **Step 2: Enable native cover and reading-time support**

```yml
post:
  default_index_img: /assets/images/default-cover.svg
  banner_img: /assets/images/default-banner.svg
  meta:
    wordcount:
      enable: true
      format: '{} 字'
    min2read:
      enable: true
      awl: 2
      wpm: 60
      format: '{} 分钟'
```

- [ ] **Step 3: Validate the override file**

Run: `node -e "const fs=require('fs'); const yaml=require('js-yaml'); yaml.load(fs.readFileSync('_config.fluid.yml','utf8')); console.log('ok')"`
Expected: `ok`

### Task 4: Build the Required Pages and Sample Content

**Files:**
- Create: `source/about/index.md`
- Create: `source/projects/index.md`
- Create: `source/categories/index.md`
- Create: `source/tags/index.md`
- Create: `source/_posts/hello-blog.md`

- [ ] **Step 1: Create the about page**

```md
---
title: 关于
layout: about
---

你好，我是 Lenovo，一名正在把个人知识库、项目实践和技术写作逐步沉淀到公开博客里的开发者。
```

- [ ] **Step 2: Create tags and categories pages with the correct Fluid layouts**

```md
---
title: 分类
layout: categories
---
```

```md
---
title: 标签
layout: tags
---
```

- [ ] **Step 3: Create the independent projects page and one sample post**

```md
---
title: 项目
layout: page
banner_img: /assets/images/default-banner.svg
---
```

```md
---
title: Hello Blog
description: 这是博客初始化后的第一篇文章，用来验证首页文章流、分类标签、搜索和封面展示是否正常。
index_img: /assets/images/default-cover.svg
banner_img: /assets/images/default-banner.svg
---
```

### Task 5: Add Asset and Font Wiring

**Files:**
- Create: `source/assets/css/custom.css`
- Create: `source/assets/fonts/.gitkeep`
- Create: `source/assets/images/default-cover.svg`
- Create: `source/assets/images/default-banner.svg`
- Create: `source/assets/images/avatar.svg`

- [ ] **Step 1: Declare the MapleMono font-face using the required path**

```css
@font-face {
  font-family: 'MapleMonoCN';
  src: url('../fonts/MapleMono-NF-CN-Regular.ttf') format('truetype');
  font-display: swap;
}
```

- [ ] **Step 2: Apply MapleMono to code blocks only**

```css
.post-content code,
.post-content pre,
code,
pre {
  font-family: 'MapleMonoCN', 'Consolas', monospace;
}
```

- [ ] **Step 3: Add placeholder assets and keep the font directory tracked**

Run: `ls source/assets/images source/assets/fonts`
Expected: images contain the SVG assets and fonts contains `.gitkeep` waiting for `MapleMono-NF-CN-Regular.ttf`.

### Task 6: Add Cover Synchronization Script

**Files:**
- Create: `scripts/sync-covers.js`

- [ ] **Step 1: Implement the front-matter synchronization skeleton**

```js
if (!parsed.data.index_img) parsed.data.index_img = defaultCover;
if (!parsed.data.banner_img) parsed.data.banner_img = defaultBanner;
```

- [ ] **Step 2: Run the script directly**

Run: `node scripts/sync-covers.js`
Expected: either reports that all posts are complete or logs the files it updated.

- [ ] **Step 3: Re-read the sample post to verify cover fields remain present**

Run: `node -e "const fs=require('fs'); console.log(fs.readFileSync('source/_posts/hello-blog.md','utf8'))"`
Expected: front-matter still includes `index_img` and `banner_img`.

### Task 7: Configure Homepage Metadata Display

**Files:**
- Create: `layout/index.ejs`

- [ ] **Step 1: Copy Fluid’s index template into a root override**

```ejs
<% page.posts.each(function (post) { %>
  <div class="row mx-auto index-card">
```

- [ ] **Step 2: Add homepage wordcount and reading-time display using Fluid helpers**

```ejs
<div class="post-meta mr-3">
  <i class="iconfont icon-chart"></i>
  <span><%- wordcount(post) %> 字</span>
</div>
<div class="post-meta">
  <i class="iconfont icon-clock-fill"></i>
  <span><%- min2read(post, { awl: parseInt(theme.post.meta.min2read.awl, 10), wpm: parseInt(theme.post.meta.min2read.wpm, 10) }) %> 分钟</span>
</div>
```

- [ ] **Step 3: Render the homepage and inspect generated HTML**

Run: `npm run build`
Expected: build succeeds and `public/index.html` contains homepage metadata for wordcount and reading time.

### Task 8: Configure Deployment Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `.gitignore`

- [ ] **Step 1: Add the GitHub Actions workflow**

```yaml
- name: Build static site
  run: npm run build

- name: Publish to gh-pages
  uses: peaceiris/actions-gh-pages@v4
```

- [ ] **Step 2: Ignore local build artifacts**

```gitignore
node_modules/
public/
.tmp-hexo-init/
```

- [ ] **Step 3: Confirm workflow file exists and is readable**

Run: `node -e "const fs=require('fs'); console.log(fs.existsSync('.github/workflows/deploy.yml'))"`
Expected: `true`

### Task 9: Verify Local Build End-to-End

**Files:**
- Test: `_config.yml`
- Test: `_config.fluid.yml`
- Test: `layout/index.ejs`
- Test: `public/index.html`
- Test: `public/search.xml`
- Test: `public/local-search.xml`

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: Hexo generates the site into `public/` without errors.

- [ ] **Step 2: Verify the search index outputs**

Run: `ls public/search.xml public/local-search.xml`
Expected: both files exist because searchdb generates `search.xml` and Fluid generates `local-search.xml` for its modal.

- [ ] **Step 3: Verify project-path asset references**

Run: `node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); console.log(html.includes('/my-blog/')); console.log(html.includes('search.xml'));"`
Expected: both checks print `true`.

### Task 10: Repository Readiness and Push Prep

**Files:**
- Review: `_config.yml`
- Review: `.github/workflows/deploy.yml`
- Review: `.gitignore`

- [ ] **Step 1: Remove temporary inspection workspace if still present**

Run: `rm -rf .tmp-hexo-init`
Expected: temporary starter directory no longer exists.

- [ ] **Step 2: List repository root to confirm push-ready structure**

Run: `ls -la`
Expected: root contains configs, source, scripts, docs, package files, and workflow files only.

- [ ] **Step 3: Ask the user for their GitHub username before replacing `<username>` placeholders and pushing**

```text
请把你的 GitHub 用户名告诉我，我会把 _config.yml 和关于页里的占位符替换掉，然后再帮你创建并推送到 my-blog 仓库。
```

## Self-Review

- Spec coverage: theme selection requirement is satisfied by Fluid plus a root override only for homepage metadata; no deep modification of theme internals. Search uses `hexo-generator-searchdb`, project-site `url/root`, independent about/projects/tags/categories pages, cover sync, deployment workflow, and GitHub push readiness are all covered.
- Placeholder scan: the only intentional placeholder is `<username>`, which is deferred explicitly to Task 10 because the actual GitHub username is still unknown.
- Type consistency: all file names, config keys, menu paths, and helper names (`wordcount`, `min2read`, `default_index_img`, `generate_path`) are consistent with the chosen Fluid theme and Hexo config.
