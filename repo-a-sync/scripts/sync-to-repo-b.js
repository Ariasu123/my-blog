'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const fg = require('fast-glob');
const matter = require('gray-matter');
const minimist = require('minimist');
const { execFileSync } = require('child_process');

function readJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

function loadConfig(rootDir) {
  const configPath = path.join(rootDir, 'sync.config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error('[config] 未找到 sync.config.json，无法继续。');
  }
  const config = readJson(configPath);
  if (!config.repoB) {
    config.repoB = {};
  }
  if (!config.repoB.postsDir) {
    config.repoB.postsDir = 'source/_posts';
  }
  if (!config.repoB.assetsDir) {
    config.repoB.assetsDir = 'source/assets/obsidian';
  }
  if (!config.repoB.branch) {
    config.repoB.branch = 'main';
  }
  return config;
}

function normalizeBaseUrl(baseUrl) {
  let value = baseUrl || '/';
  if (!value.startsWith('/')) {
    value = '/' + value;
  }
  if (!value.endsWith('/')) {
    value += '/';
  }
  return value;
}

function flattenRelativePath(relPath) {
  const unix = relPath.replace(/\\/g, '/');
  const withoutExt = unix.replace(/\.[^/.]+$/, '');
  const segments = withoutExt.split('/').filter(Boolean);
  return segments.join('-');
}

function formatDateTime(value, fieldName, sourceRelPath) {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`[date] 无法解析 ${fieldName} 字段，文件: ${sourceRelPath}`);
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function isPublishedFlag(data) {
  return data && (data.published === true || data.published === 'true');
}

function isImageFileName(name) {
  return /\.(png|jpe?g|gif|svg|webp)$/i.test(name);
}

function resolveImagePath(rootDir, sourceFilePath, ref) {
  const trimmed = ref.trim();
  const candidatePaths = [];

  // 相对于当前 Markdown 文件目录
  candidatePaths.push(path.resolve(path.dirname(sourceFilePath), trimmed));
  // 相对于仓库根目录
  candidatePaths.push(path.resolve(rootDir, trimmed));

  for (const p of candidatePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return p;
    }
  }

  return null;
}

function transformContentAndCollectAssets(rootDir, config, baseUrl, post) {
  const assetsDir = config.repoB.assetsDir || 'source/assets/obsidian';
  const assetsPublicRoot = assetsDir.replace(/^source[\\/]/, '').replace(/\\/g, '/');

  let content = post.body;
  const assets = [];

  const addAsset = (sourcePath, fileName) => {
    const targetRelPath = path
      .join(assetsDir, post.targetName, fileName)
      .replace(/\\/g, '/');
    const publicPath = `${assetsPublicRoot}/${post.targetName}/${fileName}`.replace(/\\/g, '/');
    const url = `${baseUrl}${publicPath.replace(/^\/+/, '')}`;
    assets.push({ sourcePath, targetRelPath, url });
    return url;
  };

  // 处理 Obsidian 图片嵌入: ![[image.png]]
  const embedPattern = /!\[\[([^\]]+)\]\]/g;
  content = content.replace(embedPattern, (match, inner) => {
    const raw = inner.trim();
    const fileName = path.basename(raw);
    if (!isImageFileName(fileName)) {
      // 非图片嵌入，降级为纯文本
      return fileName;
    }
    const imagePath = resolveImagePath(rootDir, post.sourcePath, raw);
    if (!imagePath) {
      throw new Error(`[image] 找不到 Obsidian 图片文件: ${raw} (源文件: ${post.relativePath})`);
    }
    const url = addAsset(imagePath, fileName);
    return `![](${url})`;
  });

  // 处理标准 Markdown 图片: ![alt](path)
  const mdImagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  content = content.replace(mdImagePattern, (match, alt, link) => {
    const rawLink = link.trim();
    if (/^(https?:)?\/\//i.test(rawLink) || rawLink.startsWith('data:')) {
      return match; // 外链或 data URL 直接保留
    }
    const fileName = path.basename(rawLink.split(/\s+/)[0]);
    if (!isImageFileName(fileName)) {
      return match;
    }
    const imagePath = resolveImagePath(rootDir, post.sourcePath, rawLink.split(/\s+/)[0]);
    if (!imagePath) {
      throw new Error(`[image] 找不到 Markdown 图片文件: ${rawLink} (源文件: ${post.relativePath})`);
    }
    const url = addAsset(imagePath, fileName);
    return `![${alt}](${url})`;
  });

  // 处理 Obsidian 内部链接 [[Note]] / [[Note|显示名]] → 纯文本
  const noteLinkPattern = /\[\[([^\]|]+)(\|([^\]]+))?\]\]/g;
  content = content.replace(noteLinkPattern, (match, noteTitle, _sep, display) => {
    return (display || noteTitle).trim();
  });

  return { content, assets };
}

function collectSourcePosts(rootDir, config) {
  const contentRoots = Array.isArray(config.contentRoots) && config.contentRoots.length
    ? config.contentRoots
    : ['.'];
  const exclude = Array.isArray(config.exclude) ? config.exclude : [];

  const patterns = contentRoots.map((r) => {
    const normalized = r.replace(/\\/g, '/');
    return normalized.endsWith('/') ? `${normalized}**/*.md` : `${normalized}/**/*.md`;
  });

  const entries = fg.sync(patterns, {
    cwd: rootDir,
    ignore: exclude,
    dot: false,
    absolute: true,
    followSymbolicLinks: true
  });

  const posts = [];
  const targetNameToSources = new Map();

  for (const absPath of entries) {
    const relPath = path.relative(rootDir, absPath).replace(/\\/g, '/');
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};

    if (!isPublishedFlag(data)) {
      continue;
    }

    if (!data.title) {
      throw new Error(`[front-matter] 已发布文章缺少 title 字段: ${relPath}`);
    }
    if (!data.date) {
      throw new Error(`[front-matter] 已发布文章缺少 date 字段: ${relPath}`);
    }

    const formattedDate = formatDateTime(data.date, 'date', relPath);
    data.date = formattedDate;
    if (data.updated) {
      data.updated = formatDateTime(data.updated, 'updated', relPath);
    }

    const slug = data.slug ? String(data.slug).trim() : '';
    const targetName = slug || flattenRelativePath(relPath);

    if (!targetName) {
      throw new Error(`[target-name] 生成失败，源文件: ${relPath}`);
    }

    if (!targetNameToSources.has(targetName)) {
      targetNameToSources.set(targetName, []);
    }
    targetNameToSources.get(targetName).push(relPath);

    posts.push({
      sourcePath: absPath,
      relativePath: relPath,
      data,
      body: parsed.content || '',
      targetName
    });
  }

  // 检查 target-name 冲突
  for (const [name, list] of targetNameToSources.entries()) {
    if (list.length > 1) {
      throw new Error(
        `[target-name] 多个源文件映射到同一 target-name="${name}":\n` +
          list.map((p) => `  - ${p}`).join('\n')
      );
    }
  }

  return posts;
}

function readExistingManagedPosts(postsDir) {
  const managed = new Map(); // targetName -> { filePath, data }
  if (!fs.existsSync(postsDir)) return managed;
  const entries = fs.readdirSync(postsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md')) continue;
    const filePath = path.join(postsDir, entry.name);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = matter(raw);
    const data = parsed.data || {};
    if (data._sync_managed !== 'repo-a') continue;
    const base = entry.name.replace(/\.[^/.]+$/, '');
    managed.set(base, { filePath, data });
  }
  return managed;
}

function buildOutputPosts(rootDir, config, posts) {
  const baseUrl = normalizeBaseUrl(config.repoB.baseUrl || '/');
  const outputs = [];
  const allAssets = new Map(); // targetRelPath -> sourcePath

  for (const post of posts) {
    const { content, assets } = transformContentAndCollectAssets(rootDir, config, baseUrl, post);

    const allowedKeys = new Set([
      'title',
      'date',
      'updated',
      'tags',
      'categories',
      'description',
      'excerpt',
      'slug',
      'index_img',
      'banner_img',
      'published'
    ]);

    const outData = {};
    for (const key of Object.keys(post.data)) {
      if (allowedKeys.has(key)) {
        outData[key] = post.data[key];
      }
    }

    outData._sync_managed = 'repo-a';
    outData._sync_source_path = post.relativePath;

    outputs.push({
      targetName: post.targetName,
      relativePath: post.relativePath,
      data: outData,
      content,
      assets
    });

    for (const asset of assets) {
      if (allAssets.has(asset.targetRelPath)) {
        const existing = allAssets.get(asset.targetRelPath);
        if (existing !== asset.sourcePath) {
          throw new Error(
            `[assets] 目标资源冲突: ${asset.targetRelPath}\n` +
              `  - ${existing}\n  - ${asset.sourcePath}`
          );
        }
      } else {
        allAssets.set(asset.targetRelPath, asset.sourcePath);
      }
    }
  }

  return { outputs, allAssets, baseUrl };
}

function ensureDir(dirPath, dryRun) {
  if (dryRun) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFileIfChanged(filePath, content, dryRun) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    const current = fs.readFileSync(filePath, 'utf8');
    if (current === content) {
      return false;
    }
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return true;
}

function removePath(p, dryRun) {
  if (!fs.existsSync(p)) return false;
  if (!dryRun) {
    fs.rmSync(p, { recursive: true, force: true });
  }
  return true;
}

function syncIntoRepoB(rootDir, repoBPath, config, options) {
  const dryRun = !!options.dryRun;
  const postsDir = path.resolve(repoBPath, config.repoB.postsDir || 'source/_posts');
  const assetsDir = path.resolve(repoBPath, config.repoB.assetsDir || 'source/assets/obsidian');

  const sourcePosts = collectSourcePosts(rootDir, config);
  const existingManaged = readExistingManagedPosts(postsDir);
  const { outputs, allAssets } = buildOutputPosts(rootDir, config, sourcePosts);

  const desiredNames = new Set(outputs.map((p) => p.targetName));
  const existingNames = new Set(existingManaged.keys());

  const toDeleteNames = [];
  for (const name of existingNames) {
    if (!desiredNames.has(name)) {
      toDeleteNames.push(name);
    }
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;
  let assetsCopied = 0;
  let assetsDeleted = 0;

  // 删除多余的文章和对应资源目录
  for (const name of toDeleteNames) {
    const info = existingManaged.get(name);
    if (info) {
      if (removePath(info.filePath, dryRun)) {
        deleted += 1;
      }
    }
    const assetDir = path.join(assetsDir, name);
    if (removePath(assetDir, dryRun)) {
      assetsDeleted += 1;
    }
  }

  ensureDir(postsDir, dryRun);
  ensureDir(assetsDir, dryRun);

  // 写入/更新文章
  for (const out of outputs) {
    const targetFile = path.join(postsDir, `${out.targetName}.md`);
    const exists = fs.existsSync(targetFile);
    if (exists && !existingManaged.has(out.targetName)) {
      throw new Error(
        `[sync] 目标文件已存在且非 repo-a 托管，避免覆盖: ${path.relative(
          repoBPath,
          targetFile
        )}`
      );
    }
    const fileContent = matter.stringify(out.content.trimStart(), out.data);
    const changed = writeFileIfChanged(targetFile, fileContent, dryRun);
    if (!changed) continue;
    if (exists) updated += 1;
    else created += 1;
  }

  // 复制资源
  for (const [targetRelPath, sourcePath] of allAssets.entries()) {
    const targetAbsPath = path.resolve(repoBPath, targetRelPath);
    const exists = fs.existsSync(targetAbsPath);
    if (!dryRun) {
      fs.mkdirSync(path.dirname(targetAbsPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetAbsPath);
    }
    if (!exists || !dryRun) {
      assetsCopied += 1;
    }
  }

  const hasChanges = created > 0 || updated > 0 || deleted > 0 || assetsCopied > 0 || assetsDeleted > 0;

  return {
    created,
    updated,
    deleted,
    assetsCopied,
    assetsDeleted,
    hasChanges
  };
}

function runGit(args, options) {
  const cwd = options.cwd;
  try {
    execFileSync('git', args, {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe']
    });
  } catch (err) {
    throw new Error(`git 命令执行失败: git ${args.join(' ')}`);
  }
}

function cloneRepoBToTemp(config) {
  const owner = process.env.REPO_B_OWNER;
  const name = process.env.REPO_B_NAME;
  const branch = process.env.REPO_B_BRANCH || config.repoB.branch || 'main';
  const token = process.env.REPO_B_SYNC_TOKEN;

  if (!owner || !name || !token) {
    throw new Error('[env] 需要 REPO_B_OWNER / REPO_B_NAME / REPO_B_SYNC_TOKEN 环境变量。');
  }

  const remoteUrl = `https://x-access-token:${token}@github.com/${owner}/${name}.git`;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-b-sync-'));
  const repoPath = path.join(tmpRoot, 'repo-b');

  runGit(['clone', '--branch', branch, '--single-branch', remoteUrl, repoPath], { cwd: tmpRoot });

  return { repoPath, branch, tmpRoot };
}

function commitAndPushRepoB(repoPath, branch) {
  // 提交
  try {
    runGit(['add', '.'], { cwd: repoPath });
    runGit(['commit', '-m', 'chore: sync posts from Repo A'], { cwd: repoPath });
  } catch (err) {
    // 可能是“nothing to commit”，在 hasChanges 判断的前提下不太会出现，但这里容错处理
  }

  // 先 rebase 再 push，防止远端已更新导致冲突
  runGit(['pull', '--rebase', 'origin', branch], { cwd: repoPath });
  runGit(['push', 'origin', branch], { cwd: repoPath });
}

function main() {
  const rootDir = process.cwd();
  const argv = minimist(process.argv.slice(2));
  const dryRun = !!(argv['dry-run'] || argv.dryRun);
  const repoBPathArg = argv['repo-b-path'] || argv.repoBPath;

  const config = loadConfig(rootDir);

  if (repoBPathArg) {
    const repoBPath = path.resolve(rootDir, repoBPathArg);
    console.log(`[mode] 本地联调模式，Repo B 路径: ${repoBPath}`);
    const result = syncIntoRepoB(rootDir, repoBPath, config, { dryRun });
    console.log(
      `[sync] 完成。本地${dryRun ? '预览（dry-run）' : '实际写入'}结果：` +
        ` 新建 ${result.created}，更新 ${result.updated}，删除 ${result.deleted}，复制资源 ${result.assetsCopied}，删除资源目录 ${result.assetsDeleted}`
    );
    return;
  }

  console.log('[mode] CI 模式，准备克隆 Repo B 并执行同步…');
  const { repoPath, branch } = cloneRepoBToTemp(config);
  console.log(`[git] 已克隆 Repo B 到临时目录: ${repoPath}`);

  const result = syncIntoRepoB(rootDir, repoPath, config, { dryRun: false });

  if (!result.hasChanges) {
    console.log('[sync] 本次同步没有检测到任何变更，跳过提交与推送。');
    return;
  }

  console.log(
    `[sync] 检测到变更：新建 ${result.created}，更新 ${result.updated}，删除 ${result.deleted}，复制资源 ${result.assetsCopied}，删除资源目录 ${result.assetsDeleted}`
  );

  commitAndPushRepoB(repoPath, branch);
  console.log('[git] 已完成 commit、pull --rebase 与 push。');
}

if (require.main === module) {
  main();
}
