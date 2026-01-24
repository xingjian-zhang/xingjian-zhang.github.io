# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Xingjian (Jimmy) Zhang's personal academic website, deployed to GitHub Pages at xingjianz.com. It's a static site with no build system - pure HTML, CSS, and vanilla JavaScript.

## Development

**Local preview:**
```bash
jekyll serve
```
Then visit http://localhost:4000

**Deployment:** Push to GitHub - the site auto-deploys via GitHub Pages. Jekyll builds the site into `_site/`.

## Architecture

### Page Structure
- `index.html` - Main homepage with bio, selected papers, news, honors, and service
- `pages/research.html` - Full publication list loaded dynamically from BibTeX
- `pages/experience.html` - Education, internships, and teaching
- `pages/misc.html` - Personal interests (albums, games, books) with a "42" quiz gate

### Component System
- `components/header.html` - Shared navigation header with Google Analytics
- `assets/js/loadComponents.js` - Injects header into `#header-placeholder` on all pages

### CSS Organization
Modular CSS in `assets/css/` using `@import` in `main.css`:
- `base/` - Variables (design tokens), reset, typography
- `components/` - Styles for header, profile, news, publications, experience, gallery, footer
- `layout/` - Grid system, responsive breakpoints
- `utilities/` - Animations, helper classes

Design tokens are defined in `assets/css/base/_variables.css` using CSS custom properties.

### Publications
- `assets/data/publications.bib` - BibTeX source for all publications
- `assets/js/main.js` - Parses BibTeX and renders publications on the research page, auto-categorizes by venue type (journal/conference/workshop/preprint)

### Key Patterns
- Header component uses absolute paths (`/components/header.html`, `/assets/...`) so it works from any page depth
- Pages in `pages/` use relative paths (`../assets/...`) for their own resources
- Author name "Xingjian Zhang" is auto-bolded in publication listings
