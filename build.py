#!/usr/bin/env python3
"""
Build script for southyorkshirepropertybuyers.com.

Reads the organised source tree at /website/ and outputs a flat
deployment tree at /dist/ ready for GitHub Pages.

The source structure is organised by content type for human clarity:

    website/
    ├── index.html                  -> dist/index.html
    ├── sitemap.xml, robots.txt     -> dist/sitemap.xml, dist/robots.txt
    ├── css/, images/, media/       -> dist/css/, dist/images/, dist/media/
    ├── blog/                       -> dist/blog/
    │   ├── index.html              -> dist/blog/index.html
    │   ├── images/                 -> dist/blog/images/
    │   └── <slug>/                 -> dist/blog/<slug>/
    └── pages/
        ├── locations/<slug>/       -> dist/<slug>/
        ├── situations/<slug>/      -> dist/<slug>/
        ├── services/<slug>/        -> dist/<slug>/
        └── comparisons/<slug>/     -> dist/<slug>/

The pages/<category>/ structure is collapsed during build so each page
keeps its original URL at the root of the site.
"""

import os
import shutil
import sys


SOURCE = 'website'
DEST = 'dist'


def main():
    if not os.path.isdir(SOURCE):
        print(f"error: source folder {SOURCE}/ does not exist", file=sys.stderr)
        sys.exit(1)

    # Clean dist/ if it already exists
    if os.path.isdir(DEST):
        shutil.rmtree(DEST)
    os.makedirs(DEST)

    copied = {'root_files': 0, 'asset_dirs': 0, 'blog_items': 0, 'pages': 0}

    # 1. Root-level files (index.html, sitemap.xml, robots.txt, etc.)
    for entry in os.listdir(SOURCE):
        src = os.path.join(SOURCE, entry)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(DEST, entry))
            copied['root_files'] += 1

    # 2. Asset folders (css, images, media) — copied as-is
    for asset_dir in ('css', 'images', 'media'):
        src = os.path.join(SOURCE, asset_dir)
        if os.path.isdir(src):
            shutil.copytree(src, os.path.join(DEST, asset_dir))
            copied['asset_dirs'] += 1

    # 3. Blog tree — keep the /blog/ URL prefix intact
    blog_src = os.path.join(SOURCE, 'blog')
    blog_dst = os.path.join(DEST, 'blog')
    if os.path.isdir(blog_src):
        os.makedirs(blog_dst, exist_ok=True)
        for entry in os.listdir(blog_src):
            src = os.path.join(blog_src, entry)
            dst = os.path.join(blog_dst, entry)
            if os.path.isfile(src):
                shutil.copy2(src, dst)
            elif os.path.isdir(src):
                shutil.copytree(src, dst)
            copied['blog_items'] += 1

    # 4. Pages — flatten /pages/<category>/<slug>/ to /<slug>/
    pages_src = os.path.join(SOURCE, 'pages')
    if os.path.isdir(pages_src):
        for category in os.listdir(pages_src):
            cat_path = os.path.join(pages_src, category)
            if not os.path.isdir(cat_path):
                continue
            for slug in os.listdir(cat_path):
                slug_src = os.path.join(cat_path, slug)
                if not os.path.isdir(slug_src):
                    continue
                slug_dst = os.path.join(DEST, slug)
                if os.path.exists(slug_dst):
                    print(f"error: duplicate slug at deploy root: {slug}", file=sys.stderr)
                    sys.exit(1)
                shutil.copytree(slug_src, slug_dst)
                copied['pages'] += 1

    # Summary
    print(f"build complete: {SOURCE}/ -> {DEST}/")
    print(f"  root files: {copied['root_files']}")
    print(f"  asset folders: {copied['asset_dirs']}")
    print(f"  blog items: {copied['blog_items']}")
    print(f"  pages (flattened from /pages/<category>/): {copied['pages']}")


if __name__ == '__main__':
    main()
