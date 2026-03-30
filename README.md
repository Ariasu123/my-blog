# my-blog

一个基于 **Hexo + Fluid + GitHub Pages** 的个人博客项目。

这个仓库不仅负责博客展示和部署，也提供了一套 **Obsidian 私有知识库（Repo A）→ 博客仓库（Repo B）** 的同步模板，用来把本地知识库里的文章自动发布到博客。

---

## 工作流

```text
Obsidian 本地知识库（Repo A）
  -> 给文章加 published: true
  -> 运行同步脚本
  -> 写入本仓库 source/_posts/
  -> Hexo 构建
  -> GitHub Pages 发布
```

### 双仓职责

- **Repo A**：私有 Obsidian 知识库，负责写作与发布控制
- **Repo B**：当前仓库，负责接收文章、构建站点、部署上线

---

## 一篇文章如何发布

文章至少要有以下 front-matter：

```md
---
title: 我的第一篇文章
date: 2026-03-30 21:30:00
published: true
---

这里是正文。
```


### 当前同步规则

- 必须有 `title`
- 必须有 `date`
- 必须有 `published: true`
- `date` / `updated` 会被格式化为 `YYYY-MM-DD HH:mm:ss`
- 如果没有 `slug`，会使用**相对路径扁平化**生成文件名
  - 例如：`Notes/React/Hooks.md` → `Notes-React-Hooks.md`

---

## Repo A 模板

本仓库提供了 Repo A 模板目录：

- `repo-a-sync/`

使用方式：

1. 把 `repo-a-sync/` 里的内容复制到你的 Obsidian 仓库根目录
2. 不要保留外层 `repo-a-sync` 目录

目标结构应为：

```text
Agent-code/
  package.json
  sync.config.json
  scripts/
    sync-to-repo-b.js
  .github/
    workflows/
      sync-to-repo-b.yml
```

---

## Repo A 配置

`sync.config.json` 示例：

```json
{
  "contentRoots": ["."],
  "exclude": [
    ".obsidian/**",
    "Templates/**",
    "node_modules/**",
    ".git/**"
  ],
  "repoB": {
    "postsDir": "source/_posts",
    "assetsDir": "source/assets/obsidian",
    "baseUrl": "/my-blog/",
    "branch": "main"
  }
}
```

说明：

- `contentRoots`：扫描哪些目录
- `exclude`：排除哪些目录
- `postsDir`：文章写入 Repo B 的目录
- `assetsDir`：图片资源写入 Repo B 的目录
- `baseUrl`：博客子路径，项目站点一般是 `/my-blog/`
- `branch`：同步到 Repo B 的分支，当前为 `main`

---

## 常用命令

### Repo A：本地联调

安装依赖：

```bash
npm install
```

预演同步：

```bash
node scripts/sync-to-repo-b.js --repo-b-path "D:/Program Files/blog" --dry-run
```

真实同步：

```bash
node scripts/sync-to-repo-b.js --repo-b-path "D:/Program Files/blog"
```

### Repo B：博客构建

安装依赖：

```bash
npm install
```

本地预览：

```bash
npm run server
```

生产构建：

```bash
npm run build
```

---

## 自动化

### Repo B 自动部署

当前仓库包含：

- `.github/workflows/deploy.yml`

作用：

- 监听 `main` 分支更新
- 自动执行 `npm run build`
- 自动发布到 `gh-pages`

### Repo A 自动同步

Repo A 中应包含：

- `.github/workflows/sync-to-repo-b.yml`

作用：

- 监听 Repo A 的 `main` 分支更新
- 执行同步脚本
- 更新 Repo B 的 `main`
- 推送前执行 `git pull --rebase origin main`

---

## Repo A Secrets

如果要启用 Repo A 的 GitHub Actions 自动同步，需要在 **Repo A 仓库** 中配置：

- `REPO_B_OWNER`
- `REPO_B_NAME`
- `REPO_B_BRANCH`
- `REPO_B_SYNC_TOKEN`

其中 `REPO_B_SYNC_TOKEN` 需要对 Repo B 具备 `contents: write` 权限。

---

## 图片与链接处理

支持：

- Obsidian 图片嵌入：`![[image.png]]`
- 标准 Markdown 图片：`![cover](./assets/cover.png)`

同步时会：

- 复制图片到 `source/assets/obsidian/<target-name>/`
- 把正文中的图片路径改写为带 `baseUrl` 的站点路径

Obsidian 内部链接如：

```md
[[Note]]
[[Note|显示名]]
```

当前会降级为纯文本。

---

## 取消发布与删除

同步脚本支持以下场景：

- `published: true` 改成 `false`
- 源文件被删除

对应文章和资源会从 Repo B 中一起删除。



