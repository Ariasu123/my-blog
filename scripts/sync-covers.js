const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const postsDir = path.join(__dirname, '..', 'source', '_posts');
const defaultCover = '/assets/images/default-cover.svg';
const defaultBanner = '/assets/images/default-banner.svg';

function readMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(dir, file));
}

function ensureCoverFields(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  let changed = false;

  if (!parsed.data.index_img) {
    parsed.data.index_img = defaultCover;
    changed = true;
  }

  if (!parsed.data.banner_img) {
    parsed.data.banner_img = defaultBanner;
    changed = true;
  }

  if (!changed) {
    return false;
  }

  const nextContent = matter.stringify(parsed.content.trimStart(), parsed.data);
  fs.writeFileSync(filePath, nextContent);
  return true;
}

function main() {
  const files = readMarkdownFiles(postsDir);

  if (files.length === 0) {
    console.log('[cover:sync] 未发现文章，跳过封面同步。');
    return;
  }

  let updatedCount = 0;

  for (const file of files) {
    const changed = ensureCoverFields(file);
    if (changed) {
      updatedCount += 1;
      console.log(`[cover:sync] 已补全封面字段: ${path.basename(file)}`);
    }
  }

  if (updatedCount === 0) {
    console.log('[cover:sync] 所有文章的封面字段已完整。');
    return;
  }

  console.log(`[cover:sync] 共更新 ${updatedCount} 篇文章。`);
}

main();
