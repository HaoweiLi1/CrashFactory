import { useEffect, useState } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Abstract from './components/Abstract';
import Teaser from './components/Teaser';
import Framework from './components/Framework';
import Gallery from './components/Gallery';
import Results from './components/Results';
import Citation from './components/Citation';
import Credits from './components/Credits';
import type { CasesManifest } from './types';

const EMPTY: CasesManifest = {
  manifest_version: '1',
  generated_utc: null,
  attributions: [],
  cases: [],
};

export default function App() {
  const [data, setData] = useState<CasesManifest>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/cases.json`)
      .then((r) => (r.ok ? r.json() : EMPTY))
      .then((json: CasesManifest) => {
        if (!cancelled && json && Array.isArray(json.cases)) setData(json);
      })
      .catch(() => {
        /* Static page still renders without curated media. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <Teaser media={data.teaser?.media} />
        <Abstract />
        <Framework media={data.framework?.media} />
        <Gallery cases={data.cases} />
        <Results />
        <Citation />
      </main>
      <Credits attributions={data.attributions ?? []} />
    </>
  );
}
