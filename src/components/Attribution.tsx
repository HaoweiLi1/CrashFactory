const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';

/** Renders an attribution string, linking the OpenStreetMap credit to its licence page. */
export default function Attribution({ text }: { text: string }) {
  if (!/openstreetmap/i.test(text)) return <>{text}</>;
  return (
    <>
      {text}{' '}
      <a href={OSM_COPYRIGHT} target="_blank" rel="noopener noreferrer">
        Licence
      </a>
    </>
  );
}
