const links = [
  ['#teaser', 'Overview'],
  ['#abstract', 'Abstract'],
  ['#framework', 'Framework'],
  ['#gallery', 'Examples'],
  ['#results', 'Results'],
  ['#citation', 'Citation'],
];

export default function Nav() {
  return (
    <nav className="nav" aria-label="Section navigation">
      <div className="shell nav-inner">
        <a className="nav-mark" href="#top">
          CrashFactory
        </a>
        <div className="nav-links">
          {links.map(([href, label]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
