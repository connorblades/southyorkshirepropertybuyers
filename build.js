#!/usr/bin/env node
/**
 * Build script for southyorkshirepropertybuyers.com (Node port of build.py).
 *
 * Hostinger's Node.js deployment runs `npm run build` then `npm start`, and
 * Python is not guaranteed in that environment — so the build is implemented
 * in Node. build.py remains for local use; both must produce identical output.
 *
 * Reads the organised source tree at /website/ and outputs a flat /dist/:
 *
 *   website/index.html                  -> dist/index.html
 *   website/sitemap.xml, robots.txt...  -> dist/ (all root-level files)
 *   website/css|images|media|js/        -> dist/css|images|media|js/
 *   website/blog/                       -> dist/blog/ (prefix preserved)
 *   website/pages/<category>/<slug>/    -> dist/<slug>/ (category stripped)
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'website');
const DEST = path.join(__dirname, 'dist');

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`error: source folder ${SOURCE} does not exist`);
    process.exit(1);
  }

  fs.rmSync(DEST, { recursive: true, force: true });
  fs.mkdirSync(DEST, { recursive: true });

  const copied = { root_files: 0, asset_dirs: 0, blog_items: 0, pages: 0 };

  // 1. Root-level files (index.html, sitemap.xml, robots.txt, llms.txt, CNAME...)
  for (const entry of fs.readdirSync(SOURCE)) {
    const src = path.join(SOURCE, entry);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, path.join(DEST, entry));
      copied.root_files++;
    }
  }

  // 2. Asset folders, copied as-is
  for (const assetDir of ['css', 'images', 'media', 'js']) {
    const src = path.join(SOURCE, assetDir);
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      fs.cpSync(src, path.join(DEST, assetDir), { recursive: true });
      copied.asset_dirs++;
    }
  }

  // 3. Blog tree — keep the /blog/ URL prefix intact
  const blogSrc = path.join(SOURCE, 'blog');
  if (fs.existsSync(blogSrc)) {
    const blogDst = path.join(DEST, 'blog');
    fs.mkdirSync(blogDst, { recursive: true });
    for (const entry of fs.readdirSync(blogSrc)) {
      const src = path.join(blogSrc, entry);
      const dst = path.join(blogDst, entry);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
      else fs.cpSync(src, dst, { recursive: true });
      copied.blog_items++;
    }
  }

  // 4. Pages — flatten /pages/<category>/<slug>/ to /<slug>/
  const pagesSrc = path.join(SOURCE, 'pages');
  if (fs.existsSync(pagesSrc)) {
    for (const category of fs.readdirSync(pagesSrc)) {
      const catDir = path.join(pagesSrc, category);
      if (!fs.statSync(catDir).isDirectory()) continue;
      for (const slug of fs.readdirSync(catDir)) {
        const src = path.join(catDir, slug);
        if (!fs.statSync(src).isDirectory()) continue;
        fs.cpSync(src, path.join(DEST, slug), { recursive: true });
        copied.pages++;
      }
    }
  }

  console.log(`build complete: website/ -> dist/`);
  console.log(`  root files: ${copied.root_files}`);
  console.log(`  asset folders: ${copied.asset_dirs}`);
  console.log(`  blog items: ${copied.blog_items}`);
  console.log(`  pages (flattened from /pages/<category>/): ${copied.pages}`);
}

main();
