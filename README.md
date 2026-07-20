# my-blog

Ariasu 的个人技术博客，基于 **Hexo 8 + Fluid 主题 + GitHub Pages** 构建。

深色科技风视觉、Obsidian 私有知识库自动同步、数据驱动的首页与项目页。

🔗 在线地址：https://Ariasu123.github.io/my-blog/

---

## 技术栈

- **框架**：Hexo 8 + Fluid 主题
- **部署**：GitHub Pages + GitHub Actions
- **内容源**：Obsidian（Repo A）通过 `repo-a-sync/` 同步到本仓库 `source/_posts/`
- **视觉**：自定义 CSS 设计令牌、蓝紫渐变、悬浮胶囊导航、自动生成文章封面 SVG
- **字体**：正文本地系统中文字体栈、代码 MapleMono

---

## 同步工作流

```text
Obsidian(Repo A) 写稿 + published: true
  → push 到 Repo A
  → GitHub Actions 同步到本仓库 source/_posts/
  → GitHub Actions 构建并部署到 GitHub Pages
```
