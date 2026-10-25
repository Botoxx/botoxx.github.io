# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio/resume website built with Hugo static site generator. The site is deployed to GitHub Pages at https://botoxx.github.io/ and showcases professional experience, skills, education, and certifications for Botond Geiszt, a DevOps Engineer.

## Hugo Setup

**Hugo Version:** 0.168.0 extended (CI pins `HUGO_VERSION` in `.github/workflows/gh-pages.yml`; keep local and CI in step)

The site uses a custom theme with layouts in `layouts/` and does NOT use Git submodules for themes. All templates and styling are maintained directly in this repository.

## Common Commands

### Local Development
```bash
# Start Hugo development server with draft content
hugo server -D

# Start Hugo server (production-like, no drafts)
hugo server

# Build the site (outputs to public/)
hugo --gc --minify

# Build with specific base URL
hugo --baseURL "https://botoxx.github.io/" --gc --minify
```

### Content Management
```bash
# Create new content section
hugo new content/section-name/index.md

# Note: Content files use the archetype in archetypes/default.md
```

## Architecture

### Configuration Files

The repository contains TWO Hugo configuration files:
- `hugo.toml` - Primary configuration (includes theme reference to "niello")
- `config.toml` - Alternative/legacy configuration

When making configuration changes, verify which file is actively used by checking the site behavior or CI/CD workflow.

### Site Structure

**Content Organization:**
All content lives in `content/` with each section as a standalone page using `index.md`:
- `content/about/index.md` - Professional profile and contact info
- `content/experience/index.md` - Work history
- `content/education/index.md` - Educational background
- `content/skills/index.md` - Technical skills categorized by domain
- `content/languages/index.md` - Language proficiencies
- `content/courses/index.md` - Certifications and courses
- `content/projects/index.md` - Project portfolio (if applicable)
- `content/summary/index.md` - Professional summary (if applicable)

**Layout Architecture:**
- `layouts/index.html` - Homepage: hero scene (canvas street drawing with a glitching window, from The Animatrix "Beyond") above the interactive shell, waste estimator with request draft, services, audit, timeline, writing, stack. Repeated items come from `data/` (`services.yaml`, `roles.yaml`, `stack.yaml`, `pricing.yaml`) and the latest blog posts; they are passed to `home.js` as JSON in `#site-data`
- `layouts/_default/cv.html` - `/cv/` page (stack, certifications, education) from `data/stack.yaml`
- `layouts/shortcodes/pricing.html` - Audit fee model from `data/pricing.yaml` (used on `/finops-audit/`); change the fee share, turnaround or definition of identified waste there only
- `layouts/_default/single.html`, `layouts/blog/*.html`, `layouts/_default/{taxonomy,terms}.html` - Inner pages (`.page` + `.prose`)
- `layouts/partials/`:
  - `head.html` - Meta tags, font preloads, fingerprinted `site.css`
  - `header.html` - Sticky top bar: brand, section links, theme toggle, "Request an audit"
  - `footer.html` - Contact block (copy-address button), links, colophon
  - `icons.html` - SVG symbol sprite

**Assets:**
- `assets/css/site.css` - All styling: colour tokens (light default, `data-theme` and OS preference for dark), self-hosted `@font-face`, homepage, prose, code colours (chroma classes)
- `assets/js/site.js` - Every page: theme toggle, copy address. `assets/js/home.js` - Homepage only: hero scene, estimator, timeline, shell. Bundled with Hugo `js.Build` (esbuild, no Node); plain JS because esbuild strips TypeScript types without checking them
- `static/fonts/` - Self-hosted Dela Gothic One (display), Zen Kaku Gothic New (text) and IBM Plex Mono (code, figures); no third-party font requests
- `static/favicon.ico` - Site favicon

### Styling System

Colour and type tokens live on `:root` in `assets/css/site.css`; light values are the default and dark values are applied for `[data-theme="dark"]` and for `prefers-color-scheme: dark` without an explicit light theme. Scene colours (`--sky-top`, `--wall`, `--pencil`, …) are tokens too, read by the canvas, so both themes repaint the drawing. Green (`--glitch`) marks only the code world: shell, glitch, waste. Pencil borders use `.ink` (SVG filter `#pencil` in `icons.html`) and hatched shading uses a `.hatch` wrapper. Breakpoints at 1100px, 960px and 760px. One motion moment (the hero scene), reduced-motion respected throughout.

### Navigation Pattern

The top bar links to homepage anchors (`#services`, `#audit`, `#work`, `#estimate`), prefixed with `/` on inner pages via `.IsHome` in `header.html`; "Writing" goes to `/blog/`.

## Deployment

**Automatic Deployment:**
- GitHub Actions workflow: `.github/workflows/gh-pages.yml`
- Triggers on push to `main` branch
- Uses Hugo extended at the pinned `HUGO_VERSION`
- Builds with `--gc --minify` flags
- Deploys to GitHub Pages from `public/` directory

**Manual Deployment:**
If needed, build locally and the `public/` directory contains the deployable static site.

## Content Editing Guidelines

When updating content sections:
1. Each section's `index.md` has frontmatter with `title`, `date`, and `draft` status
2. Use Markdown for formatting - HTML is also supported (goldmark renderer has `unsafe = true`)
3. Standalone pages (`/experience/`, `/skills/`, …) render their own `index.md`; the homepage reads `data/*.yaml`, so update both when facts change
4. Blog posts need `date`, `summary` and `tags` in frontmatter; the homepage and the shell list the 5 most recent

## Key Dependencies

- Hugo Extended (required for SCSS processing if added later)
- No CDN dependencies: fonts and icons are self-hosted
- No Node.js dependencies (package.json does not exist)

## Site Parameters

Defined in configuration files (`hugo.toml`/`config.toml`):
- `baseURL` - Site URL for GitHub Pages
- `title` - Site/page title
- `params.author` - Author name
- `params.description` - Site meta description
- `params.jobtitle` - Professional title displayed in header
- `params.github`, `params.linkedin`, `params.email` - Social/contact links
