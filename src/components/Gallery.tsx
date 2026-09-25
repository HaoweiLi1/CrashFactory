import { useMemo, useState } from 'react';
import MediaFigure from './MediaFigure';
import { MEDIA_KIND_INFO, type CaseEntry, type MediaKind } from '../types';

/** Preferred default preview: generated sensor video first, then reconstruction. */
const PREVIEW_ORDER: MediaKind[] = [
  'rgb', 'surround_sixup', 'bev', 'trajectory', 'map', 'image', 'figure', 'hdmap_condition',
];

/** Generated sensor output only. `hdmap_condition` is a rendering input, not generated media. */
const SENSOR_KINDS: MediaKind[] = ['rgb', 'surround_sixup'];

type TypeFilter = 'all' | 'sensor' | 'bev';

function defaultMediaIndex(c: CaseEntry) {
  for (const kind of PREVIEW_ORDER) {
    const i = c.media.findIndex((m) => m.kind === kind);
    if (i >= 0) return i;
  }
  return 0;
}

function CaseCard({ entry }: { entry: CaseEntry }) {
  const [active, setActive] = useState(() => defaultMediaIndex(entry));
  const current = entry.media[active];
  const groupLabel = `Media views for ${entry.title}`;

  return (
    <article className="case" aria-labelledby={`case-${entry.id}`}>
      <div className="case-body">
        <div className="case-meta">
          <span className="case-source">{entry.source}</span>
          {entry.paperPanel && <span>{entry.paperPanel}</span>}
        </div>
        <h3 id={`case-${entry.id}`}>{entry.title}</h3>
        <p>{entry.summary}</p>
        {entry.tags && entry.tags.length > 0 && (
          <ul className="tags">
            {entry.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        {entry.media.length > 0 && (
          <div className="case-media-list">
            {entry.media.length > 1 && (
              <div className="filters filters-inline" role="group" aria-label={groupLabel}>
                {entry.media.map((m, i) => (
                  <button
                    key={`${m.kind}-${i}`}
                    type="button"
                    className="chip"
                    aria-pressed={i === active}
                    onClick={() => setActive(i)}
                  >
                    {MEDIA_KIND_INFO[m.kind].badge}
                  </button>
                ))}
              </div>
            )}
            {current && <MediaFigure item={current} />}
          </div>
        )}
      </div>
    </article>
  );
}

export default function Gallery({ cases }: { cases: CaseEntry[] }) {
  const [source, setSource] = useState<string>('all');
  const [type, setType] = useState<TypeFilter>('all');

  const sources = useMemo(
    () => Array.from(new Set(cases.map((c) => c.source))).sort(),
    [cases],
  );

  const hasSensor = (c: CaseEntry) => c.media.some((m) => SENSOR_KINDS.includes(m.kind));

  const matchesType = (c: CaseEntry) => {
    if (type === 'all') return true;
    if (type === 'sensor') return hasSensor(c);
    // "BEV only" means exactly that: a reconstruction with no generated sensor video.
    return c.media.some((m) => m.kind === 'bev') && !hasSensor(c);
  };

  const visible = useMemo(
    () => cases.filter((c) => (source === 'all' || c.source === source) && matchesType(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cases, source, type],
  );

  const hasFilters = cases.length > 0 && (sources.length > 1 || cases.some((c) => c.media.length > 1));

  return (
    <section id="gallery" aria-labelledby="gallery-heading">
      <div className="shell">
        <p className="section-label">Examples</p>
        <h2 id="gallery-heading">Selected reconstructed scenarios</h2>
        <div className="prose">
          <p>
            Each example shows the bird&rsquo;s-eye reconstruction and, where available, the
            generated sensor video. The two come from different stages and run at different
            frame rates, so they are not time-aligned with each other. Sensor videos are
            model-generated and carry generative artifacts, most visibly in signage text.
          </p>
        </div>

        {cases.length === 0 ? (
          <div className="empty-state">
            Curated examples are being prepared and will appear here once reviewed.
          </div>
        ) : (
          <>
            {hasFilters && (
              <div className="filter-bar">
                <div className="filters" role="group" aria-label="Filter by crash database">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={source === 'all'}
                    onClick={() => setSource('all')}
                  >
                    All sources
                  </button>
                  {sources.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      aria-pressed={source === s}
                      onClick={() => setSource(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="filters" role="group" aria-label="Filter by media type">
                  {(
                    [
                      ['all', 'All media'],
                      ['sensor', 'Sensor video'],
                      ['bev', 'BEV only'],
                    ] as [TypeFilter, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="chip"
                      aria-pressed={type === value}
                      onClick={() => setType(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="result-count" aria-live="polite">
              {visible.length} of {cases.length} examples shown
            </p>

            {visible.length === 0 ? (
              <div className="empty-state">
                No example matches both filters. Try “All sources” or “All media”.
              </div>
            ) : (
              <div className="case-grid">
                {visible.map((c) => (
                  <CaseCard entry={c} key={c.id} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
