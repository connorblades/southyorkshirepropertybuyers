# South Yorkshire Property Buyers — site repository

This repository hosts [southyorkshirepropertybuyers.com](https://southyorkshirepropertybuyers.com). The site is built from `/website/` via `build.py` and deployed to GitHub Pages by GitHub Actions on every push to `main`.

## Structure

```
.
├── website/                              SOURCE — you edit content here
│   ├── index.html                        Homepage (deploys to /)
│   ├── sitemap.xml, robots.txt           Crawler files (deploy to /)
│   ├── css/, images/, media/             Site-wide assets (deploy to /css, /images, /media)
│   ├── blog/                             Blog (deploys to /blog/...)
│   │   ├── index.html
│   │   ├── images/
│   │   └── <post-slug>/                  Each post = one URL at /blog/<post-slug>/
│   └── pages/                            Top-level URL pages grouped by category
│       ├── locations/                    11 city pages (sell-house-fast-*, cash-house-buyer-*)
│       ├── situations/                   15 situation pages (probate, divorce, repossession, etc.)
│       ├── services/                     7 service pages (about, faq, get-offer, etc.)
│       └── comparisons/                  8 comparison/info pages
│
├── build.py                              Build script: flattens website/ -> dist/
├── dist/                                 BUILD OUTPUT — auto-generated, gitignored
│
├── .github/workflows/build.yml           GitHub Actions: runs build.py + deploys dist/
│
├── README.md                             This file
├── .gitignore
│
├── Backlink Outreach/                    Working folder (untracked)
├── Social Media/                         Social content, separate from website (untracked)
│   ├── Social Posts/
│   └── Worksop Workspace Social/
├── _internal/                            Private notes (untracked)
├── _dev/                                 Local dev tooling (untracked)
└── exports/                              Old data (untracked)
```

## How the build works

`build.py` reads `/website/` and writes a flat `/dist/`:

| Source | Destination |
|---|---|
| `website/index.html` | `dist/index.html` |
| `website/sitemap.xml`, `robots.txt` | `dist/sitemap.xml`, `dist/robots.txt` |
| `website/css/`, `images/`, `media/` | `dist/css/`, `dist/images/`, `dist/media/` |
| `website/blog/*` | `dist/blog/*` (URL prefix preserved) |
| `website/pages/<category>/<slug>/` | `dist/<slug>/` (category prefix stripped) |

The `pages/<category>/` grouping is for human organisation only. The category folders are stripped during build so each page keeps its original URL. For example, `website/pages/locations/sell-house-fast-doncaster/` deploys at `southyorkshirepropertybuyers.com/sell-house-fast-doncaster/`.

## Local development

```
python3 build.py            # builds dist/
cd dist && python3 -m http.server 8000   # serves dist/ at localhost:8000
```

Open `localhost:8000` in a browser. Edit files under `website/`, re-run `build.py`, refresh.

## Deployment

GitHub Pages source is set to **GitHub Actions**. Every push to `main` triggers `.github/workflows/build.yml`, which:

1. Checks out the repo
2. Runs `python3 build.py`
3. Uploads `dist/` as the Pages artifact
4. Deploys to `southyorkshirepropertybuyers.com`

Total deploy time: ~1-2 minutes.

## Naming conventions

| Where | Pattern | Example |
|---|---|---|
| URL directories (`website/pages/<category>/<slug>/`, `website/blog/<slug>/`) | `kebab-case-lowercase` | `sell-house-fast-doncaster` |
| Page files | always `index.html` | `sell-house-fast-doncaster/index.html` |
| Served assets | `kebab-case-lowercase.ext` | `logo-light.png`, `website-background.mp4` |
| Working folders | Title Case With Spaces | `Backlink Outreach`, `Social Media` |
| Hidden / system folders | `_lowercase-with-underscore-prefix` | `_internal`, `_dev` |
| Root-level docs | UPPERCASE.md | `README.md`, `LICENSE`, `CREDITS.md` |
| Documentation inside working folders | Title Case With Spaces, numeric prefix optional | `01-Strategy.md`, `Points Of Truth.md` |

### Convention violations to avoid

- No PascalCase or Title-Case in URL-bound paths
- No spaces in served filenames or URL slugs
- No trailing version numbers (`-v2`, `-final`, `-new`)
- No mixed-case extensions (`.JPG`, `.Mp4`)

## Editing rules

- **Adding a new page:** create `website/pages/<category>/<slug>/index.html`. The new URL is `/<slug>/`. Update `website/sitemap.xml` to include the URL.
- **Adding a new blog post:** create `website/blog/<slug>/index.html`. The URL is `/blog/<slug>/`. Update `website/sitemap.xml` and add a card to `website/blog/index.html`.
- **Updating an asset:** replace the file in `website/css/`, `website/images/`, or `website/media/`. No reference updates needed if the filename stays the same.
- **Renaming an existing URL:** don't. Each URL has been indexed by Google. Renaming requires migration with 301 redirects and accepts a 3-6 month SEO recovery period.
- **Brand voice rules:** see `~/.claude/skills/sypb-content/references/brand-voice.md`. Key rule: no em dashes.
- **No AI attribution** in commit messages or anywhere in served content.
- **Sitemap (`website/sitemap.xml`)** must be updated whenever a new page is added or a page is significantly rewritten (refresh `lastmod`).

## Drip queue

The following untracked content lives on local disk for future publishing:

- `website/blog/best-cash-house-buyer-doncaster/`
- `website/blog/best-cash-house-buyer-rotherham/`
- `website/blog/best-cash-house-buyer-barnsley/`
- `postcodes-we-cover/` (move into `website/pages/services/` when ready to publish)

Because these are untracked, they will not be deployed by GitHub Actions even though they live inside `website/`. To publish: `git add` the directory, update `website/sitemap.xml`, commit, push.
