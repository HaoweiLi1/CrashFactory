import FramePlayer from './FramePlayer';
import type { MediaItem } from '../types';

/** Hidden entirely until a reviewed teaser clip exists in the manifest. */
export default function Teaser({ media }: { media?: MediaItem }) {
  if (!media) return null;
  return (
    <section id="teaser" aria-labelledby="teaser-heading">
      <div className="shell">
        <p className="section-label">Surround view</p>
        <h2 id="teaser-heading">Synchronized surround-view output</h2>
        {/* The caption sits under the player, as the reference project pages do,
            so real footage is reached sooner on small screens. */}
        <FramePlayer item={media} />
        <div className="prose prose-after">
          <p>
            Six synchronized camera views rendered from one reconstructed crash scenario,
            composited into a single grid for display.
          </p>
        </div>
      </div>
    </section>
  );
}
