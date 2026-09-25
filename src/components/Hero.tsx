import { paper } from '../content/paper';

export default function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="site-title">
      <div className="shell hero-inner">
        <span className="badge">Preprint</span>

        <h1 id="site-title">
          <span className="hero-name">{paper.name}</span>
          <span className="visually-hidden">: </span>
          <span className="hero-sub">{paper.subtitle}</span>
        </h1>

        <p className="authors">
          {paper.authors.map((a, i) => (
            <span key={a.name}>
              {a.name}
              <sup>{a.marks.join(',')}</sup>
              {i < paper.authors.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>

        <ul className="affiliations">
          {paper.affiliations.map((af) => (
            <li key={af.mark}>
              <sup>{af.mark}</sup> {af.name}
            </li>
          ))}
          {paper.authorNotes.map((n) => (
            <li key={n.mark}>
              <sup>{n.mark}</sup> {n.text}
            </li>
          ))}
        </ul>

        <div className="actions">
          <a className="btn btn-primary" href={paper.ssrn} rel="noopener noreferrer" target="_blank">
            Read the paper (SSRN)
          </a>
          <a className="btn" href="#gallery">
            See examples
          </a>
          <a
            className="btn"
            href={paper.websiteSource}
            rel="noopener noreferrer"
            target="_blank"
            title="Source code for this website. Research code is not released here."
          >
            Website source
          </a>
          <a className="btn" href="#citation">
            Cite
          </a>
        </div>
      </div>
    </section>
  );
}
