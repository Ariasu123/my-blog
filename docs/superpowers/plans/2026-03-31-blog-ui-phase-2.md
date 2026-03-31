# Blog UI Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Repo B 中以低侵入方式完成第二阶段博客界面迭代：首页改成左侧个人卡片 + 右侧欢迎区与文章列表，同时补齐 about 资料、分类/标签背景图和文章独立封面优先展示。

**Architecture:** 保持 Hexo + Fluid 主题主体不变，使用根级首页模板覆盖来承载双栏结构，用 `_config.fluid.yml` 集中承载个人资料与首页文案/图片配置，用 `custom.css` 负责布局与响应式。文章封面规则继续依赖现有 `index_img` / `banner_img` 字段，`sync-covers.js` 仅保留“无字段时补默认值”的兜底职责。

**Tech Stack:** Node.js, Hexo 8, hexo-theme-fluid 1.9.9, EJS, CSS, gray-matter

---

## File Map

- `_config.fluid.yml` — 主题导航、about 资料、首页欢迎区、默认封面、分类/标签背景图等集中配置
- `layout/index.ejs` — 根级首页模板覆盖；在 Fluid 默认首页卡片基础上增加左侧个人卡片与欢迎区外层结构
- `source/assets/css/custom.css` — 首页双栏、个人卡片、欢迎区、分类/标签头图和移动端退化样式
- `source/about/index.md` — about 页详细介绍正文和邮箱说明
- `source/categories/index.md` — 分类页 front-matter，补页面 banner 图
- `source/tags/index.md` — 标签页 front-matter，补页面 banner 图
- `source/assets/images/avatar.svg` — 首页/关于页头像资源（若替换则仍用该路径）
- `source/assets/images/default-banner.svg` — 默认横幅图兜底
- `source/assets/images/default-cover.svg` — 默认文章封面兜底
- `source/assets/images/home-hero.svg` — 首页欢迎区主图
- `source/assets/images/categories-banner.svg` — 分类页背景图
- `source/assets/images/tags-banner.svg` — 标签页背景图
- `scripts/sync-covers.js` — 构建前为无封面字段文章补默认值，必须保留显式 `index_img` / `banner_img` 优先级
- `public/index.html` — 构建后首页输出，用于验证双栏结构和欢迎区是否生效
- `public/about/index.html` — 构建后 about 页输出，用于验证资料展示
- `public/categories/index.html` — 构建后分类页输出，用于验证 banner 图
- `public/tags/index.html` — 构建后标签页输出，用于验证 banner 图
- `public/2026/03/29/hello-blog/index.html` — 现有文章输出，用于验证 `banner_img` 优先级

## Task 1: 扩展主题配置为界面改版提供数据源

**Files:**
- Modify: `_config.fluid.yml`
- Verify: `public/index.html`

- [ ] **Step 1: 在 `_config.fluid.yml` 中加入首页个人卡片与欢迎区配置块**

```yml
navbar:
  blog_title: Ariasu Blog

index:
  banner_img: /assets/images/default-banner.svg
  banner_img_height: 72
  banner_mask_alpha: 0.25
  slogan:
    enable: false
  auto_excerpt:
    enable: true
  post_meta:
    date: true
    category: true
    tag: true

post:
  banner_img: /assets/images/default-banner.svg
  default_index_img: /assets/images/default-cover.svg

about:
  enable: true
  banner_img: /assets/images/default-banner.svg
  banner_img_height: 55
  avatar: /assets/images/avatar.svg
  name: Ariasu
  intro: AI Infra / 系统优化 / 知识沉淀
  icons:
    - { class: "iconfont icon-github-fill", link: "https://github.com/Ariasu123", tip: "GitHub" }
    - { class: "iconfont icon-mail-fill", link: "mailto:your-email@example.com", tip: "Email" }

homepage_profile:
  title: Ariasu
  id: "@Ariasu123"
  intro: 记录 AI Infra、项目实践与持续迭代中的技术思考。
  email: your-email@example.com
  skills:
    - CUDA
    - LLM Inference
    - Hexo
    - Systems
  status: 正在完善个人博客与知识发布工作流
  hero_image: /assets/images/home-hero.svg
  hero_title: 把知识库、项目与写作连接起来
  hero_text: 这里会持续发布学习路线、项目复盘与工程实践笔记。
  category_banner: /assets/images/categories-banner.svg
  tag_banner: /assets/images/tags-banner.svg
```

- [ ] **Step 2: 先运行一次构建，确认“仅新增配置”不会破坏现有站点**

Run: `npm run build`
Expected: PASS，输出里仍然出现 `Generated: index.html`、`Generated: about/index.html`、`Generated: categories/index.html`、`Generated: tags/index.html`。

- [ ] **Step 3: 验证新增配置尚未被首页消费，确保后续模板改动确实是必要的**

Run: `node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); if (html.includes('homepage-profile-card')) process.exit(1); console.log('missing homepage profile card as expected');"`
Expected: PASS with `missing homepage profile card as expected`

- [ ] **Step 4: 提交配置骨架**

```bash
git add _config.fluid.yml
git commit -m "feat: add blog ui phase 2 config"
```

## Task 2: 覆盖首页模板，输出左侧个人卡片和右侧欢迎区

**Files:**
- Create: `layout/index.ejs`
- Verify: `public/index.html`

- [ ] **Step 1: 新建首页模板覆盖文件，先写出会失败的最小结构断言目标**

目标 HTML 片段必须最终出现在首页输出中：

```html
<section class="homepage-shell">
  <aside class="homepage-profile-card">
    <div class="homepage-profile-name">Ariasu</div>
  </aside>
  <div class="homepage-main">
    <section class="homepage-hero">
      <h2>把知识库、项目与写作连接起来</h2>
    </section>
  </div>
</section>
```

- [ ] **Step 2: 先运行断言，确认在实现前首页还没有这些结构**

Run: `node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); if (!html.includes('homepage-shell') && !html.includes('homepage-profile-card') && !html.includes('homepage-hero')) { console.log('homepage shell missing as expected'); process.exit(0); } process.exit(1);"`
Expected: PASS with `homepage shell missing as expected`

- [ ] **Step 3: 创建 `layout/index.ejs`，复用 Fluid 默认文章卡片渲染并包上双栏结构**

```ejs
<%
if (theme.index.slogan.enable) {
  page.subtitle = theme.index.slogan.text || config.subtitle || ''
}
page.banner_img = theme.index.banner_img
page.banner_img_height = theme.index.banner_img_height
page.banner_mask_alpha = theme.index.banner_mask_alpha
const profile = theme.homepage_profile || {}
%>

<h1 style="display: none"><%= config.title %></h1>
<section class="homepage-shell">
  <aside class="homepage-profile-card">
    <img class="homepage-profile-avatar" src="<%= url_for(theme.about.avatar) %>" alt="<%= profile.title || theme.about.name %>">
    <div class="homepage-profile-name"><%= profile.title || theme.about.name %></div>
    <div class="homepage-profile-id"><%= profile.id || '' %></div>
    <p class="homepage-profile-intro"><%= profile.intro || theme.about.intro || '' %></p>
    <a class="homepage-profile-email" href="mailto:<%= profile.email || '' %>"><%= profile.email || '' %></a>
    <ul class="homepage-profile-skills">
      <% (profile.skills || []).forEach(function(skill) { %>
        <li><%= skill %></li>
      <% }) %>
    </ul>
    <div class="homepage-profile-status"><%= profile.status || '' %></div>
    <div class="homepage-profile-icons">
      <% (theme.about.icons || []).forEach(function(icon) { %>
        <a href="<%= url_for(icon.link) %>" target="_blank" rel="noopener" aria-label="<%= icon.tip || '' %>">
          <i class="<%= icon.class %>" aria-hidden="true"></i>
        </a>
      <% }) %>
    </div>
  </aside>

  <div class="homepage-main">
    <section class="homepage-hero">
      <div class="homepage-hero-copy">
        <div class="homepage-hero-label">WELCOME</div>
        <h2><%= profile.hero_title || '' %></h2>
        <p><%= profile.hero_text || '' %></p>
      </div>
      <div class="homepage-hero-media">
        <img src="<%= url_for(profile.hero_image || theme.index.banner_img) %>" alt="home hero">
      </div>
    </section>

    <% page.posts.each(function (post) { %>
      <div class="row mx-auto index-card">
        <% var post_url = url_for(post.path), index_img = post.index_img || theme.post.default_index_img %>
        <% if (index_img) { %>
          <div class="col-12 col-md-4 m-auto index-img">
            <a href="<%= post_url %>" target="<%- theme.index.post_url_target %>">
              <img src="<%= url_for(index_img) %>" alt="<%= post.title %>">
            </a>
          </div>
        <% } %>
        <article class="col-12 col-md-<%= index_img ? '8' : '12' %> mx-auto index-info">
          <h2 class="index-header">
            <a href="<%= post_url %>" target="<%- theme.index.post_url_target %>"><%= post.title %></a>
          </h2>
          <% var excerpt = post.description || post.excerpt || (theme.index.auto_excerpt.enable && !post.encrypt && post.content) %>
          <a class="index-excerpt <%= index_img ? '' : 'index-excerpt__noimg' %>" href="<%= post_url %>" target="<%- theme.index.post_url_target %>">
            <div><%- strip_html(excerpt).substring(0, 200).trim().replace(/\n/g, ' ') %></div>
          </a>
          <div class="index-btm post-metas">
            <% if (theme.index.post_meta.date) { %>
              <div class="post-meta mr-3">
                <i class="iconfont icon-date"></i>
                <time datetime="<%= full_date(post.date, 'YYYY-MM-DD HH:mm') %>" pubdate><%- date(post.date, config.date_format) %></time>
              </div>
            <% } %>
            <% if (theme.index.post_meta.category && post.categories.length > 0) { %>
              <div class="post-meta mr-3 d-flex align-items-center">
                <i class="iconfont icon-category"></i>
                <%- partial('_partials/category-chains', { categories: post.categories, limit: 1 }) %>
              </div>
            <% } %>
            <% if (theme.index.post_meta.tag && post.tags.length > 0) { %>
              <div class="post-meta">
                <i class="iconfont icon-tags"></i>
                <% post.tags.each(function(tag){ %>
                  <a href="<%= url_for(tag.path) %>">#<%- tag.name %></a>
                <% }) %>
              </div>
            <% } %>
          </div>
        </article>
      </div>
    <% }) %>

    <%- partial('_partials/paginator') %>
  </div>
</section>
```

- [ ] **Step 4: 重新构建并验证首页新结构已落盘**

Run: `npm run build && node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); for (const marker of ['homepage-shell','homepage-profile-card','homepage-hero','把知识库、项目与写作连接起来']) { if (!html.includes(marker)) { console.error('missing marker:', marker); process.exit(1); } } console.log('homepage structure verified');"`
Expected: PASS with `homepage structure verified`

- [ ] **Step 5: 提交首页结构层**

```bash
git add layout/index.ejs public/index.html
git commit -m "feat: add homepage profile layout"
```

## Task 3: 编写样式与响应式规则，让首页在桌面双栏、移动单栏下可用

**Files:**
- Modify: `source/assets/css/custom.css`
- Verify: `public/index.html`

- [ ] **Step 1: 先定义应当出现的关键类名样式块**

需要新增的核心样式选择器：

```css
.homepage-shell {}
.homepage-profile-card {}
.homepage-hero {}
.homepage-profile-skills {}
@media (max-width: 991.98px) {}
```

- [ ] **Step 2: 在实现前确认 `custom.css` 里还没有这些样式**

Run: `node -e "const fs=require('fs'); const css=fs.readFileSync('source/assets/css/custom.css','utf8'); if (!css.includes('.homepage-shell') && !css.includes('.homepage-profile-card') && !css.includes('.homepage-hero')) { console.log('homepage css missing as expected'); process.exit(0); } process.exit(1);"`
Expected: PASS with `homepage css missing as expected`

- [ ] **Step 3: 追加首页布局、卡片、欢迎区和移动端退化样式**

```css
.homepage-shell {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.homepage-profile-card {
  position: sticky;
  top: 96px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(12px);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.homepage-profile-avatar {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
}

.homepage-profile-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.homepage-profile-id,
.homepage-profile-intro,
.homepage-profile-email,
.homepage-profile-status {
  color: var(--blog-muted);
}

.homepage-profile-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-left: 0;
  list-style: none;
  margin: 1rem 0;
}

.homepage-profile-skills li {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: var(--blog-accent-soft);
  color: var(--blog-accent);
  font-size: 0.875rem;
}

.homepage-profile-icons {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.homepage-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
  gap: 1.5rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 28px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(219,234,254,0.9));
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
}

.homepage-hero-label {
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--blog-accent);
}

.homepage-hero h2 {
  margin: 0.5rem 0 0.75rem;
  color: #0f172a;
}

.homepage-hero p {
  margin-bottom: 0;
  color: var(--blog-muted);
}

.homepage-hero-media img {
  width: 100%;
  border-radius: 20px;
}

@media (max-width: 991.98px) {
  .homepage-shell {
    grid-template-columns: 1fr;
  }

  .homepage-profile-card {
    position: static;
  }

  .homepage-hero {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: 重新构建并验证样式类已进入首页输出引用链**

Run: `npm run build && node -e "const fs=require('fs'); const html=fs.readFileSync('public/index.html','utf8'); if (!html.includes('/assets/css/custom.css')) { console.error('custom css not linked'); process.exit(1); } console.log('custom css linked');"`
Expected: PASS with `custom css linked`

- [ ] **Step 5: 提交样式层改动**

```bash
git add source/assets/css/custom.css public/index.html
git commit -m "feat: style homepage phase 2 layout"
```

## Task 4: 更新 about、分类、标签页面内容与头图配置

**Files:**
- Modify: `source/about/index.md`
- Modify: `source/categories/index.md`
- Modify: `source/tags/index.md`
- Verify: `public/about/index.html`
- Verify: `public/categories/index.html`
- Verify: `public/tags/index.html`

- [ ] **Step 1: 将 about 页正文更新为与你的首页资料一致的详细介绍**

```md
---
title: 关于
layout: about
---

你好，我是 Ariasu，正在持续把个人知识库、项目实践和技术写作沉淀到公开博客里。

这里主要会记录：

- AI Infra / CUDA / 推理优化方向的学习与复盘
- 个人项目的设计、实现和迭代过程
- 值得长期保留的方法论、工作流与工程经验

你也可以通过邮箱联系我：<your-email@example.com>

GitHub：<https://github.com/Ariasu123>
```

- [ ] **Step 2: 为分类页和标签页补充独立 banner 图 front-matter**

`source/categories/index.md`

```md
---
title: 分类
layout: categories
banner_img: /assets/images/categories-banner.svg
banner_mask_alpha: 0.2
---
```

`source/tags/index.md`

```md
---
title: 标签
layout: tags
banner_img: /assets/images/tags-banner.svg
banner_mask_alpha: 0.2
---
```

- [ ] **Step 3: 构建前确认分类/标签页还没有新 banner 路径**

Run: `node -e "const fs=require('fs'); const c=fs.readFileSync('source/categories/index.md','utf8'); const t=fs.readFileSync('source/tags/index.md','utf8'); if (!c.includes('categories-banner.svg') && !t.includes('tags-banner.svg')) { console.log('page banners missing as expected'); process.exit(0); } process.exit(1);"`
Expected: PASS with `page banners missing as expected`

- [ ] **Step 4: 运行构建并验证 about / 分类 / 标签页面输出**

Run: `npm run build && node -e "const fs=require('fs'); const about=fs.readFileSync('public/about/index.html','utf8'); const categories=fs.readFileSync('public/categories/index.html','utf8'); const tags=fs.readFileSync('public/tags/index.html','utf8'); if (!about.includes('Ariasu') || !about.includes('your-email@example.com')) { console.error('about content missing'); process.exit(1); } if (!categories.includes('categories-banner.svg')) { console.error('categories banner missing'); process.exit(1); } if (!tags.includes('tags-banner.svg')) { console.error('tags banner missing'); process.exit(1); } console.log('about/category/tag verified');"`
Expected: PASS with `about/category/tag verified`

- [ ] **Step 5: 提交页面内容更新**

```bash
git add source/about/index.md source/categories/index.md source/tags/index.md public/about/index.html public/categories/index.html public/tags/index.html
git commit -m "feat: update about and page banners"
```

## Task 5: 增加首页主图、分类图、标签图资源并接入配置

**Files:**
- Create: `source/assets/images/home-hero.svg`
- Create: `source/assets/images/categories-banner.svg`
- Create: `source/assets/images/tags-banner.svg`
- Verify: `public/index.html`
- Verify: `public/categories/index.html`
- Verify: `public/tags/index.html`

- [ ] **Step 1: 先写三张占位 SVG，确保路径在构建产物中可见**

`source/assets/images/home-hero.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640" role="img" aria-label="Homepage hero">
  <defs>
    <linearGradient id="hero" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#dbeafe" />
      <stop offset="100%" stop-color="#bfdbfe" />
    </linearGradient>
  </defs>
  <rect width="960" height="640" rx="36" fill="url(#hero)" />
  <circle cx="220" cy="180" r="88" fill="#60a5fa" opacity="0.6" />
  <circle cx="720" cy="420" r="120" fill="#2563eb" opacity="0.16" />
  <text x="96" y="330" font-size="58" font-family="Arial, sans-serif" fill="#0f172a">Ariasu Blog</text>
  <text x="96" y="400" font-size="28" font-family="Arial, sans-serif" fill="#334155">Knowledge / Projects / Writing</text>
</svg>
```

`source/assets/images/categories-banner.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" role="img" aria-label="Categories banner">
  <rect width="1600" height="480" fill="#dbeafe" />
  <path d="M0 340C240 260 420 440 720 360C1020 280 1180 120 1600 220V480H0Z" fill="#93c5fd" />
  <text x="96" y="250" font-size="72" font-family="Arial, sans-serif" fill="#0f172a">Categories</text>
</svg>
```

`source/assets/images/tags-banner.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" role="img" aria-label="Tags banner">
  <rect width="1600" height="480" fill="#eff6ff" />
  <circle cx="260" cy="200" r="120" fill="#60a5fa" opacity="0.32" />
  <circle cx="1220" cy="180" r="160" fill="#2563eb" opacity="0.18" />
  <text x="96" y="250" font-size="72" font-family="Arial, sans-serif" fill="#0f172a">Tags</text>
</svg>
```

- [ ] **Step 2: 运行构建并验证三张图都被输出到 `public/assets/images/`**

Run: `npm run build && node -e "const fs=require('fs'); for (const file of ['public/assets/images/home-hero.svg','public/assets/images/categories-banner.svg','public/assets/images/tags-banner.svg']) { if (!fs.existsSync(file)) { console.error('missing asset:', file); process.exit(1); } } console.log('phase 2 images emitted');"`
Expected: PASS with `phase 2 images emitted`

- [ ] **Step 3: 验证首页、分类页、标签页已经引用这些新资源**

Run: `node -e "const fs=require('fs'); const index=fs.readFileSync('public/index.html','utf8'); const categories=fs.readFileSync('public/categories/index.html','utf8'); const tags=fs.readFileSync('public/tags/index.html','utf8'); if (!index.includes('home-hero.svg')) { console.error('home hero missing'); process.exit(1); } if (!categories.includes('categories-banner.svg')) { console.error('categories banner missing'); process.exit(1); } if (!tags.includes('tags-banner.svg')) { console.error('tags banner missing'); process.exit(1); } console.log('phase 2 images referenced');"`
Expected: PASS with `phase 2 images referenced`

- [ ] **Step 4: 提交新增图片资源**

```bash
git add source/assets/images/home-hero.svg source/assets/images/categories-banner.svg source/assets/images/tags-banner.svg public/assets/images/home-hero.svg public/assets/images/categories-banner.svg public/assets/images/tags-banner.svg
git commit -m "feat: add phase 2 homepage and page artwork"
```

## Task 6: 锁定文章独立封面优先级并做整链路验收

**Files:**
- Verify: `scripts/sync-covers.js`
- Verify: `source/_posts/hello-blog.md`
- Verify: `source/_posts/02AI infra-LLM 推理加速与算子优化学习路线.md`
- Verify: `public/2026/03/29/hello-blog/index.html`
- Verify: `public/index.html`

- [ ] **Step 1: 先确认 `sync-covers.js` 的实现仍然是“只有缺字段才补默认图”**

`ensureCoverFields` 必须保持这一逻辑：

```js
if (!parsed.data.index_img) {
  parsed.data.index_img = defaultCover;
  changed = true;
}

if (!parsed.data.banner_img) {
  parsed.data.banner_img = defaultBanner;
  changed = true;
}
```

- [ ] **Step 2: 验证两篇现有文章都已经带有显式封面字段**

Run: `node -e "const fs=require('fs'); const files=['source/_posts/hello-blog.md','source/_posts/02AI infra-LLM 推理加速与算子优化学习路线.md']; for (const file of files) { const text=fs.readFileSync(file,'utf8'); if (!text.includes('index_img:') || !text.includes('banner_img:')) { console.error('missing cover fields in', file); process.exit(1); } } console.log('post cover fields present');"`
Expected: PASS with `post cover fields present`

- [ ] **Step 3: 整站构建并验证首页列表和文章详情页都仍然能正确读到封面字段**

Run: `npm run build && node -e "const fs=require('fs'); const index=fs.readFileSync('public/index.html','utf8'); const post=fs.readFileSync('public/2026/03/29/hello-blog/index.html','utf8'); if (!index.includes('default-cover.svg')) { console.error('index cover reference missing'); process.exit(1); } if (!post.includes('default-banner.svg')) { console.error('post banner reference missing'); process.exit(1); } console.log('cover priority verified');"`
Expected: PASS with `cover priority verified`

- [ ] **Step 4: 进行最终验收构建**

Run: `npm run build`
Expected: PASS，且无 EJS / YAML / asset path 相关错误。

- [ ] **Step 5: 提交最终验收结果**

```bash
git add layout/index.ejs source/assets/css/custom.css source/about/index.md source/categories/index.md source/tags/index.md source/assets/images/home-hero.svg source/assets/images/categories-banner.svg source/assets/images/tags-banner.svg _config.fluid.yml
git commit -m "feat: ship blog ui phase 2"
```

## Self-Review

### Spec coverage
- 首页左侧固定个人卡片 + 右侧欢迎区与文章列表：由 Task 1、Task 2、Task 3 覆盖。
- 关于页头像、ID、邮箱、社交入口统一展示：由 Task 1、Task 4 覆盖。
- 文章独立封面优先：由 Task 1、Task 6 覆盖。
- 首页主图、分类页背景图、标签页背景图：由 Task 1、Task 4、Task 5 覆盖。
- 保持低侵入、不改主题源码：通过根级 `layout/index.ejs` 覆盖和 `custom.css` 实现，未要求修改 `node_modules/hexo-theme-fluid`。

### Placeholder scan
- 没有 `TODO` / `TBD`。
- 所有命令都给出了明确期望输出。
- 所有代码步骤都给出了具体配置、模板或样式片段。

### Type consistency
- 首页配置统一使用 `homepage_profile`。
- 个人资料统一从 `theme.about` 与 `theme.homepage_profile` 读取。
- 文章封面字段统一使用现有 `index_img` / `banner_img`，没有引入新字段名。
