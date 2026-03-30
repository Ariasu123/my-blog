# Repo A（Obsidian Vault）同步与联调设计稿

日期：2026-03-30
范围：本轮聚焦 Repo A（私有 Obsidian 内容源仓库）的同步程序与和 Repo B（当前 Hexo 博客仓库）的联调设计，不进入实现。

## 1. 背景与目标

当前 Repo B 已完成第一版 Hexo 博客的搭建、构建和 GitHub Pages 发布。下一阶段要补齐 Repo A，使整套系统形成稳定的“双仓发布链路”：

- **Repo A**：私有 Obsidian Vault，负责内容编辑与发布状态控制。
- **Repo B**：公开 Hexo 博客仓库，负责接收可发布内容、构建站点并部署。

本轮设计目标：

1. 让 Repo A 能稳定扫描 Obsidian Markdown 并识别可发布内容。
2. 仅将 `published: true` 的文章同步到 Repo B。
3. 与当前 Repo B 的目录结构和脚本保持兼容，避免无谓返工。
4. 支持新增、更新、取消发布、删除四类同步场景。
5. 为本地联调和 GitHub Actions 自动发布同时提供统一执行入口。
6. 尽量保留 Obsidian 写作体验，但不把第一版扩展成复杂内容平台。

## 2. 非目标

第一版 Repo A 明确不做以下内容：

- 不做完整 Obsidian Vault 双向同步
- 不做评论、草稿协作、审核流或 CMS 功能
- 不做数据库、服务端 API 或常驻服务
- 不做全文图片去重、图片压缩、CDN 上传
- 不做 PDF、音频、视频等非图片附件同步
- 不做 Obsidian 全量语法兼容，只覆盖发布链路需要的最小集合
- 不改动 Repo B 的部署职责；Repo B 继续只负责构建与发布

## 3. 总体方案选择

本轮确定采用：**Node.js 同步脚本 + GitHub Actions**。

选择理由：

- 与 Repo B 现有 `package.json`、Node.js 脚本体系一致，技术栈连续。
- 本地调试和 CI 执行可共用同一套逻辑，降低联调成本。
- 文件复制、front-matter 解析、Markdown 改写、删除同步等逻辑更适合写在脚本里，而不是堆进工作流 YAML。
- 后续若增加图片处理、字段映射或校验规则，扩展成本可控。

因此 Repo A 将包含：

- 一个同步配置文件
- 一个 Node.js 同步脚本
- 一个 GitHub Actions 工作流
- 一组本地/CI 共用的 npm scripts

## 4. Repo A 职责边界

Repo A 只负责以下事情：

1. 扫描 Obsidian Vault 中的 Markdown 内容
2. 解析 front-matter 并判断是否允许发布
3. 标准化文章内容与图片引用
4. 将目标结果写入 Repo B 的约定目录
5. 推送到 Repo B 的 `main` 分支

Repo A 不负责：

- 决定博客如何渲染
- 处理文章封面默认值
- 构建 Hexo 静态产物
- 发布到 GitHub Pages

这些职责继续保留在 Repo B。

## 5. Repo A 目录与文件设计

第一版 Repo A 建议包含以下新增文件：

- `package.json`：同步脚本依赖与命令入口
- `scripts/sync-to-repo-b.js`：主同步脚本
- `sync.config.json`：同步配置文件
- `.github/workflows/sync-to-repo-b.yml`：自动同步工作流

### 5.1 `sync.config.json` 设计

由于用户的 Obsidian Vault 目录结构可能持续演进，第一版不把“内容根目录”硬编码进脚本，而是通过配置文件声明。

建议结构：

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
    "branch": "main"
  }
}
```

规则：

- `contentRoots`：定义要参与扫描的 Markdown 根目录，默认从仓库根开始。
- `exclude`：仅用于排除“候选文章扫描”；附件文件仍可被引用解析。
- `repoB.postsDir`：固定为 `source/_posts`，与现有 Repo B 保持兼容。
- `repoB.assetsDir`：用于存放从 Repo A 复制过去的图片资源。

## 6. 与当前 Repo B 的兼容设计

当前 Repo B 的 `scripts/sync-covers.js` 只扫描 `source/_posts` 根目录下的 Markdown 文件，不递归子目录。因此第一版 Repo A 不把文章同步到 `source/_posts/obsidian/` 之类的子目录，而是直接平铺写入 `source/_posts/`。

为避免与 Repo B 手工文章混淆，所有由 Repo A 生成的文章都追加两项 front-matter 元信息：

```yaml
_sync_managed: repo-a
_sync_source_path: Notes/example.md
```

用途：

- 识别哪些文章由 Repo A 托管
- 在取消发布或删除源文件时，只删除 Repo A 托管文章
- 避免误删用户在 Repo B 中手工维护的文章

## 7. 文章发现与发布判定规则

### 7.1 候选文章发现

同步脚本遍历 `sync.config.json` 中声明的 `contentRoots`，递归查找 Markdown 文件。

候选文章条件：

- 文件扩展名为 `.md`
- 不在 `exclude` 规则命中的路径下
- 能被 front-matter 解析

### 7.2 发布判定

只有满足以下条件的 Markdown 才允许进入发布集合：

- front-matter 中存在 `published`
- `published` 的值为布尔 `true`，或字符串 `"true"`
- 同时存在 `title`
- 同时存在 `date`

若缺少 `title` 或 `date`，脚本直接失败并输出文件路径，不做静默跳过；若存在 `date`（以及可选的 `updated`）但无法被解析为合法日期，同样视为失败。

## 8. 文件命名与路径映射

### 8.1 目标文章路径

每篇发布文章最终写入 Repo B：

- `source/_posts/<target-name>.md`

### 8.2 `target-name` 规则

按如下顺序决定目标文件名：

1. 若 front-matter 存在 `slug`，使用 `slug`
2. 否则使用源文件在 Repo A 中的**相对路径扁平化结果**（例如 `Notes/React/Hooks.md` → `Notes-React-Hooks`）

附加规则：

- 扁平化规则：去掉扩展名，将相对路径中的目录分隔符统一替换为 `-`
- 若不同源文件经上述规则仍映射到同一个 `target-name`，视为冲突，脚本直接失败，并提示所有冲突源文件路径
- 如果用户希望稳定 URL，应优先在 Obsidian 文章中显式填写 `slug`，此时仍以 `slug` 优先

## 9. front-matter 标准化规则

第一版采用“保留常用博客字段 + 丢弃明显的 Obsidian 私有字段”的策略。

同步到 Repo B 的 front-matter 保留以下字段：

- `title`
- `date`
- `updated`
- `tags`
- `categories`
- `description`
- `excerpt`
- `slug`
- `index_img`
- `banner_img`
- `published`

同步时额外写入：

- `_sync_managed: repo-a`
- `_sync_source_path: <Repo A 相对路径>`

同步时默认不保留：

- `aliases`
- `cssclass`
- 其他仅面向 Obsidian 界面或插件的私有字段

这样既能保留 Hexo 需要的展示字段，也避免把 Vault 内部噪音带到公开仓库。同时，同步时脚本会尝试将 `date`（及存在时的 `updated`）解析为日期并**强制格式化**为 Hexo 推荐的 `YYYY-MM-DD HH:mm:ss` 形式；若解析失败，则抛出异常并中断同步流程。

## 10. Markdown 内容转换规则

### 10.1 原样保留的内容

以下内容在第一版直接保留：

- 标题与正文普通段落
- 标准 Markdown 列表、引用、代码块
- 标准 Markdown 链接
- 标准 Markdown 图片语法

### 10.2 Obsidian 图片嵌入

第一版支持 Obsidian 常见图片嵌入：

- `![[image.png]]`
- `![[path/to/image.png]]`

处理规则：

1. 找到被引用的本地图片文件
2. 将图片复制到 Repo B：`source/assets/obsidian/<target-name>/<filename>`
3. 从 `sync.config.json` 中读取可选的 `repoB.baseUrl` 字段（默认为 `/`，推荐配置为类似 `/my-blog/` 的项目站点根路径）
4. 将正文中的图片引用改写为：`<baseUrl>assets/obsidian/<target-name>/<filename>`，其中 `<baseUrl>` 为 `repoB.baseUrl`，脚本在实现时需注意去重或补全路径分隔符，避免出现重复斜杠或缺失斜杠

若图片文件不存在，脚本直接失败。

### 10.3 标准 Markdown 相对图片

第一版也支持标准 Markdown 相对图片路径，例如：

```md
![cover](./assets/cover.png)
```

处理方式与 Obsidian 图片嵌入一致：复制到 Repo B 资产目录并改写为站点路径。

### 10.4 Obsidian 内部笔记链接

第一版不做真正的“笔记到文章 URL 映射”，避免把同步器膨胀成内容图谱系统。

处理规则：

- `[[Note Title]]` 转为纯文本 `Note Title`
- `[[Note Title|显示名]]` 转为纯文本 `显示名`

这样能避免公开博客中残留 Obsidian 原始语法，同时保持正文可读。

## 11. 资源同步策略

第一版只同步“被已发布文章引用到的图片资源”。

不处理：

- 未被引用的图片
- PDF、音频、视频、压缩包
- 整个附件目录的无差别镜像

这样可以保持 Repo B 的公开资源边界清晰，避免把 Vault 中无关文件暴露出去。

## 12. 删除与取消发布策略

同步器必须支持以下两种移除场景：

1. **取消发布**：源文章还存在，但 `published` 从 `true` 改成其他值
2. **源文件删除**：文章文件在 Repo A 中被删除

处理方式：

- 扫描 Repo B `source/_posts` 下所有 `_sync_managed: repo-a` 的文章
- 与本次“应发布集合”做比对
- Repo B 中存在、但本次集合中不存在的托管文章，直接删除
- 同时删除该文章对应的 `source/assets/obsidian/<target-name>/` 目录

这个策略保证 Repo B 不会残留“幽灵文章”或孤儿图片。

## 13. 执行模式设计

同步脚本提供两种执行模式：

### 13.1 本地联调模式

用于本地先验证 Repo A → Repo B 的结果。

示例：

```bash
node scripts/sync-to-repo-b.js --repo-b-path ../my-blog --dry-run
node scripts/sync-to-repo-b.js --repo-b-path ../my-blog
```

行为：

- 直接把本地 Repo B 目录作为目标
- 方便联调文章生成、图片复制、删除同步
- `--dry-run` 只输出计划变更，不落盘

### 13.2 CI 推送模式

GitHub Actions 中不传 `--repo-b-path`，而是由脚本在临时目录克隆 Repo B，完成同步后提交并推送。

行为：

- 克隆 Repo B `main`
- 写入同步结果
- 若无变更则不提交
- 若有变更则自动 commit + push

## 14. GitHub Actions 设计

Repo A 增加工作流：`.github/workflows/sync-to-repo-b.yml`

触发方式：

- `push` 到 Repo A 主分支
- `workflow_dispatch` 手动触发

标准流程：

1. `actions/checkout` 拉取 Repo A
2. `actions/setup-node` 安装 Node.js
3. `npm ci`
4. 执行同步脚本
5. 若检测到变更，则在克隆 Repo B 后先提交本地改动，然后执行 `git pull --rebase origin main`，解决可能的远端更新；rebase 成功后再执行 `git push origin main`

### 14.1 认证方式

由于这是跨仓库写入，第一版使用 Repo A Secret 中的 PAT：

- `REPO_B_SYNC_TOKEN`

要求：

- 对 Repo B 具有 `contents: write` 权限
- 仅用于向 Repo B 提交同步结果

脚本或工作流还需要以下环境变量：

- `REPO_B_OWNER`
- `REPO_B_NAME`
- `REPO_B_BRANCH`（默认 `main`）

## 15. 联调主链路

完整联调链路如下：

1. 用户在 Repo A 的 Obsidian Vault 中编辑文章
2. 用户提交到 Repo A 主分支
3. Repo A Action 运行同步脚本
4. 同步脚本筛出 `published: true` 文章
5. 同步脚本把 Markdown 和图片资源写入 Repo B
6. 同步脚本推送到 Repo B `main`
7. Repo B 现有 `deploy.yml` 被触发
8. Repo B 执行 `npm run build`
9. Repo B 发布到 `gh-pages`
10. GitHub Pages 站点更新

## 16. 错误处理原则

以下情况必须直接失败并输出明确日志：

- Markdown front-matter 解析失败
- 已发布文章缺少 `title` 或 `date`
- 目标文件名冲突
- 被引用图片不存在
- 克隆 Repo B 失败
- 推送 Repo B 失败

以下情况不报错但会记录日志：

- 本次同步无文件变更
- Obsidian 内部笔记链接被降级为纯文本

整体原则：**尽早失败、日志明确、不做静默跳过**。

## 17. 测试与验收设计

### 17.1 Repo A 本地验证

至少要验证：

- `--dry-run` 能正确列出新增、更新、删除计划
- 实际同步能把 Markdown 写入本地 Repo B
- 实际同步能把图片复制到目标目录
- 取消发布后能删掉 Repo B 中对应文章与图片

### 17.2 联调验证

至少要验证四个场景：

1. 新建一篇 `published: true` 文章，Repo B 成功新增
2. 修改一篇已发布文章，Repo B 成功覆盖
3. 把 `published: true` 改为 `false`，Repo B 成功删除
4. 删除源文章文件，Repo B 成功删除

### 17.3 端到端验证

端到端验收标准：

1. Repo A 提交后可自动更新 Repo B `main`
2. Repo B 收到变更后可自动构建成功
3. GitHub Pages 页面能看到同步后的文章内容
4. 图片资源在 `my-blog` 子路径下能正常加载
5. Repo B 中不会残留已取消发布的文章或孤儿图片

## 18. 实现阶段拆分建议

后续进入实现计划时，建议按以下顺序落地：

1. 初始化 Repo A `package.json` 与依赖
2. 落盘 `sync.config.json`
3. 实现 Markdown 扫描与 front-matter 判定
4. 实现目标文件名与 front-matter 标准化
5. 实现图片复制与 Markdown 改写
6. 实现 Repo B 目标目录对比与删除同步
7. 实现本地 `--repo-b-path` 联调模式
8. 实现 GitHub Actions 模式与跨仓库认证
9. 做本地联调与端到端验收

## 19. 设计结论

本轮 Repo A 设计最终结论是：

- 用 **Node.js 脚本** 承载同步逻辑
- 用 **GitHub Actions** 负责自动触发
- Repo A 只负责“筛选、转换、同步”，Repo B 继续负责“构建、部署”
- 同步目标保持为 Repo B 的 `source/_posts` 平铺结构，以兼容当前 Repo B
- 图片资源落到 `source/assets/obsidian/<target-name>/`
- 删除同步是第一版的必做项，不接受只增不删
- Obsidian 图片嵌入支持，内部笔记链接先降级为纯文本

这个方案能在保持第一版实现边界清晰的前提下，尽快打通 Repo A → Repo B → GitHub Pages 的完整发布链路。