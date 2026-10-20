# Visual contract

The immutable reference is commit `78a774c0b354d0f9039057db1f04e0b366d69e3f`.
It contains the approved removal of the Muse link in the team subtitle; refactors
are compared with that commit, never with regenerated candidate snapshots.

`npm run reference` builds it from a Git archive. The tests serve reference and
candidate builds on ports 4400 and 4401. `AA=1` compares two independent reference
contexts. PNGs are decoded and every RGBA channel must match exactly, including
antialiasing and alpha. There are no masks, perceptual tolerances, or snapshot
update commands. Failure reports include reference, candidate, difference, and trace.

Playwright 1.57.0 pins Chromium 143.0.7499.4 and the corresponding WebKit revision
(macOS WebKit 26.0). Baselines are always captured in the same run and environment
as the candidate. CI uses the versioned Playwright Ubuntu Noble container. Compare
each engine with itself; screenshots from macOS and Linux are not interchangeable.

External font/CSS responses are recorded in `fixtures/vendor/manifest.json` and
replayed identically for the reference in both engines. Resource byte hashes and
original URLs are preserved by the fixture files. Analytics is stubbed in tests
only, to avoid reporting automated visits and introducing third-party timing noise.
The deployed analytics configuration is retained.

Stable captures wait for fonts, image decoding, component/publication readiness,
and settled scrolling. Stable-state captures finish finite animations through the browser API, including finish callbacks.
Motion captures pause actual CSS/Web Animations at 0/25/50/75/100 percent using
their original durations and easing. Deferred rAF-created animations are included. Motion trajectories run sequentially in a single foreground page, without a preceding full-page screenshot that would resize the viewport.
The page's own CSS, colors, geometry, and rendered regions are not replaced.
`functional.spec.mjs` separately checks visible interaction outcomes without
claiming animation keyframe equivalence: mouse attraction, portrait/name labels,
disclosures, sticky navigation, theme persistence/system preference, reduced
motion, research filters and the misc gate.

Environment changes require another A/A run, not a relaxed image threshold.

Every capture must first produce two consecutive identical decoded RGBA images.
This is a synchronization condition, not a relaxed comparison: reference and
candidate still require exactly zero changed pixels, including alpha and antialiasing.

## Current acceptance status

Steady states pass the complete 92-case candidate matrix and content/link contracts
pass all 12 cases. Interaction A/A is still unstable; candidate interaction failures
therefore remain unclassified, not accepted as harmless noise. See
`reports/cleanup.md` and its saved A/A images. The user subsequently accepted the
practical stopping point and authorized publication. The normal release gate
checks builds, unit/resource checks and functional outcomes; full A/A
and animation comparisons remain available as an explicit `strict` workflow input.
Do not add masks or update the frozen reference to make either check green.
The Linux container is pinned by digest in `scripts/container.mjs` and the workflow.
