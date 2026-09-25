import {
  headline,
  benchmarkNote,
  tableLaneCount,
  tableCollisionType,
  tableInjurySeverity,
  tableTrajectoryFidelity,
} from '../content/paper';

type Flat = {
  caption: string;
  note: string | null;
  columns: readonly string[];
  rows: readonly (readonly string[])[];
};

const isTotal = (label: string) => label.toLowerCase() === 'overall';

function FlatTable({ t }: { t: Flat }) {
  return (
    <div className="table-card">
      <table>
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            {t.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r[0]} className={isTotal(r[0]) ? 'is-total' : undefined}>
              <th scope="row">{r[0]}</th>
              {r.slice(1).map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {t.note && <p className="table-note">{t.note}</p>}
    </div>
  );
}

function LaneTable() {
  const t = tableLaneCount;
  return (
    <div className="table-card">
      <table>
        <caption>{t.caption}</caption>
        <thead>
          <tr>
            {t.columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {t.groups.map((g) => (
          <tbody key={g.name}>
            <tr className="row-group">
              <th scope="colgroup" colSpan={t.columns.length}>
                {g.name}
              </th>
            </tr>
            {g.rows.map((r) => (
              <tr key={`${g.name}-${r[0]}`} className={isTotal(r[0]) ? 'is-total' : undefined}>
                <th scope="row">{r[0]}</th>
                {r.slice(1).map((cell, i) => (
                  <td key={i}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      {t.note && <p className="table-note">{t.note}</p>}
    </div>
  );
}

export default function Results() {
  return (
    <section id="results" aria-labelledby="results-heading">
      <div className="shell">
        <p className="section-label">Results</p>
        <h2 id="results-heading">Reported evaluation</h2>
        <div className="headline-strip">
          {headline.map((h) => (
            <div className="headline-cell" key={`${h.value}-${h.context}`}>
              <div className="headline-value">{h.value}</div>
              <div className="headline-label">{h.label}</div>
              <div className="headline-context">{h.context}</div>
            </div>
          ))}
        </div>
        <p className="source-note">{benchmarkNote}</p>

        <div className="table-grid">
          <FlatTable t={tableCollisionType} />
          <FlatTable t={tableInjurySeverity} />
          <LaneTable />
          <FlatTable t={tableTrajectoryFidelity} />
        </div>
      </div>
    </section>
  );
}
