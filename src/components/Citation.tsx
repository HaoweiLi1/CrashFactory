import { useState } from 'react';
import { bibtex, paper } from '../content/paper';

export default function Citation() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="citation" aria-labelledby="citation-heading">
      <div className="shell">
        <p className="section-label">Citation</p>
        <h2 id="citation-heading">Cite this work</h2>
        <div className="prose">
          <p>
            Please cite the SSRN entry:{' '}
            <a href={paper.ssrn} target="_blank" rel="noopener noreferrer">
              {paper.ssrn}
            </a>
          </p>
        </div>
        <div className="cite-block">
          <button type="button" className="btn copy-btn" onClick={copy}>
            {copied ? 'Copied' : 'Copy'}
          </button>
          <pre tabIndex={0} role="group" aria-label="BibTeX citation">
            <code>{bibtex}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
