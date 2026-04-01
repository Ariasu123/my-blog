# Blog Iteration Design

## Goal
在不影响首页现有双栏结构和文章/页面正常访问体验的前提下，完成本轮 blog 小步迭代：

1. 删除文章版权许可卡片中额外显示的文章裸链接
2. 让关于页正文内容整体居中，但不影响首页个人信息区布局
3. 从搜索索引源头排除 `source/assets/**` 生成的静态资源，移除搜索结果里的 `Untitled` 脏结果

## Scope
本次只处理与上述 3 个问题直接相关的展示层与搜索索引生成逻辑。

涉及范围：
- `_config.yml`
- `source/assets/css/custom.css`
- 项目侧主题覆盖文件（如文章版权 partial 或等价覆盖入口）
- 如纯配置无法满足搜索约束，则补充一个项目侧搜索索引生成覆盖

不在本次范围内：
- 首页结构重做
- 关于页顶部头像/昵称/简介/社交图标布局调整
- 搜索弹窗 UI 重写
- 直接修改 `node_modules` 内第三方主题或插件源码

## Current Context
当前项目基于 Hexo + Fluid：
- 文章版权卡片来自 Fluid 主题的 `layout/_partials/post/copyright.ejs`
- 关于页正文内容来自 `source/about/index.md`，顶部头像与简介来自主题 about layout
- 本地搜索依赖 `hexo-generator-searchdb`，当前 `_config.yml` 使用 `search.field: all`
- 构建产物 `public/search.xml` 已确认包含 `/my-blog/assets/css/custom.css` 条目，因此搜索会出现标题为 `Untitled` 的 CSS 内容结果

## Approved Constraints
- 版权卡片里只删除那一行裸露 URL；标题、作者、发布日期、`CC BY 4.0` 许可信息保留
- 关于页只居中 `source/about/index.md` 渲染出的正文内容；顶部头像、昵称、简介和图标区保持不变
- 搜索结果中正常文章、页面、项目页、关于页继续保留；只去掉像 `assets/css/custom.css` 这样的静态资源结果
- 搜索问题必须从源头治理，不接受只在前端结果列表里做过滤

## Approach Options

### Option A - Recommended: Prefer config tightening, then add generation filter if needed
优先收紧搜索索引收录范围；若仅靠配置无法同时满足“保留正常页面”和“排除静态资源”，则在项目侧覆盖搜索生成逻辑，只过滤静态资源路径。

Pros:
- 最符合“从源头解决”的要求
- 改动集中在项目侧，可维护性更好
- 保留现有搜索弹窗与交互逻辑

Cons:
- 需要确认当前页面与静态资源在 Hexo locals 中的收录方式
- 若要做生成覆盖，需新增一小段项目侧逻辑

### Option B - Frontend-only filtering
保留索引生成逻辑不变，只在搜索结果渲染时过滤 `Untitled` 或 `/assets/` 项。

Pros:
- 改动最小

Cons:
- 不符合源头治理要求
- 脏数据仍然存在于索引里

### Option C - Direct dependency patching
直接修改主题或搜索插件的 `node_modules` 源码。

Pros:
- 可以很快验证想法

Cons:
- 后续安装依赖或升级主题/插件后容易丢失
- 不符合项目的低侵入维护原则

结论：采用 **Option A**。

## Design

### 1. Copyright Card
通过项目侧覆盖文章版权卡片 partial，移除标题区第二行 `decode_url(full_url_for(page.path))` 输出，只保留文章标题。其余元信息区保持主题默认行为不变，包括：
- 作者
- 发布时间
- 更新日期（如存在）
- `CC BY 4.0` 等许可信息与图标

优先使用 Fluid 已有注入/覆盖机制在项目侧落地，而不是修改 `node_modules/hexo-theme-fluid/layout/_partials/post/copyright.ejs`。

### 2. About Page Centering
关于页继续使用主题默认 `layout: about`：
- 顶部 `.about-info` 保持现状
- 仅对 `.about-content .markdown-body` 及其直接文本元素做样式约束，使正文整体居中显示

正文居中的目标包括：
- 首段自我介绍
- “这里主要会记录”说明
- 列表项
- 联系方式与 GitHub 链接

样式范围必须限定在 about 页正文区域，不能影响首页、文章页或其他普通页面。

### 3. Search Index Filtering
搜索索引目标定义为：
- 保留真正的内容对象（文章与正常页面）
- 排除 `source/assets/**` 这类静态资源生成的索引项

实现顺序：
1. 先评估只收紧 `_config.yml` 中 `search.field` 是否足够
2. 如果会误伤“关于”“项目”等正常页面，则在项目侧覆盖搜索索引生成逻辑
3. 生成逻辑复用现有 `search.xml` 输出格式，仅在写入数据库前过滤路径命中静态资源目录的项，如 `/assets/`

不改动 `node_modules/hexo-generator-searchdb` 源码，也不改前端 `local-search.js` 的搜索结果展示逻辑。

## File-Level Impact
预计涉及以下文件：
- `_config.yml` - 调整搜索索引收录策略或切换到项目侧生成入口
- `source/assets/css/custom.css` - 新增关于页正文居中样式
- `layout/...` 或主题允许的项目侧覆盖入口 - 覆盖版权卡片 partial
- 如有必要，新增一个项目侧搜索索引生成脚本/模板文件，用于过滤静态资源路径

## Data Flow
搜索相关数据流为：
1. Hexo 收集 `locals.posts` 和 `locals.pages`
2. 搜索生成器根据配置生成 `search.xml`
3. Fluid 前端 `local-search.js` 读取 `search.xml`
4. 搜索弹窗展示匹配结果

本次改动只介入第 2 步，在生成阶段减少脏数据进入索引；第 3、4 步保持不变。

## Error Handling
- 若项目侧版权 partial 覆盖未生效，页面将退回主题默认版权卡片，但不会影响正文与首页
- 关于页样式必须使用窄范围选择器，防止误伤首页自定义布局
- 搜索过滤策略若仅靠配置无法满足要求，应明确回退到“项目侧生成过滤”，避免为了图省事改前端展示逻辑

## Validation Plan
完成实现后按以下方式验证：

1. 构建站点，检查 `public/search.xml`
   - 不再包含 `/assets/css/custom.css`
   - 不再出现与 CSS 内容对应的 `Untitled` 条目
2. 回归搜索词：
   - `d`
   - `cuda`
   - `项目`
   - `关于`
   确认文章、项目页、关于页仍可被搜索到
3. 打开任意文章页
   - 版权卡片不再展示裸露文章 URL
   - `CC BY 4.0` 许可信息仍正常显示
4. 打开关于页
   - 顶部头像/昵称/简介/图标布局不变
   - 正文段落、列表和联系方式整体居中
5. 打开首页
   - 双栏结构与现有布局不变

## Out of Scope Notes
如果后续希望进一步精细化控制“哪些页面可进搜索、哪些页面不可进搜索”，应单独开新一轮 spec，不在这次小步迭代里顺手扩展。