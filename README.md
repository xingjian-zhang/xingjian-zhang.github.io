# Xingjian Zhang's website

Build, unit/resource checks and functional checks are the release gate. Existing
static pixel results are recorded, but the user requested no further pixel testing
before publication. Full animation keyframe equivalence remains unproven.
See the [validation report](reports/cleanup.md).

Static HTML, CSS and vanilla JavaScript, with a small Node prebuild followed by
Jekyll. Public routes remain `/`, `/pages/research.html`,
`/pages/experience.html`, `/pages/projects.html`, `/pages/misc.html`, and
`/ai-coding-setup/`. The domain remains `xingjianz.com`.

## Local development

Use the versions in `.nvmrc`, `.ruby-version`, `package-lock.json` and
`Gemfile.lock` (Bundler 2.5.15). Then:

```sh
npm ci
bundle install
npx playwright install chromium webkit
npm run build
npm run preview
# Or rebuild on source changes:
npm run dev
```

The preview defaults to port 4000; set `PORT` for `npm run dev` if it is occupied.
Refresh the browser after rebuilds. Source files are build inputs, not a supported
`file://` preview. `jekyll serve` alone bypasses the required prebuild.

## Source ownership

- `index.html`, `pages/`, `_layouts/default.html`: page content/layout inputs.
- `components/`: shared analytics, navigation and footer, inserted at build time.
- `assets/data/publications.bib`: sole source of paper titles, authors, years,
  paper URLs and code URLs. Braced/quoted fields and numeric years are supported;
  unsupported expressions and malformed entries fail the build.
- `scripts/lib/publication-meta.json`: presentation labels, kinds and topic tags
  keyed by BibTeX citation key; it does not duplicate paper content.
- `scripts/lib/publications.mjs`: build-only parsing, validation and HTML rendering.
- `assets/js/theme.js`: early system/saved theme setup and toggle persistence.
- `assets/js/homeInteractions.js`: homepage tilt, disclosures and navigation.
- `assets/js/publications.js`: legacy research-page filters over prebuilt rows.
- `assets/css/styles.css`, `home-motion.css`: existing cascade and motion rules.
- `assets/css/source-sans.css`, `icons.css`, `assets/fonts/`: exact vendored fonts
  and the referenced Bootstrap glyph rules. Do not substitute or re-subset fonts
  without proving identical glyphs and metrics. See `THIRD_PARTY_NOTICES.md`.

`npm run build` stages only publish inputs in `.build/source`, embeds shared
components and papers, combines the unchanged Source Sans faces into `styles.css`,
and runs locked Jekyll into `_site`. Node dependencies, test fixtures, reports, build tools and intermediate source trees
are excluded from deployment. Public font license files are retained.
Images are kept byte-for-byte unchanged by this cleanup.

## Verification

```sh
npm run reference             # immutable Git reference, not current working tree
npm run build
npm test                     # parser/data validation and strict RGBA comparator
npm run check                # whitespace, generated local paths, static-home checks
npm run test:aa               # old vs old; must pass before accepting comparisons
npm run test:visual           # old vs candidate, both engines
npm run test:performance      # seven alternating cold runs
npm run format:check          # build/test tooling only; leaves frontend whitespace intact
```

On macOS, keep the machine awake during browser runs (for example
`caffeinate -di npm run test:visual`). A suspended run is not valid evidence.
Full-page captures can be slow for the long workshop document.
To run in the pinned offline Linux browser image (Docker must be running):

```sh
AA=1 REPORT=output/linux/aa.json npm run test:container
REPORT=output/linux/candidate.json npm run test:container
PERF_REPORT=output/linux/performance.json npm run test:container -- node scripts/performance.mjs
```

Both reference and candidate are captured on the same OS and architecture within
each run. Do not compare image files across macOS, Linux, ARM64 and x86-64.

See `tests/README.md` for pixel, font, state and motion contracts.
Run performance measurements without any visual-test browser workload.
The baseline commit is fixed; do not update snapshots to hide a regression.
Failure artifacts include both images, a decoded-pixel difference image and trace
under `output/`. Performance reports are separate from visual results.

For independently reproducible optimization stages:

```sh
node scripts/ablate.mjs
CANDIDATE_ROOT=.build/components npm run test:visual
CANDIDATE_ROOT=.build/publications npm run test:visual
CANDIDATE_ROOT=.build/fonts npm run test:visual
VARIANTS='{"reference":".build/reference","components":".build/components","publications":".build/publications","candidate":"_site"}' npm run test:performance
```

Performance uses a real local HTTP/gzip mirror and native Chromium network/CPU
throttling. It excludes live CDN/DNS/TLS variability. Raw runs, median,
range and median absolute deviation are saved in `output/performance.json`.
Do not describe deletion of unrequested files as client-side savings.

## Deployment

The explicit `.github/workflows/pages.yml` requires unit/build/resource checks,
and functional checks
before uploading `_site` and allowing a main-branch Pages deployment. Pull
requests never deploy. Manual workflow runs can enable `strict` to additionally
require complete A/A, animation keyframes and seven-run performance comparisons;
those checks still fail rather than masking differences or treating them as passes.

Pages must use **Settings → Pages → Build and deployment → Source → GitHub Actions**.
The uploaded artifact preserves `CNAME`. Do not switch back to the legacy branch
pipeline: unprocessed source bypasses the required Node prebuild. Local builds do
not publish; a successful Pages deployment and live verification are separate steps.
