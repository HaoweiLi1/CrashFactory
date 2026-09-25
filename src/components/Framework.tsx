import { modules, setup } from '../content/paper';
import MediaFigure from './MediaFigure';
import type { MediaItem } from '../types';

export default function Framework({ media }: { media?: MediaItem }) {
  return (
    <section id="framework" aria-labelledby="framework-heading">
      <div className="shell">
        <p className="section-label">Framework</p>
        <h2 id="framework-heading">Four modules, one automated pipeline</h2>
        <div className="prose">
          <p>
            CrashFactory organizes the crash-to-simulation process into four functional
            modules. Each case is normalized, grounded in a reconstructed road scene,
            interpreted into pre-crash behavior, refined into crash-consistent dynamics,
            and finally rendered into synchronized sensor observations.
          </p>
        </div>

        {media && (
          <div className="teaser-wrap">
            <MediaFigure item={media} />
          </div>
        )}

        <ol className="module-grid module-row" style={{ listStyle: 'none', padding: 0 }}>
          {modules.map((m, i) => (
            <li className="module" key={m.id} id={m.id}>
              <div className="module-index">0{i + 1}</div>
              <h3>{m.name}</h3>
              <p>{m.summary}</p>
              <details>
                <summary>How it works</summary>
                <p>{m.detail}</p>
              </details>
            </li>
          ))}
        </ol>

        <dl className="setup-list">
          {setup.map((s) => (
            <div key={s.label}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
