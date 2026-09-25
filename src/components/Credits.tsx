import { paper } from '../content/paper';
import Attribution from './Attribution';

export default function Credits({ attributions }: { attributions: string[] }) {
  return (
    <footer id="credits">
      <div className="shell">
        <p>
          <strong style={{ color: 'var(--ink)' }}>CrashFactory</strong> &mdash;{' '}
          <a href={paper.websiteSource} target="_blank" rel="noopener noreferrer">
            website source
          </a>
          . Research code is not released here.
        </p>
        <p>
          {paper.affiliations.map((a) => a.name).join(' · ')}
        </p>
        <p>
          Correspondence:{' '}
          {paper.contacts.map((c, i) => (
            <span key={c}>
              <a href={`mailto:${c}`}>{c}</a>
              {i < paper.contacts.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        {attributions.length > 0 && (
          <ul className="attributions">
            {attributions.map((a) => (
              <li key={a}>
                <Attribution text={a} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
