import { MEDIA_KIND_INFO, isVideo, type MediaItem } from '../types';
import Attribution from './Attribution';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`;

/**
 * Renders one reviewed media item. The kind badge is always shown so a
 * conditioning input is never mistaken for generated output.
 */
export default function MediaFigure({ item }: { item: MediaItem }) {
  const info = MEDIA_KIND_INFO[item.kind];
  const ratio =
    item.width && item.height ? `${item.width} / ${item.height}` : undefined;

  return (
    <figure className="figure">
      {isVideo(item.src) ? (
        <video
          className="figure-frame"
          src={asset(item.src)}
          poster={item.poster ? asset(item.poster) : undefined}
          style={ratio ? { aspectRatio: ratio } : undefined}
          controls
          loop
          muted
          playsInline
          preload="metadata"
          aria-label={item.label}
        />
      ) : (
        <img
          className="figure-frame"
          src={asset(item.src)}
          width={item.width}
          height={item.height}
          alt={item.label}
          loading="lazy"
          decoding="async"
        />
      )}
      <figcaption>
        <span className="figure-badge">{info.badge}</span>
        <div>{item.label}</div>
        {info.note && <span className="figure-note">{info.note}</span>}
        {item.attribution && (
          <span className="figure-attrib">
            <Attribution text={item.attribution} />
          </span>
        )}
      </figcaption>
    </figure>
  );
}
