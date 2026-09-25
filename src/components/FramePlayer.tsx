import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MEDIA_KIND_INFO, type MediaItem } from '../types';
import Attribution from './Attribution';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`;

/** Only one video on the page may play at a time, including across sections. */
function pauseOthers(current: HTMLVideoElement) {
  document.querySelectorAll('video').forEach((v) => {
    if (v !== current && !v.paused) v.pause();
  });
}

/** Total frames: exact from the manifest when present, otherwise derived. */
function totalFrames(item: MediaItem): number | null {
  if (typeof item.frames === 'number' && item.frames > 0) return item.frames;
  if (item.fps && item.duration) return Math.max(1, Math.round(item.duration * item.fps));
  return null;
}

/** Frame index at a given time. Epsilon absorbs float error at exact boundaries. */
function frameAt(time: number, fps: number, frames: number): number {
  const i = Math.floor(time * fps + 1e-6);
  return Math.min(Math.max(i, 0), frames - 1);
}

/** Seek to the MIDDLE of a frame so the decoder lands inside it, never on the edge. */
function timeOfFrame(index: number, fps: number, frames: number): number {
  const clamped = Math.min(Math.max(index, 0), frames - 1);
  return (clamped + 0.5) / fps;
}

interface Props {
  item: MediaItem;
  /** Short line under the player. */
  caption?: string;
  /** Extra context shown beside the kind badge. */
  meta?: string;
}

export default function FramePlayer({ item, caption, meta }: Props) {
  const inlineRef = useRef<HTMLVideoElement>(null);
  const modalRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const [enlarged, setEnlarged] = useState(false);
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(true);
  /**
   * Before the first play/seek/step the element paints its poster, which is a
   * chosen late frame — not frame 1. Until a real frame has been decoded we
   * must not label the view with a frame index.
   */
  const [hasFrame, setHasFrame] = useState(false);
  /**
   * Read inside effects that must NOT re-run when the value flips. Handover is
   * a closed -> open transition only: re-running it after the modal starts
   * playing would copy the inline element's stale time back over it.
   */
  const hasFrameRef = useRef(hasFrame);
  hasFrameRef.current = hasFrame;
  const [announcement, setAnnouncement] = useState('');

  const labelId = useId();
  const fps = item.fps ?? null;
  const frames = totalFrames(item);
  const steppable = fps !== null && frames !== null && frames > 1;

  const active = useCallback(
    () => (enlarged ? modalRef.current : inlineRef.current),
    [enlarged],
  );

  // Only one element is ever playing: the other is paused whenever we hand over.
  const handover = useCallback((from: HTMLVideoElement | null, to: HTMLVideoElement | null, carry: boolean) => {
    if (!to) return;
    to.pause();
    if (!from) return;
    from.pause();
    // Still on the poster: leave the target on its poster too, so enlarging and
    // closing preserve the same view instead of jumping to frame 0.
    if (!carry) return;
    const target = from.currentTime;
    if (!Number.isFinite(target)) return;
    if (to.readyState >= 1) {
      to.currentTime = target;
    } else {
      // A freshly mounted element may have no metadata yet; defer the seek.
      const apply = () => {
        to.currentTime = target;
        to.removeEventListener('loadedmetadata', apply);
      };
      to.addEventListener('loadedmetadata', apply);
    }
  }, []);

  const syncFrame = useCallback(() => {
    const v = active();
    if (!v || !steppable) return;
    setFrame(frameAt(v.currentTime, fps as number, frames as number));
  }, [active, fps, frames, steppable]);

  /** Any real playback or seek means a decoded frame is now on screen. */
  const markDecoded = useCallback(() => setHasFrame(true), []);

  const step = useCallback(
    (delta: number) => {
      const v = active();
      if (!v || !steppable) return;
      v.pause();
      // First step leaves the poster and lands on the real first frame.
      if (!hasFrame) {
        setHasFrame(true);
        v.currentTime = timeOfFrame(0, fps as number, frames as number);
        setFrame(0);
        setAnnouncement(`Frame 1 of ${frames}`);
        return;
      }
      const current = frameAt(v.currentTime, fps as number, frames as number);
      const next = Math.min(Math.max(current + delta, 0), (frames as number) - 1);
      v.currentTime = timeOfFrame(next, fps as number, frames as number);
      setFrame(next);
      // Announced only while paused, so playback never floods the live region.
      setAnnouncement(`Frame ${next + 1} of ${frames}`);
    },
    [active, fps, frames, steppable, hasFrame],
  );

  const openEnlarged = useCallback(() => {
    setEnlarged(true);
    setAnnouncement('');
  }, []);

  const closeEnlarged = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Open the dialog after the modal video exists, then carry the frame across.
  useEffect(() => {
    if (!enlarged) return;
    const dialog = dialogRef.current;
    // Already open: this is a re-render, not a new open. Do not hand over again.
    if (!dialog || dialog.open) return;
    dialog.showModal();
    handover(inlineRef.current, modalRef.current, hasFrameRef.current);
    if (hasFrameRef.current) syncFrame();
  }, [enlarged, handover, syncFrame]);

  // Native close (Escape, backdrop button) returns the frame and the focus.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      handover(modalRef.current, inlineRef.current, hasFrameRef.current);
      setEnlarged(false);
      setAnnouncement('');
      triggerRef.current?.focus();
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [handover]);

  // A new source means a new clip: reset and never leave the old one playing.
  useEffect(() => {
    inlineRef.current?.pause();
    modalRef.current?.pause();
    setFrame(0);
    setPaused(true);
    setHasFrame(false);
    setAnnouncement('');
  }, [item.src]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!steppable) return;
    if (event.key === ',' || event.key === '[') {
      event.preventDefault();
      step(-1);
    } else if (event.key === '.' || event.key === ']') {
      event.preventDefault();
      step(1);
    }
  };

  const info = MEDIA_KIND_INFO[item.kind];
  const ratio = item.width && item.height ? `${item.width} / ${item.height}` : undefined;
  const seconds = fps ? (frame / fps).toFixed(2) : null;

  const videoProps = {
    src: asset(item.src),
    poster: item.poster ? asset(item.poster) : undefined,
    controls: true,
    loop: false,
    muted: true,
    playsInline: true,
    preload: 'metadata' as const,
    onTimeUpdate: () => {
      const v = active();
      if (v && v.currentTime > 0) markDecoded();
      syncFrame();
    },
    onSeeked: () => {
      markDecoded();
      syncFrame();
    },
    onLoadedMetadata: syncFrame,
    onPlay: (event: React.SyntheticEvent<HTMLVideoElement>) => {
      pauseOthers(event.currentTarget);
      markDecoded();
      setPaused(false);
      setAnnouncement('');
    },
    onPause: () => {
      setPaused(true);
      syncFrame();
    },
  };

  const controls = (variant: 'inline' | 'modal') => (
    <div className="frame-bar">
      {steppable && (
        <div className="frame-steps">
          <button type="button" className="chip chip-icon" onClick={() => step(-1)} aria-label="Previous frame">
            ‹
          </button>
          <button type="button" className="chip chip-icon" onClick={() => step(1)} aria-label="Next frame">
            ›
          </button>
          <span className="frame-readout">
            {hasFrame ? (
              <>
                frame {frame + 1} / {frames}
                {seconds !== null && <> · {seconds}s</>}
                {!paused && <> · playing</>}
              </>
            ) : (
              <>Preview · {frames} frames</>
            )}
          </span>
        </div>
      )}
      <div className="frame-actions">
        {variant === 'inline' ? (
          <button type="button" className="chip" ref={triggerRef} onClick={openEnlarged}>
            Enlarge
          </button>
        ) : (
          <button type="button" className="chip" onClick={closeEnlarged}>
            Close
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="stage" onKeyDown={onKeyDown}>
      <figure className="figure figure-stage">
        <video
          {...videoProps}
          ref={inlineRef}
          className="figure-frame"
          style={ratio ? { aspectRatio: ratio } : undefined}
          aria-labelledby={labelId}
        />
        <figcaption id={labelId}>
          <span className="figure-badge">{info.badge}</span>
          {meta && <span className="figure-meta">{meta}</span>}
          {caption && <div>{caption}</div>}
          {info.note && <span className="figure-note">{info.note}</span>}
          {item.attribution && (
            <span className="figure-attrib">
              <Attribution text={item.attribution} />
            </span>
          )}
        </figcaption>
      </figure>

      {controls('inline')}
      {steppable && (
        <p className="frame-hint">
          Press <kbd>,</kbd> and <kbd>.</kbd> to step one frame while paused.
        </p>
      )}
      <span className="visually-hidden" aria-live="polite">
        {announcement}
      </span>

      <dialog ref={dialogRef} className="lightbox" aria-label={`${item.label}, enlarged`}>
        {enlarged && (
          <div className="lightbox-inner">
            <video
              {...videoProps}
              ref={modalRef}
              className="lightbox-video"
              style={ratio ? { aspectRatio: ratio } : undefined}
              aria-label={item.label}
            />
            {controls('modal')}
          </div>
        )}
      </dialog>
    </div>
  );
}
