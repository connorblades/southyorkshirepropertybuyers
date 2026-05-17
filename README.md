# South Yorkshire Property Buyers — site repository

This repository is the live website at [southyorkshirepropertybuyers.com](https://southyorkshirepropertybuyers.com), deployed via GitHub Pages from the `main` branch.

## Structure

```
.
├── index.html                  Homepage (must stay at root)
├── robots.txt, sitemap.xml     Crawler files (must stay at root)
├── README.md                   This file
│
├── /css/                       Stylesheets
├── /images/                    Site-wide images (favicon, logos, hero stills)
├── /media/                     Site-wide videos (hero, background, ads)
│
├── /blog/                      Blog index + 32 article directories
│   ├── index.html
│   ├── images/                 Blog post hero images
│   └── [post-slug]/index.html  Each post = one URL
│
├── /[page-slug]/               Every other top-level directory is one URL
│                               on the live site, e.g. /sell-house-fast-doncaster/.
│                               These directories MUST stay at root; moving them
│                               changes their URL and breaks SEO.
│
├── /Backlink Outreach/         Working folder for PR/outreach (untracked)
├── /_off-website/              Non-website working files (untracked)
└── /_dev/                      Local dev server tooling (untracked)
```

## Page categories at root

### Service / situation pages
`about/`, `cannot-afford-mortgage/`, `cash-buyer-vs-estate-agent/`, `faq/`, `get-offer/`, `house-wont-sell-what-to-do/`, `how-it-works/`, `how-to-stop-house-repossession-south-yorkshire/`, `landlord-selling-house-can-i-stay/`, `need-to-sell-house-urgently/`, `privacy-policy/`, `reviews/`, `sell-house-after-divorce/`, `sell-house-at-auction/`, `sell-house-before-repossession/`, `sell-house-during-divorce-uk/`, `sell-house-during-probate/`, `sell-house-that-needs-repairs/`, `sell-house-with-japanese-knotweed/`, `sell-house-with-tenants-in-situ/`, `sell-inherited-house-quickly/`, `sell-my-house-quickly/`, `sell-property-portfolio/`, `selling-house-poor-condition-options/`, `selling-inherited-property-south-yorkshire/`, `struggling-to-sell-my-house/`, `tenant-not-paying-rent/`, `thank-you/`, `title-defects-can-i-sell-my-property/`, `what-is-a-cash-buyer-selling-fast/`

### City pages (parent service)
`sell-house-fast-sheffield/`, `sell-house-fast-rotherham/`, `sell-house-fast-doncaster/`, `sell-house-fast-barnsley/`, `sell-house-fast-chesterfield/`, `sell-house-fast-worksop/`, `sell-house-fast-retford/`, `sell-house-fast-gainsborough/`, `sell-house-fast-mansfield/`

### City pages (cash-buyer-specific child)
`cash-house-buyer-doncaster/`, `cash-house-buyer-barnsley/`

## Local development

The static site has no build step. Open `index.html` in a browser, or run a local server from `/_dev/`:

```
cd _dev && node server.js
# or
cd _dev && python3 serve.py
```

## Deployment

GitHub Pages auto-deploys from `main`. Every `git push origin main` triggers a rebuild that goes live in 1-2 minutes. No build step.

## Naming conventions

Files and directories follow these conventions. Apply them when adding anything new.

### Served at a public URL (mandatory: kebab-case lowercase)

| Type | Pattern | Example |
|---|---|---|
| URL directory | `kebab-case-lowercase/` | `sell-house-fast-doncaster/` |
| Page file | always `index.html` inside the URL directory | `sell-house-fast-doncaster/index.html` |
| Image | `kebab-case-descriptive-name.ext` | `logo-light.png`, `hero-poster.jpg`, `best-cash-house-buyer-sheffield-2026.jpg` |
| Video | same pattern | `website-background.mp4`, `sypb-video-ad-16x9.mp4` |
| Stylesheet | same pattern | `styles.css` |

Brand-name abbreviations like `sypb-` are allowed at the start of asset filenames. Dimensions like `16x9` and years like `2026` are part of the descriptor, separated by hyphens.

### Local working folders (Title Case With Spaces, untracked)

For folders that hold drafts, outreach docs, social content, and other non-website artefacts:

`Backlink Outreach/`, `Social Posts/`, `Worksop Workspace Social/`

### Hidden / system folders (lowercase, underscore prefix)

For folders that should sort to the top of a directory listing and stay out of the served site:

`_off-website/`, `_dev/`

### Documentation files inside working folders

Match the working folder convention: `01-Strategy.md`, `02-Citation Directories.md`. Numeric prefixes enforce reading order.

### Root-level documentation

UPPERCASE convention for standard project docs that tooling recognises: `README.md`, `LICENSE`, `CREDITS.md`.

### Convention violations to avoid

- No PascalCase or Title-Case in URL-bound paths (was: `Website-background2.mp4`, now: `website-background.mp4`).
- No spaces in served filenames or URL slugs (spaces force URL encoding to `%20` and look broken).
- No trailing version numbers like `-v2`, `-final`, `-new`. If you replace an asset, replace the file, do not add a sibling with a higher number. Old assets that are no longer referenced should be deleted.
- No mixed-case extensions (`.JPG`, `.Mp4`). Always lowercase.

## Editing rules

- **Never rename or move a top-level directory** that has a URL. It will break SEO. URL = directory path.
- **Asset references** should use absolute paths like `/css/styles.css`, `/images/favicon.png`, `/media/hero.mp4`.
- **Brand voice rules** for any new content live in `~/.claude/skills/sypb-content/references/brand-voice.md`. Key rule: no em dashes.
- **No AI attribution** in commit messages or anywhere in served content.
- **Sitemap** (`sitemap.xml`) must be updated whenever a new page directory is added or a page is significantly rewritten (refresh `lastmod`).
