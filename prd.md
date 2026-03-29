项目名称：Obsidian-to-Hexo Automated Blog
运行环境：GitHub Pages (gh-pages 分支)
执行者：AI Coding Agent
核心架构：采用“内容源仓库 (Repo A)”与“博客构建仓库 (Repo B)”物理隔离的双库架构，通过 GitHub Actions 实现状态驱动的自动化发布。

1. 整体架构与数据流 (Architecture & Data Flow)
系统由两个独立的 GitHub 仓库组成，Agent 需理解并配合实现以下数据流：

Repo A (Obsidian Vault)：私有仓库。用户在此编写 Markdown。当带有 published: true (或 published = true) 的文件发生变动时，触发 Action 1，将文件推送到 Repo B 的 main 分支。

Repo B (Hexo Blog)：公开仓库。接收到 Markdown 文件后，触发 Action 2。执行自定义构建脚本与封面同步，最终通过 Hexo 渲染为静态文件，并部署到本仓库的 gh-pages 分支。

2. Repo B (博客构建仓库) 核心技术规范
Agent 的主要代码生成工作集中在 Repo B。请严格遵守以下技术栈和配置：

核心框架：Hexo (最新版)

包管理器：npm

静态部署：产物必须输出并部署到 gh-pages 分支。

特定静态资源：自定义极客字体。

字体路径：source/assets/fonts/MapleMono-NF-CN-Regular.ttf

要求：在主题的 CSS/Stylus 中通过 @font-face 引入该字体，并全局或在代码块 (code blocks) 中应用。

3. NPM 脚本封装规范 (Scripts Engineering)
为了统一本地测试与云端 CI/CD 的环境，Agent 必须在 package.json 中配置以下高度封装的 scripts 命令：

JSON
"scripts": {
  "cover:sync": "node scripts/sync-covers.js", 
  "server": "npm run cover:sync && hexo server",
  "build": "npm run cover:sync && hexo clean && hexo generate"
}
逻辑说明：

cover:sync：执行一个 Node.js 脚本，用于同步或处理 Markdown 的封面图配置。(Agent 需在根目录创建 scripts/sync-covers.js 的基础骨架)。

npm run server：用于本地实时预览，内置封面同步。

npm run build：用于 GitHub Actions 生产环境打包。

4. GitHub Actions 自动化流水线需求 (CI/CD)
4.1 Repo A 的推送脚本需求 (供参考/提供脚本模板)
Agent 需要提供一个针对 Repo A 的 GitHub Action YAML 或 Node/Python 脚本逻辑，该脚本需要具备以下能力：

遍历仓库内的所有 Markdown 文件。

解析文件的 YAML Front-matter。

筛选出 published: true 的文件。

使用 git 命令或 GitHub API，将这些文件 commit 并 push 到 Repo B 的 main 分支特定目录下 (如 source/_posts/)。

4.2 Repo B 的构建与发布流水线 (.github/workflows/deploy.yml)
Agent 必须在 Repo B 中创建此工作流，满足以下条件：

触发器：监听 main 分支的 push 事件。

环境准备：拉取代码 (actions/checkout)，安装 Node.js 环境。

依赖安装：执行 npm install。

统一构建：严格执行 npm run build 命令（该命令已内置 cover:sync 和 hexo 构建全流程）。

产物发布：使用 peaceiris/actions-gh-pages (或同类标准 Action)，将 public/ 目录下的构建产物推送到 gh-pages 分支。

5. 验收标准 (Acceptance Criteria)
脚本健壮性：package.json 中的脚本能在本地正确按序执行，npm run build 结束后 public/ 目录生成完整文件。

资源引入正确：检查生成的 CSS 文件，确保 MapleMono-NF-CN 字体路径正确指向 assets/fonts/...。

CI/CD 跑通：当 Repo B 的 main 分支有新 Markdown 提交时，Actions 能成功执行 npm run build 并将产物推送到 gh-pages 分支。