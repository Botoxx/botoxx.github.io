# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a personal portfolio/resume website built with Hugo static site generator. The site is deployed to GitHub Pages at https://botoxx.github.io/ and showcases professional experience, skills, education, and certifications for Botond Geiszt, a DevOps Engineer.

## Hugo Setup

**Hugo Version:** 0.145.0 (extended version used in CI/CD)

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
The site uses a single-page layout with anchor-linked sections:
- `layouts/index.html` - Main homepage template that pulls in all content sections
- `layouts/_default/single.html` - Default single page template
- `layouts/partials/` - Reusable components:
  - `head.html` - Meta tags, styles, Font Awesome CDN
  - `header.html` - Profile section with name, title, and social links
  - `nav.html` - Sticky navigation with anchor links to sections
  - `footer.html` - Footer content

**Static Assets:**
- `static/css/style.css` - All custom styling with CSS variables and animations
- `static/css/normalize.css` - CSS reset/normalization
- `static/js/main.js` - Client-side JavaScript (back-to-top button, smooth scrolling)
- `static/favicon.ico` - Site favicon

### Styling System

The site uses CSS custom properties (variables) defined in `:root` for theming:
- Color scheme: `--primary-color`, `--secondary-color`, `--accent-color`
- Consistent transitions and shadows
- Responsive design with breakpoints at 768px and 480px
- Print-specific styles for resume printing
- Animation system using keyframes for fadeIn, slideInUp, slideInLeft, and pulse effects

### Navigation Pattern

Navigation uses hash-based anchor links (`#about`, `#experience`, etc.) with conditional logic in `nav.html` to handle both homepage and subpage contexts using Hugo's `.IsHome` template variable.

## Deployment

**Automatic Deployment:**
- GitHub Actions workflow: `.github/workflows/gh-pages.yml`
- Triggers on push to `main` branch
- Uses Hugo 0.145.0 extended version
- Builds with `--gc --minify` flags
- Deploys to GitHub Pages from `public/` directory

**Manual Deployment:**
If needed, build locally and the `public/` directory contains the deployable static site.

## Content Editing Guidelines

When updating content sections:
1. Each section's `index.md` has frontmatter with `title`, `date`, and `draft` status
2. Use Markdown for formatting - HTML is also supported (goldmark renderer has `unsafe = true`)
3. The site pulls content using `.Site.GetPage` in the main layout
4. List items in content use Font Awesome icons automatically via CSS `::before` pseudo-elements

## Key Dependencies

- Hugo Extended (required for SCSS processing if added later)
- Font Awesome 5 (loaded via CDN in head partial)
- Google Fonts: 'Open Sans' and 'Roboto' (loaded via CDN)
- No Node.js dependencies (package.json does not exist)

## Site Parameters

Defined in configuration files (`hugo.toml`/`config.toml`):
- `baseURL` - Site URL for GitHub Pages
- `title` - Site/page title
- `params.author` - Author name
- `params.description` - Site meta description
- `params.jobtitle` - Professional title displayed in header
- `params.github`, `params.linkedin`, `params.email` - Social/contact links
