# CrashFactory — project website

Static project page for the paper **CrashFactory: From Crash Databases to Scalable
Safety-Critical Data Synthesis for End-to-End Autonomous Driving** (preprint,
[SSRN 7288377](https://ssrn.com/abstract=7288377)).

**Live at https://haoweili1.github.io/CrashFactory/**

This repository holds the **website source and the reviewed synthetic media it displays**
— generated sensor videos, bird's-eye simulation renders and the framework figure, all
produced by the authors. It contains **no research code, no crash-database records and no
simulation pipeline**. No official report identifiers, precise coordinates, exact
timestamps or injury records are published here. Release of the research code and the
underlying data is tracked separately in [TODO.md](TODO.md).

## Stack

Vite + React 18 + TypeScript, no CSS framework and no map SDK. The page is fully
static: there is no backend, no API call and no model inference at runtime.

## Develop

```bash
npm ci
npm run dev        # http://localhost:5173/CrashFactory/
npm run typecheck
npm run build      # type-checks, then emits dist/
npm run preview
```

The site is served from a project subpath. `vite.config.ts` defaults `base` to
`/CrashFactory/`; override it for another host:

```bash
SITE_BASE=/ npm run build
```

## Content model

All paper-derived text and numbers live in [`src/content/paper.ts`](src/content/paper.ts).
That file is the single source of truth: every figure on the page is **reported by the
paper**, not measured by this site. Do not add a value there without checking the PDF.

Curated media is described by `public/data/cases.json`, which is **generated** — never
edit it by hand. It ships with an empty case list until media has passed review.

```jsonc
{
  "manifest_version": "1",
  "attributions": ["Map data © OpenStreetMap contributors (ODbL)"],
  "cases": [{ "id": "...", "title": "...", "source": "MTCF", "summary": "...",
              "media": [{ "kind": "rgb", "label": "...", "src": "media/.../rgb.mp4" }] }],
  "teaser":    { "media": { "kind": "surround_sixup", "...": "..." } },
  "framework": { "media": { "kind": "figure", "...": "..." } }
}
```

`kind` is deliberately explicit, because a rendering **input** must never read as a
generated **output**:

| `kind` | Meaning |
| --- | --- |
| `bev` | Bird's-eye reconstruction of the simulated scenario |
| `rgb` | Generated sensor video |
| `surround_sixup` | Six synchronized views composited into one grid for display |
| `hdmap_condition` | HD-map conditioning input — not generated imagery |
| `trajectory`, `map`, `figure`, `image` | Stills |

## Media preparation

`scripts/prepare_assets.py` derives every published media file from unmodified sources.

```bash
python3 scripts/prepare_assets.py --manifest /path/assets.manifest.json --check-only
python3 scripts/prepare_assets.py --manifest /path/assets.manifest.json
```

It verifies each source by SHA-256 *before* reading it, refuses to run if any hash
differs, writes only under `public/`, re-hashes every source afterwards to prove
nothing was modified, and enforces the size budget.

**Requirements:** `ffmpeg` and `ffprobe` built with **`libx264`** (video and poster
frames) and **`libwebp`** (still images). The tool checks for both during preflight and
refuses to start if either is missing, so a partial run cannot happen. Some environment
ffmpeg builds — notably conda-forge ffmpeg 4.4.2 — ship without `libwebp`; select a build
that has it for the run:

```bash
PATH=/usr/bin:$PATH python3 scripts/prepare_assets.py --manifest ...
```

The input manifest is private and is never published: it holds source paths and
lineage. Only sanitized fields reach `public/data/cases.json`.

## Deploy

The site is deployed and live at https://haoweili1.github.io/CrashFactory/.

`.github/workflows/deploy.yml` builds on every push to `main` and publishes to GitHub
Pages. The Pages build type is `workflow` and HTTPS is enforced. `public/.nojekyll` keeps
Pages from post-processing the build, and navigation is anchor-based, so no SPA fallback
is required.

The site is served from a project subpath, so `base` must match the repository name.
`vite.config.ts` defaults it to `/CrashFactory/`; override with `SITE_BASE` if the
repository is ever renamed or the site is hosted elsewhere.

## Credits

Map-derived imagery: © OpenStreetMap contributors (ODbL). Attribution for each media
item travels with it in `cases.json` and is rendered in the page footer.
