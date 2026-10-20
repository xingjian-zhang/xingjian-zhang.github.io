# Personal website maintenance

This is Xingjian (Jimmy) Zhang's static academic website at xingjianz.com.
Preserve existing content, routes, links, visual rendering and interaction timing.
Use HTML, CSS and vanilla JavaScript; do not introduce a frontend framework.

## Build and preview

Use the pinned Node/Ruby versions and lockfiles. Run `npm ci`, `bundle install`,
then `npm run build`. The Node prebuild inserts shared components and publication
HTML before locked Jekyll renders `_site`. `npm run dev` rebuilds and serves on
port 4000; `npm run preview` serves the last build. Do not use `file://` previews
or plain `jekyll serve`, which bypass the prebuild.

## Ownership

- Page content: `index.html`, `pages/*.html`, `ai-coding-setup.md`.
- Shared markup: `components/`; document wrapper: `_layouts/default.html`.
- Paper content: `assets/data/publications.bib` only. Build metadata (venue/kind/
  tags) lives in `scripts/lib/publication-meta.json`; renderer/parser in
  `scripts/lib/publications.mjs`. Never restore a hand-maintained paper duplicate.
- CSS: `assets/css/styles.css` followed by homepage `home-motion.css`. Keep
  declaration values, cascade order and specificity unchanged during cleanup.
- Fonts: exact local Source Sans 3 and Bootstrap Icons files; preserve metrics.
- Runtime JS: `theme.js`, `homeInteractions.js`, and legacy-page `publications.js`.
- Absolute component/asset URLs work at every page depth.

## Verification and publishing

Follow README.md and tests/README.md. Build the immutable Git reference before
A/A and candidate tests. Require exactly zero decoded RGBA differences: no masks,
perceptual tolerance or antialiasing exclusions. Compare each browser with its own
reference in the same environment. Keep performance tests separate from visuals.

`npm test`, `npm run check`, `npm run test:aa`, `npm run test:visual` and
`npm run test:performance` are the maintenance commands. Keep generated output,
reports and Node dependencies out of the published artifact. Preserve analytics.

Local commits, pushes and successful live deployments are separate states.
Do not push or change Pages settings unless the user requests publication.
