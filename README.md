# South Yorkshire Property Buyers — site repository

This repository hosts [southyorkshirepropertybuyers.com](https://southyorkshirepropertybuyers.com). The site is built from `/website/` into a flat `/dist/` and served by an Express app on **Hostinger**. Every push to `main` triggers a Hostinger redeploy.

## Structure

```
.
├── website/                              SOURCE — you edit content here
│   ├── index.html                        Homepage (deploys to /)
│   ├── sitemap.xml, robots.txt           Crawler files (deploy to /)
│   ├── css/, images/, media/, js/        Site-wide assets (deploy to /css, /images, /media, /js)
│   ├── blog/                             Blog (deploys to /blog/...)
│   │   ├── index.html
│   │   ├── images/
│   │   └── <post-slug>/                  Each post = one URL at /blog/<post-slug>/
│   └── pages/                            Top-level URL pages grouped by category
│       ├── locations/                    13 town and city pages (sell-house-fast-*, cash-house-buyer-*)
│       ├── situations/                   19 situation pages (probate, divorce, repossession, etc.)
│       ├── services/                     6 service pages (about, faq, get-offer, etc.)
│       ├── comparisons/                  11 comparison/info pages
│       └── utility/                      thank-you (noindex)
│
├── build.js                              Build script: flattens website/ -> dist/ (run by server.js on boot)
├── build.py                              Python port, kept for local use; must match build.js
├── server.js                             Express app: builds, serves dist/, /api/submit, www redirect, 404
├── dist/                                 BUILD OUTPUT — auto-generated, gitignored
│
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

`build.js` reads `/website/` and writes a flat `/dist/`. `build.py` is a Python port kept for local use; both must produce identical output.

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
npm install                 # once
npm start                   # builds dist/ then serves at localhost:3000
```

`npm start` runs `server.js`, which builds `dist/` on boot, so there is no separate build step. Edit files under `website/`, restart, refresh. Use `npm run dev` to restart automatically on change.

Serving through `server.js` rather than a plain static server matters: it is the only way to exercise the `/api/submit` form handler, the `www` to apex redirect, and the real 404 status.

## Deployment

The site runs as a **Hostinger Node.js app**. Pushing to `main` triggers a redeploy.

1. Hostinger pulls `main`
2. Runs `npm install`
3. Runs `npm start`, which executes `build.js` (rebuilding `dist/` from `website/`) and then serves it with Express

Deploy time is roughly 30 to 60 seconds.

**Verifying a deploy:** a `200` response proves nothing, because the old build also returns `200`. Check for content you just changed:

```
curl -s https://southyorkshirepropertybuyers.com/ | grep -c 'some-string-you-just-added'
```

If the site is still serving the old build after a few minutes, redeploy manually from hPanel.

**Framework note:** the Hostinger app must be configured as a **Node.js** app. `package-lock.json` must stay committed or the install step fails.

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
- **Keep JavaScript in `website/js/`.** Inline `<script>` blocks get mangled by the editor formatter. Bump the `styles.css?v=N` cache-buster across all pages whenever CSS changes.
- **Sitemap (`website/sitemap.xml`)** must be updated whenever a new page is added or a page is significantly rewritten (refresh `lastmod`).

## Drip queue

The following untracked content lives on local disk for future publishing:

- `website/blog/best-cash-house-buyer-doncaster/`
- `website/blog/best-cash-house-buyer-rotherham/`
- `website/blog/best-cash-house-buyer-barnsley/`
- `postcodes-we-cover/` (move into `website/pages/services/` when ready to publish)

Because these are untracked, they will not be deployed even though they live inside `website/`. To publish: `git add` the directory, update `website/sitemap.xml`, commit, push.
