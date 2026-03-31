# Blog UI Phase 2 Design

## Goal
在保持 Hexo + Fluid 主题主体结构不被深度侵入的前提下，对当前博客进行第二阶段界面迭代，使首页更接近 `aivi.fyi` 这类“个人主页 + 博客入口”的体验，同时保留后续换主题的可迁移性。

本阶段目标包括：
- 首页改为左侧固定个人卡片 + 右侧主内容区
- 在导航栏中的关于页与首页个人信息区中统一展示头像、ID、邮箱和社交入口
- 支持每篇文章使用自身独立封面，而不是统一默认图
- 调整首页欢迎区文案与主图
- 为分类页和标签页提供各自独立背景图

## Scope
本次只改 Repo B（当前博客仓库）的前台展示层，不改 Repo A 同步脚本、不改 GitHub Actions、不扩展同步链路职责。

涉及范围：
- `_config.fluid.yml`
- 可能需要新增的首页模板覆盖文件（仅首页）
- `source/about/index.md`
- `source/categories/index.md`
- `source/tags/index.md`
- `source/assets/css/custom.css`
- `source/assets/images/` 下的静态资源组织
- 如有必要，少量构建脚本调整，但不改变 Repo A → Repo B 同步协议

不在本次范围内：
- Repo A 自动同步封面图策略增强
- 项目页信息结构重做
- 文章正文渲染逻辑重构
- 主题整体替换或深度 fork

## Design Principles
1. **最小侵入**：尽量通过配置、根级模板覆盖和自定义 CSS 完成，不直接改第三方主题源码。
2. **主页优先**：个性化主要集中在首页；文章页保持阅读优先。
3. **资料集中管理**：头像、ID、邮箱、首页主图、分类图、标签图等尽量由配置和统一资源目录驱动。
4. **可迁移**：即使将来替换主题，也只需迁移少量首页结构和样式层。
5. **移动端可退化**：桌面端双栏，窄屏下自动退化为单栏，保证可读性。

## Approach Options

### Option A — Recommended: Homepage-focused structural override
保留 Fluid 主题主体，仅对首页做结构化覆盖：左侧个人卡片，右侧欢迎区 + 文章列表；其他页面延续现有 layout，并补足页面级 banner 和资料展示。

**Pros**
- 与目标效果最接近
- 改动集中，风险可控
- 后续换主题时迁移成本较低

**Cons**
- 首页会有定制模板维护成本
- 无法 100% 复刻参考站点

### Option B — Broader theme override
对首页、分类、标签、列表页进行更多模板覆盖，追求更完整统一的视觉语言。

**Pros**
- 视觉统一性更强
- 可做更深层个性化

**Cons**
- 改动面更大
- 未来换主题成本明显上升
- 超出当前阶段“低侵入迭代”的目标

### Option C — Config/CSS-only tweaks
只改 `_config.fluid.yml` 和 `custom.css`，尽量不改模板结构。

**Pros**
- 风险最低
- 实现快

**Cons**
- 很难稳定实现左侧固定个人卡片 + 右侧主内容区
- 与目标参考风格差距明显

结论：采用 **Option A**。

## Information Architecture

### Homepage
首页改为双栏结构：

#### Left Column: Profile Card
仅在首页出现，桌面端固定或粘性展示，包含：
- 头像
- 名字
- ID / 显示名
- 一句话简介
- 邮箱联系方式
- GitHub / 社交入口
- 技术方向标签
- 当前在做什么

该卡片承担“个人主页入口”作用，而不是长篇介绍容器。

#### Right Column: Main Content
- 顶部欢迎区（welcome / intro hero）
  - 首页介绍文案
  - 一张首页主图
- 下方文章列表
  - 延续 Fluid 文章卡片的核心信息：日期、分类、标签、字数/阅读时长
  - 每篇文章优先显示自己的独立封面

### About Page
继续使用 `layout: about`，但定位从“首页信息替代页”变为“详细介绍页”：
- 头像、名字、简介、社交入口由配置驱动
- 正文保留在 `source/about/index.md` 中，用于更完整的个人说明

### Category / Tag Pages
不做双栏化，只增强页面头图与视觉一致性：
- 分类页使用独立背景图
- 标签页使用独立背景图
- 保持列表主体清晰，避免首页那种强个人区干扰内容浏览

### Post Pages
保持阅读优先，不引入首页左侧个人卡片。文章页只增强已有封面展示规则，不加入额外干扰块。

## Configuration and Content Model

### Central Configuration
主要通过 `_config.fluid.yml` 承载以下资料：
- 站点标题
- 首页欢迎语文案
- 首页主图路径
- 头像路径
- 姓名
- ID / 副标题
- 简介
- 邮箱
- 社交链接
- 分类页背景图路径
- 标签页背景图路径
- 默认文章封面 / 默认文章 banner

如果 Fluid 原生字段不够表达，允许新增少量自定义配置段（如 `homepage_profile` / `homepage_intro`），但必须集中在 `_config.fluid.yml`，避免把资料散落到模板里硬编码。

### Page Content Sources
- `source/about/index.md`：详细个人介绍正文
- `source/projects/index.md`：维持现状，本次不重构内容模型
- `source/categories/index.md`：保留页面 front-matter，并允许单独指定 banner 图
- `source/tags/index.md`：保留页面 front-matter，并允许单独指定 banner 图

### Static Assets
所有与界面改版相关的图片统一收敛到：
- `source/assets/images/`

建议按语义分组，例如：
- `avatar.*`
- `home-hero.*`
- `categories-banner.*`
- `tags-banner.*`
- `default-cover.*`
- `default-banner.*`
- `posts/...`（若后续手动维护文章独立图）

本次不要求立即重构所有历史图片目录，但新增资源遵守该组织方式。

## Per-post Cover Rules

### Desired Behavior
每篇文章支持自身独立封面，不再依赖统一封面图。

规则：
1. 若文章 front-matter 存在 `index_img`，首页和列表优先使用它。
2. 若文章 front-matter 存在 `banner_img`，文章页顶部优先使用它。
3. 若缺失上述字段，再回退到默认封面图与默认 banner 图。

### Boundary with Existing Sync Flow
本阶段只要求 Repo B 的展示层正确消费 `index_img` / `banner_img`。

不在本阶段做的事：
- 不修改 Repo A 同步脚本去自动推断首图为封面
- 不新增 Repo A 自动搬运文章封面图规则
- 不改变现有 `sync-covers.js` 的职责边界，除非仅为“保留已有显式封面字段优先级”做最小必要调整

也就是说，这次先让展示层支持“文章显式封面优先”。同步链路增强若后续需要，再单独开 spec。

## Implementation Shape

### Likely Files to Touch
- `_config.fluid.yml`
  - 更新 about 区资料
  - 增加首页欢迎区与个人卡片所需配置
  - 调整默认图路径
- `source/about/index.md`
  - 更新正文与联系方式说明
- `source/categories/index.md`
  - 增加页面 banner 配置
- `source/tags/index.md`
  - 增加页面 banner 配置
- `source/assets/css/custom.css`
  - 编写首页双栏、个人卡片、欢迎区、响应式样式
- `layout/index.*` 或等价根级首页覆盖文件
  - 仅在需要时创建，用来渲染首页双栏结构
- `source/assets/images/*`
  - 新头像、首页主图、分类/标签背景图等

### Homepage Rendering Strategy
优先方案：
- 使用根级首页模板覆盖实现双栏结构
- 尽量复用 Fluid 的文章卡片输出，而不是完全手写一套文章列表逻辑
- 自定义部分只负责“外层布局 + 左侧卡片 + 欢迎区”

这样可以减少与主题内部实现的偏离。

### Responsive Behavior
- 桌面端：左侧个人卡片，右侧内容区
- 平板端：允许缩窄双栏间距，必要时左侧卡片变短
- 手机端：自动退化为单栏，个人卡片移到文章列表上方

不追求在移动端保持桌面式固定侧栏，以可读性优先。

## Error Handling and Safety Constraints
- 不在模板中硬编码头像、邮箱、ID 等个人资料，避免后续维护困难。
- 不依赖 JS 注入实现主要首页结构，主结构应由模板直接输出，CSS 负责排版。
- 若某些配置项缺失，应回退到已有默认配置，不让首页直接崩坏。
- 保持文章页、分类页、标签页在配置不完整时仍可正常构建。

## Testing Strategy
实施后使用以下验证方式：

1. 运行 `npm run build`
   - 确认 Hexo 构建成功，无模板语法错误
2. 检查首页
   - 左侧个人卡片存在
   - 右侧欢迎区 + 文章列表结构正确
   - 文章卡片显示独立封面优先级正确
3. 检查关于页
   - 头像、名字、简介、联系方式、社交入口展示正确
4. 检查分类页 / 标签页
   - 各自背景图生效
5. 检查文章页
   - `banner_img` 存在时优先使用独立图
6. 检查响应式
   - 窄屏下首页退化为单栏，无明显遮挡、溢出或重叠

## Success Criteria
若满足以下条件，则本阶段完成：
- 首页已经从普通博客列表升级为“左侧个人卡片 + 右侧博客主内容”的结构
- 关于页的头像、ID、邮箱和社交入口可配置且清晰展示
- 文章可以通过 front-matter 使用各自独立封面
- 首页主图、分类页背景图、标签页背景图均可独立配置
- 改动主要停留在 Repo B 的配置、模板覆盖和样式层，未扩大到 Repo A 同步链路
