import { paper } from '../content/paper';

export default function Abstract() {
  return (
    <section id="abstract" aria-labelledby="abstract-heading">
      <div className="shell">
        <p className="section-label">Abstract</p>
        <h2 id="abstract-heading">What CrashFactory does</h2>
        <div className="prose">
          <p>{paper.abstract}</p>
          <p className="keywords">Keywords: {paper.keywords.join(' · ')}</p>
        </div>
      </div>
    </section>
  );
}
