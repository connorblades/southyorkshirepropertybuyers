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

## Editing rules

- **Never rename or move a top-level directory** that has a URL. It will break SEO. URL = directory path.
- **Asset references** should use absolute paths like `/css/styles.css`, `/images/favicon.png`, `/media/hero.mp4`.
- **Brand voice rules** for any new content live in `/_off-website/` and `~/.claude/skills/sypb-content/references/brand-voice.md`. Key rule: no em dashes.
- **No AI attribution** in commit messages or anywhere in served content.
- **Sitemap** (`sitemap.xml`) must be updated whenever a new page directory is added or a page is significantly rewritten (refresh `lastmod`).
