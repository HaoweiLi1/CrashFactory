# TODO

Honest status of the CrashFactory website. Items are open unless marked done.

## Done

- [x] Static site: Vite + React 18 + TypeScript, configurable `base`, anchor navigation, light and dark themes.
- [x] Paper content locked to a single source of truth (`src/content/paper.ts`), every value checked against the preprint PDF.
- [x] Paper result tables re-typeset as accessible HTML rather than page crops.
- [x] `scripts/prepare_assets.py`: SHA-256 verified sources, encoder preflight, derivative-only writes, source re-verification, size budget.
- [x] Audited the downloaded dataset archive (`CrashDatasets.zip`, 5712 files) against the local working copy — byte-identical.
- [x] **Curated example set selected and reviewed**: 8 scenarios, plus the paper-matched surround-view clip and the framework figure.
- [x] **Media derivation complete**: 15 derived assets (14 videos + 1 figure) and 14 poster frames, 12.59 MB total. Every derived video decodes fully; all 15 source files verified unchanged afterwards.
- [x] Accessibility pass: contrast, keyboard reachability, labelled controls, focus outlines; checked at 1440×1000, 390×844 and 320×720.

## Pending deployment

- [ ] **Publish the public repository and enable the Pages workflow.** The site builds and has
      passed review; it is **not yet live**. The intended address is
      https://haoweili1.github.io/CrashFactory/ and will be confirmed only after deployment
      is verified.

## Open

- [ ] **Wider case curation.** The eight published examples are a showcase subset chosen for
      visual clarity, not a representative sample of the evaluated cohorts.
- [ ] **Additional sensing examples.** More generated sensor sequences, each subject to
      per-clip temporal-quality inspection before publication.
- [ ] **Further source audit.** The locally downloaded archive was audited. The Google Drive
      account itself has **not** been connected or audited; any additional material there
      remains an open item.
- [ ] **Research code release.** Not decided. The repository link on the site points at the
      *website source*; no research code or pipeline is published here.
- [ ] **Data release.** Not decided. No crash-database records are published on this site.
- [ ] Open Graph preview image.

## Scope notes

- Every metric on the site is **reported by the paper**. The site performs no evaluation and
  re-runs nothing; local inspection was used only to choose which media to show.
- Sensor videos are model-generated and carry generative artifacts, most visibly in signage
  text. Publishing a clip is not a claim that it reproduces its source crash faithfully.
- Bird's-eye and sensor views come from different stages at different frame rates and are
  not time-aligned with each other.
