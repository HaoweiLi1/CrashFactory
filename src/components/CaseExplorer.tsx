import { useEffect, useMemo, useState } from 'react';
import FramePlayer from './FramePlayer';
import { type CaseEntry, type MediaItem, type MediaKind } from '../types';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, '')}`;

const SENSOR_KINDS: MediaKind[] = ['rgb', 'surround_sixup'];

type Mode = 'sensor' | 'behavior';

const isSensor = (m: MediaItem) => SENSOR_KINDS.includes(m.kind);
const isBehavior = (m: MediaItem) => m.kind === 'bev';

function pick(entry: CaseEntry, mode: Mode): MediaItem | undefined {
  return entry.media.find(mode === 'sensor' ? isSensor : isBehavior);
}

/** Sensor footage leads when a case has it; otherwise the reconstruction does. */
function defaultMode(entry: CaseEntry): Mode {
  return entry.media.some(isSensor) ? 'sensor' : 'behavior';
}

/** Thumbnail for the rail: the poster of whichever clip leads this case. */
function thumbOf(entry: CaseEntry): string | undefined {
  const lead = pick(entry, defaultMode(entry)) ?? entry.media[0];
  return lead?.poster;
}

export default function CaseExplorer({ cases }: { cases: CaseEntry[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(cases[0]?.id ?? null);
  const [mode, setMode] = useState<Mode>('sensor');

  const selected = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? cases[0],
    [cases, selectedId],
  );

  // Selecting a case resets the mode to that case's lead, so a BEV-only case
  // never lands on an empty sensor tab.
  useEffect(() => {
    if (selected) setMode(defaultMode(selected));
  }, [selected]);

  if (!cases.length || !selected) {
    return (
      <section id="gallery" aria-labelledby="gallery-heading">
        <div className="shell">
          <p className="section-label">Examples</p>
          <h2 id="gallery-heading">Selected reconstructed scenarios</h2>
          <div className="empty-state">
            Curated examples are being prepared and will appear here once reviewed.
          </div>
        </div>
      </section>
    );
  }

  const hasSensor = selected.media.some(isSensor);
  const hasBehavior = selected.media.some(isBehavior);
  const current = pick(selected, mode) ?? selected.media[0];

  return (
    <section id="gallery" aria-labelledby="gallery-heading">
      <div className="shell">
        <p className="section-label">Examples</p>
        <h2 id="gallery-heading">Selected reconstructed scenarios</h2>
        <div className="prose">
          <p>
            Pick a scenario, then switch between the generated sensor footage and the
            bird&rsquo;s-eye reconstruction. The two are produced by different stages at
            different frame rates and run on independent timelines, so they are not
            synchronized with one another.
          </p>
        </div>

        <div className="rail" role="group" aria-label="Choose a scenario">
          {cases.map((c) => {
            const thumb = thumbOf(c);
            const isActive = c.id === selected.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={isActive}
                className={`rail-item${isActive ? ' is-active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span className="rail-thumb">
                  {thumb ? (
                    <img src={asset(thumb)} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="rail-thumb-blank" />
                  )}
                  {/* Sparse BEV renders read as blank at thumbnail size, so the
                      media type is labelled rather than left ambiguous. */}
                  <span className="rail-kind">
                    {defaultMode(c) === 'sensor' ? 'Sensor' : 'BEV'}
                  </span>
                </span>
                <span className="rail-label">{c.title}</span>
                <span className="rail-source">{c.source}</span>
              </button>
            );
          })}
        </div>

        <div className="stage-head">
          <div>
            <h3 className="stage-title">{selected.title}</h3>
            <p className="stage-summary">{selected.summary}</p>
          </div>
          {(hasSensor || hasBehavior) && (
            <div className="filters" role="group" aria-label="Choose what to show">
              {hasSensor && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={mode === 'sensor'}
                  onClick={() => setMode('sensor')}
                >
                  Sensor video
                </button>
              )}
              {hasBehavior && (
                <button
                  type="button"
                  className="chip"
                  aria-pressed={mode === 'behavior'}
                  onClick={() => setMode('behavior')}
                >
                  Behavior (BEV)
                </button>
              )}
            </div>
          )}
        </div>

        {current && (
          <FramePlayer
            key={current.src}
            item={current}
            meta={[selected.source, selected.paperPanel].filter(Boolean).join(' · ')}
          />
        )}

        {selected.tags && selected.tags.length > 0 && (
          <ul className="tags">
            {selected.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
