const links = [
  ['#teaser', 'Surround view'],
  ['#gallery', 'Examples'],
  ['#abstract', 'Abstract'],
  ['#framework', 'Framework'],
  ['#results', 'Results'],
  ['#citation', 'Citation'],
];

/** Compact, non-sticky waypoints. The references use no persistent chrome. */
export default function Nav() {
  return (
    <nav className="nav" aria-label="Section navigation">
      <div className="shell nav-links">
        {links.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}
