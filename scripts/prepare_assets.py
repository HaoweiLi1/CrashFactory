#!/usr/bin/env python3
"""Derive reviewed website media from unmodified source assets.

Reads a PRIVATE manifest (never published), verifies every source by SHA-256
before reading it, writes derivatives only under public/, and emits the public
data contract public/data/cases.json plus a private derivation log.

Guarantees:
  * sources are opened read-only and re-hashed at the end of the run;
  * destinations are validated to stay inside public/;
  * nothing is written unless every source hash matches;
  * private fields never reach the public JSON.

Usage:
    python3 scripts/prepare_assets.py --manifest /path/assets.manifest.json
    python3 scripts/prepare_assets.py --manifest ... --check-only
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

SITE_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = SITE_ROOT / "public"

VIDEO_EXT = {".mp4", ".webm"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp"}

PUBLIC_MEDIA_FIELDS = (
    "kind", "label", "src", "poster", "width", "height",
    "fps", "duration", "bytes", "sha256", "attribution",
)
PUBLIC_CASE_FIELDS = ("id", "title", "source", "summary", "tags", "paperPanel")

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_TOTAL_BYTES = 50 * 1024 * 1024


class ManifestError(RuntimeError):
    """Raised for any manifest or verification failure. Aborts the whole run."""


# --------------------------------------------------------------------------- utils


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def stderr_tail(text: str, lines: int = 14, limit: int = 1400) -> str:
    """Keep the END of ffmpeg stderr.

    ffmpeg prints its build configuration first, so truncating from the front
    discards the actual error. Banners are suppressed with -hide_banner, but
    tailing keeps real errors visible even when they are not.
    """
    kept = [ln for ln in text.strip().splitlines() if ln.strip()]
    return "\n".join(kept[-lines:])[-limit:]


def run(cmd: list[str]) -> None:
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise ManifestError(
            f"command failed (exit {proc.returncode}): {' '.join(cmd[:5])} ...\n"
            f"{stderr_tail(proc.stderr)}"
        )


def ffprobe(path: Path) -> dict[str, Any]:
    proc = subprocess.run(
        ["ffprobe", "-hide_banner", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate,nb_frames,duration",
         "-show_entries", "format=duration",
         "-of", "json", str(path)],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise ManifestError(f"ffprobe failed on {path}:\n{stderr_tail(proc.stderr)}")
    raw = json.loads(proc.stdout)
    stream = (raw.get("streams") or [{}])[0]
    out: dict[str, Any] = {}
    if stream.get("width"):
        out["width"] = int(stream["width"])
    if stream.get("height"):
        out["height"] = int(stream["height"])
    rate = stream.get("r_frame_rate")
    if rate and "/" in rate:
        num, den = rate.split("/")
        if float(den) != 0:
            fps = float(num) / float(den)
            out["fps"] = round(fps, 3) if fps % 1 else int(fps)
    if stream.get("nb_frames"):
        out["frames"] = int(stream["nb_frames"])
    duration = stream.get("duration") or (raw.get("format") or {}).get("duration")
    if duration:
        out["duration"] = round(float(duration), 3)
    return out


def require_tool(name: str) -> None:
    if shutil.which(name) is None:
        raise ManifestError(f"required tool not found on PATH: {name}")


def available_encoders() -> set[str]:
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-encoders"],
        capture_output=True, text=True,
    )
    if proc.returncode != 0:
        raise ManifestError(f"could not list ffmpeg encoders:\n{stderr_tail(proc.stderr)}")
    found: set[str] = set()
    for line in proc.stdout.splitlines():
        parts = line.split()
        # Rows look like: " V....D libx264   libx264 H.264 ..."
        if len(parts) >= 2 and len(parts[0]) == 6 and parts[0][0] in "VAS":
            found.add(parts[1])
    return found


def require_encoders(needed: set[str]) -> None:
    """Fail before writing anything if the selected ffmpeg lacks an encoder.

    A conda ffmpeg build without libwebp will otherwise produce most outputs and
    then die partway through, which is the worst possible failure mode here.
    """
    have = available_encoders()
    missing = sorted(needed - have)
    if missing:
        which = shutil.which("ffmpeg")
        raise ManifestError(
            f"ffmpeg at {which} lacks required encoder(s): {', '.join(missing)}.\n"
            f"Select an ffmpeg build that provides them, e.g. "
            f"PATH=/usr/bin:$PATH python3 scripts/prepare_assets.py ..."
        )


# --------------------------------------------------------------------------- model


@dataclass
class Job:
    kind: str
    label: str
    source: Path
    expected_sha: str
    destination: str          # relative to public/
    spec: dict[str, Any]
    owner: str                # case id, or "teaser" / "framework"
    attribution: str | None = None
    log: dict[str, Any] = field(default_factory=dict)


def resolve_source(rel: str, source_root: Path) -> Path:
    """Resolve a manifest source path safely.

    Rejects absolute paths and '..', checks every path component for a symlink
    *before* resolving (checking after .resolve() would already have followed
    them), and enforces containment inside source_root.
    """
    candidate = Path(rel)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise ManifestError(f"source must be relative without '..': {rel!r}")

    walked = source_root
    for part in candidate.parts:
        walked = walked / part
        if walked.is_symlink():
            raise ManifestError(f"source path component is a symlink: {walked}")
        if not walked.exists():
            raise ManifestError(f"source not found: {walked}")

    resolved = walked.resolve()
    try:
        resolved.relative_to(source_root.resolve())
    except ValueError as exc:
        raise ManifestError(f"source escapes source_root: {rel!r}") from exc
    if not resolved.is_file():
        raise ManifestError(f"source is not a regular file: {resolved}")
    return resolved


def poster_destination(destination: str) -> str:
    return str(Path(destination).with_suffix(".jpg"))


def resolve_destination(destination: str) -> Path:
    if not destination or destination.startswith("/") or ".." in Path(destination).parts:
        raise ManifestError(f"destination must be a relative path without '..': {destination!r}")
    out = (PUBLIC_DIR / destination).resolve()
    try:
        out.relative_to(PUBLIC_DIR.resolve())
    except ValueError as exc:
        raise ManifestError(f"destination escapes public/: {destination!r}") from exc
    return out


def validate_crop(crop: Any, src_w: int | None, src_h: int | None) -> tuple[int, int, int, int]:
    if not isinstance(crop, dict):
        raise ManifestError("crop must be an object {width,height,x,y}")
    missing = [k for k in ("width", "height", "x", "y") if k not in crop]
    if missing:
        raise ManifestError(f"crop missing keys: {missing}")
    vals = {}
    for k in ("width", "height", "x", "y"):
        v = crop[k]
        if not isinstance(v, int) or isinstance(v, bool):
            raise ManifestError(f"crop.{k} must be an integer, got {v!r}")
        if v < 0:
            raise ManifestError(f"crop.{k} must be >= 0, got {v}")
        vals[k] = v
    if vals["width"] == 0 or vals["height"] == 0:
        raise ManifestError("crop width/height must be > 0")
    if src_w is not None and vals["x"] + vals["width"] > src_w:
        raise ManifestError(
            f"crop x+width ({vals['x']}+{vals['width']}) exceeds source width {src_w}"
        )
    if src_h is not None and vals["y"] + vals["height"] > src_h:
        raise ManifestError(
            f"crop y+height ({vals['y']}+{vals['height']}) exceeds source height {src_h}"
        )
    return vals["width"], vals["height"], vals["x"], vals["y"]


# --------------------------------------------------------------------------- derive


def build_vf_chain(spec: dict[str, Any], probe: dict[str, Any]) -> list[str]:
    """crop runs BEFORE scale, per the agreed manifest semantics."""
    chain: list[str] = []
    if "crop" in spec:
        w, h, x, y = validate_crop(spec["crop"], probe.get("width"), probe.get("height"))
        chain.append(f"crop={w}:{h}:{x}:{y}")
    if spec.get("width"):
        width = int(spec["width"])
        if width <= 0 or width % 2:
            raise ManifestError(f"scale width must be a positive even integer, got {width}")
        chain.append(f"scale={width}:-2:flags=lanczos")
    chain.append("format=yuv420p")
    return chain


def derive_video(job: Job, probe: dict[str, Any]) -> list[str]:
    out = resolve_destination(job.destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    crf = str(int(job.spec.get("crf", 24)))
    vf = ",".join(build_vf_chain(job.spec, probe))
    cmd = [
        "ffmpeg", "-hide_banner", "-y", "-nostdin", "-i", str(job.source),
        "-an", "-vf", vf,
        "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
        "-crf", crf, "-preset", "slow",
        "-movflags", "+faststart",
        str(out),
    ]
    run(cmd)
    return cmd


def derive_sixup(job: Job, probe: dict[str, Any]) -> list[str]:
    """Composite 6 contiguous equal-length segments into a labelled 3x2 grid.

    All tiles are taken at the SAME within-segment frame index, so the grid is a
    true simultaneous six-up rather than a sequential montage.
    """
    seg = int(job.spec.get("segment_frames", 0))
    if seg <= 0:
        raise ManifestError("surround_sixup requires a positive segment_frames")
    frames = probe.get("frames")
    if frames is None:
        raise ManifestError("could not determine source frame count for surround_sixup")
    if frames != seg * 6:
        raise ManifestError(
            f"surround_sixup expects {seg * 6} frames (6 x {seg}), source has {frames}"
        )

    order = job.spec.get("order", [1, 0, 2, 4, 3, 5])
    if sorted(order) != [0, 1, 2, 3, 4, 5]:
        raise ManifestError(f"order must be a permutation of 0..5, got {order}")
    labels = job.spec.get(
        "view_labels",
        ["Front left", "Front", "Front right", "Rear left", "Rear", "Rear right"],
    )
    if len(labels) != 6:
        raise ManifestError("view_labels must have exactly 6 entries")

    fps = job.spec.get("fps") or probe.get("fps") or 24

    # Tiles are scaled to their FINAL size before labels are drawn, so the label
    # is rendered at output resolution instead of being shrunk with the tile.
    target_width = job.spec.get("width")
    tile_w: int | None = None
    if target_width:
        target_width = int(target_width)
        if target_width <= 0 or target_width % 6:
            raise ManifestError(
                f"surround_sixup width must be a positive multiple of 6, got {target_width}"
            )
        tile_w = target_width // 3
        if tile_w % 2:
            raise ManifestError(f"derived tile width must be even, got {tile_w}")
    font_size = max(14, round((tile_w or probe.get("width") or 1024) * 0.045))
    pad = max(8, round(font_size * 0.55))

    out = resolve_destination(job.destination)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Split into six segment files, then tile. Split is lossless-by-frame-count
    # via select on frame index.
    with tempfile.TemporaryDirectory(prefix="sixup-") as tmp:
        tmpdir = Path(tmp)
        parts: list[Path] = []
        for idx in range(6):
            start, end = idx * seg, (idx + 1) * seg
            part = tmpdir / f"seg{idx}.mp4"
            run([
                "ffmpeg", "-hide_banner", "-y", "-nostdin", "-i", str(job.source),
                "-an",
                "-vf", f"select='between(n,{start},{end - 1})',setpts=N/{fps}/TB",
                "-vsync", "0", "-r", str(fps),
                "-c:v", "libx264", "-crf", "16", "-preset", "fast",
                "-pix_fmt", "yuv420p", str(part),
            ])
            parts.append(part)

        inputs: list[str] = []
        for pos in order:
            inputs += ["-i", str(parts[pos])]

        # Per-tile label, then a 3x2 grid.
        fontfile = _find_font()
        filters = []
        for i in range(6):
            text = labels[i].replace(":", r"\:").replace("'", "")
            chain = []
            if tile_w:
                chain.append(f"scale={tile_w}:-2:flags=lanczos")
            drawtext = (
                f"drawtext=text='{text}':x={pad}:y={pad}:fontsize={font_size}:"
                f"fontcolor=white:box=1:boxcolor=black@0.55:boxborderw={max(4, pad // 2)}"
            )
            if fontfile:
                drawtext += f":fontfile={fontfile}"
            chain.append(drawtext)
            filters.append(f"[{i}:v]{','.join(chain)}[t{i}]")
        filters.append(
            "[t0][t1][t2][t3][t4][t5]xstack=inputs=6:"
            "layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0[v]"
        )
        cmd = [
            "ffmpeg", "-hide_banner", "-y", "-nostdin", *inputs,
            "-filter_complex", ";".join(filters),
            "-map", "[v]", "-an",
            "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
            "-crf", str(int(job.spec.get("crf", 22))), "-preset", "slow",
            "-movflags", "+faststart", "-r", str(fps),
            str(out),
        ]
        run(cmd)
        return cmd


def _find_font() -> str | None:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ):
        if Path(candidate).is_file():
            return candidate
    return None


def derive_image(job: Job) -> list[str]:
    out = resolve_destination(job.destination)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix.lower() != ".webp":
        raise ManifestError(f"image destinations must be .webp, got {out.name}")
    vf = []
    if "crop" in job.spec:
        w, h, x, y = validate_crop(job.spec["crop"], None, None)
        vf.append(f"crop={w}:{h}:{x}:{y}")
    if job.spec.get("width"):
        vf.append(f"scale={int(job.spec['width'])}:-1:flags=lanczos")
    cmd = ["ffmpeg", "-hide_banner", "-y", "-nostdin", "-i", str(job.source)]
    if vf:
        cmd += ["-vf", ",".join(vf)]
    cmd += ["-quality", str(int(job.spec.get("quality", 82))), str(out)]
    run(cmd)
    return cmd


def derive_poster(job: Job, probe: dict[str, Any]) -> tuple[str, list[str]] | None:
    if not job.spec.get("poster"):
        return None
    out = resolve_destination(job.destination)
    poster_rel = str(Path(job.destination).with_suffix(".jpg"))
    poster_out = resolve_destination(poster_rel)
    duration = probe.get("duration") or 1.0
    at = float(job.spec.get("poster_time", round(duration * 0.1, 3)))
    cmd = [
        "ffmpeg", "-hide_banner", "-y", "-nostdin", "-ss", str(at), "-i", str(out),
        "-frames:v", "1", "-q:v", "3", str(poster_out),
    ]
    run(cmd)
    return poster_rel, cmd


# --------------------------------------------------------------------------- main


def collect_jobs(manifest: dict[str, Any], source_root: Path) -> list[Job]:
    jobs: list[Job] = []

    def add(owner: str, media: dict[str, Any]) -> None:
        for key in ("kind", "label", "source", "sha256", "destination"):
            if key not in media:
                raise ManifestError(f"[{owner}] media missing required field {key!r}")
        try:
            src = resolve_source(media["source"], source_root)
        except ManifestError as exc:
            raise ManifestError(f"[{owner}] {exc}") from exc
        jobs.append(Job(
            kind=media["kind"],
            label=media["label"],
            source=src,
            expected_sha=media["sha256"],
            destination=media["destination"],
            spec=media,
            owner=owner,
            attribution=media.get("attribution"),
        ))

    for case in manifest.get("cases", []):
        if "id" not in case:
            raise ManifestError("every case needs an id")
        for media in case.get("media", []):
            add(case["id"], media)

    # Standalone slots accept either a top-level key or the `standalone` array.
    for slot in ("teaser", "framework"):
        entry = manifest.get(slot)
        if entry:
            add(slot, entry["media"] if "media" in entry else entry)

    seen = {j.owner for j in jobs}
    for item in manifest.get("standalone", []):
        slot = item.get("slot")
        if slot not in ("teaser", "framework"):
            raise ManifestError(f"unknown standalone slot: {slot!r}")
        if slot in seen:
            raise ManifestError(f"slot {slot!r} defined twice")
        seen.add(slot)
        add(slot, item["media"])

    return jobs


def resolve_attribution(value: str | None, defaults: dict[str, str]) -> str | None:
    if not value:
        return None
    return defaults.get(value, value)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", required=True, type=Path, help="private manifest path")
    ap.add_argument("--check-only", action="store_true", help="verify sources and exit without writing")
    ap.add_argument("--force", action="store_true", help="overwrite existing destinations")
    ap.add_argument("--allow-oversize", action="store_true", help="bypass the total size budget")
    ap.add_argument("--log", type=Path, help="private derivation log (default: beside the manifest)")
    args = ap.parse_args()

    try:
        for tool in ("ffmpeg", "ffprobe"):
            require_tool(tool)

        manifest = json.loads(args.manifest.read_text())
        source_root = Path(manifest.get("source_root", "/")).resolve()
        defaults = manifest.get("attribution_defaults", {})
        jobs = collect_jobs(manifest, source_root)
        if not jobs:
            raise ManifestError("manifest contains no media")

        # ---- gate 1: every source hash must match before anything is written.
        print(f"verifying {len(jobs)} source files...")
        start_hashes: dict[Path, str] = {}
        for job in jobs:
            actual = sha256_of(job.source)
            start_hashes[job.source] = actual
            if actual != job.expected_sha:
                raise ManifestError(
                    f"[{job.owner}] SHA-256 mismatch for {job.source}\n"
                    f"  manifest: {job.expected_sha}\n  actual:   {actual}"
                )
            print(f"  ok  {job.owner:<28} {job.source.name}")

        # ---- gate 2: destination preflight. Runs in BOTH modes so --check-only
        # answers "would this bake succeed?", not just "do the sources match?".
        print("\nchecking destinations...")
        source_paths = {job.source for job in jobs}
        claimed: dict[str, str] = {}
        planned: list[tuple[Job, Path, Path | None]] = []

        for job in jobs:
            out = resolve_destination(job.destination)
            poster_rel = (
                poster_destination(job.destination) if job.spec.get("poster") else None
            )
            poster_out = resolve_destination(poster_rel) if poster_rel else None

            for rel, path in ((job.destination, out), (poster_rel, poster_out)):
                if rel is None or path is None:
                    continue
                if rel in claimed:
                    raise ManifestError(
                        f"duplicate output {rel!r} claimed by {claimed[rel]!r} and {job.owner!r}"
                    )
                claimed[rel] = job.owner
                if path in source_paths:
                    raise ManifestError(f"[{job.owner}] output would overwrite a source: {path}")
                if path.exists() and not args.force:
                    raise ManifestError(f"destination exists (use --force): {rel}")
            planned.append((job, out, poster_out))

        print(f"  ok  {len(claimed)} distinct outputs, no collisions with sources")

        needed: set[str] = set()
        for job in jobs:
            out_suffix = Path(job.destination).suffix.lower()
            if out_suffix in VIDEO_EXT or job.spec.get("poster"):
                needed.add("libx264")
            if out_suffix == ".webp":
                needed.add("libwebp")
        if needed:
            require_encoders(needed)
            print(f"  ok  ffmpeg provides {', '.join(sorted(needed))}")

        if args.check_only:
            print("\ncheck-only: sources and destinations verified, nothing written.")
            return 0

        # ---- derive
        public_media: dict[str, list[dict[str, Any]]] = {}
        log_entries: list[dict[str, Any]] = []
        total = 0

        for job in jobs:
            probe = ffprobe(job.source) if job.source.suffix.lower() in VIDEO_EXT else {}
            print(f"deriving {job.owner} -> {job.destination}")

            if job.kind == "surround_sixup":
                cmd = derive_sixup(job, probe)
            elif job.source.suffix.lower() in VIDEO_EXT:
                cmd = derive_video(job, probe)
            elif job.source.suffix.lower() in IMAGE_EXT:
                cmd = derive_image(job)
            else:
                raise ManifestError(f"[{job.owner}] unsupported source type: {job.source.suffix}")

            out = resolve_destination(job.destination)
            out_probe = ffprobe(out) if out.suffix.lower() in VIDEO_EXT else _image_dims(out)
            size = out.stat().st_size
            total += size
            if size > MAX_FILE_BYTES:
                print(f"  WARNING: {job.destination} is {size / 1e6:.2f} MB (> 5 MB)")

            entry: dict[str, Any] = {
                "kind": job.kind,
                "label": job.label,
                "src": job.destination,
                "bytes": size,
                "sha256": sha256_of(out),
            }
            entry.update({k: v for k, v in out_probe.items() if k != "frames"})
            attribution = resolve_attribution(job.attribution, defaults)
            if attribution:
                entry["attribution"] = attribution

            poster = derive_poster(job, out_probe)
            if poster:
                entry["poster"] = poster[0]
                poster_size = resolve_destination(poster[0]).stat().st_size
                total += poster_size
                if poster_size > MAX_FILE_BYTES:
                    print(f"  WARNING: {poster[0]} is {poster_size / 1e6:.2f} MB (> 5 MB)")

            public_media.setdefault(job.owner, []).append(
                {k: v for k, v in entry.items() if k in PUBLIC_MEDIA_FIELDS}
            )
            log_entries.append({
                "owner": job.owner,
                "source": str(job.source),
                "source_sha256": job.expected_sha,
                "destination": job.destination,
                "command": cmd,
                "poster_command": poster[1] if poster else None,
                "output": entry,
                "source_probe": probe,
            })

        if total > MAX_TOTAL_BYTES and not args.allow_oversize:
            raise ManifestError(
                f"total media {total / 1e6:.1f} MB exceeds the 50 MB budget "
                f"(use --allow-oversize to override)"
            )

        # ---- gate 2: sources must be byte-identical to how we found them.
        print("\nre-verifying sources are untouched...")
        for path, before in start_hashes.items():
            after = sha256_of(path)
            if after != before:
                raise ManifestError(f"SOURCE MUTATED during run: {path}")
        print(f"  ok  {len(start_hashes)} sources unchanged")

        # ---- public contract
        public: dict[str, Any] = {
            "manifest_version": manifest.get("manifest_version", "1"),
            "generated_utc": manifest.get("generated_utc"),
            "attributions": sorted({
                m["attribution"]
                for items in public_media.values()
                for m in items
                if m.get("attribution")
            }),
            "cases": [],
        }
        for case in manifest.get("cases", []):
            entry = {k: case[k] for k in PUBLIC_CASE_FIELDS if k in case}
            entry["media"] = public_media.get(case["id"], [])
            public["cases"].append(entry)
        for slot in ("teaser", "framework"):
            if slot in public_media:
                public[slot] = {"media": public_media[slot][0]}

        data_out = PUBLIC_DIR / "data" / "cases.json"
        data_out.parent.mkdir(parents=True, exist_ok=True)
        data_out.write_text(json.dumps(public, indent=2) + "\n")

        log_path = args.log or args.manifest.with_name("derivation.log.json")
        log_path.write_text(json.dumps({
            "generated_utc": manifest.get("generated_utc"),
            "source_root": str(source_root),
            "total_bytes": total,
            "items": log_entries,
        }, indent=2) + "\n")

        print(f"\nwrote {data_out.relative_to(SITE_ROOT)}  ({total / 1e6:.2f} MB of media)")
        print(f"wrote private log {log_path}")
        return 0

    except ManifestError as exc:
        print(f"\nERROR: {exc}", file=sys.stderr)
        return 1


def _image_dims(path: Path) -> dict[str, Any]:
    try:
        return {k: v for k, v in ffprobe(path).items() if k in ("width", "height")}
    except ManifestError:
        return {}


if __name__ == "__main__":
    raise SystemExit(main())
