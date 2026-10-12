import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal, { useScrolled, useScrollProgress } from './Reveal.jsx';

const SECTION_LABELS = { about: 'About', projects: 'Projects', experience: 'Experience', contact: 'Contact' };

export function ExternalLink({ href, children, className, ...rest }) {
  if (!href) return null;
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})} {...rest}>
      {children}
    </a>
  );
}

/** On the home page sections are in-page anchors; elsewhere they link back to the home page. */
function SectionLink({ id, onHome, active }) {
  const props = {
    className: active === id ? 'active' : undefined,
    'aria-current': active === id ? 'true' : undefined,
  };
  return onHome ? (
    <a href={`#${id}`} {...props}>
      {SECTION_LABELS[id]}
    </a>
  ) : (
    <Link to={`/#${id}`} {...props}>
      {SECTION_LABELS[id]}
    </Link>
  );
}

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || systemTheme());

  // Follow the system setting live until the visitor picks a theme themselves.
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(systemTheme());
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* not persisted; still applies for this visit */
    }
    setTheme(next);
  }

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
  return (
    <button type="button" className={`theme-toggle is-${theme}`} onClick={toggle} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <g className="sun" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
        </g>
        <path className="moon" fill="currentColor" d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z" />
      </svg>
    </button>
  );
}

export function ScrollProgress() {
  const progress = useScrollProgress();
  return <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />;
}

export function BackToTop() {
  const visible = useScrolled(600);
  return (
    <button
      type="button"
      className={`back-to-top${visible ? ' visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

export function SiteNav({ profile, sections, active, onHome = false }) {
  const scrolled = useScrolled();
  return (
    <>
      <ScrollProgress />
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          {onHome ? (
            <a href="#top" className="brand">
              {profile.name}
            </a>
          ) : (
            <Link to="/" className="brand">
              {profile.name}
            </Link>
          )}
          <nav>
            {sections.map((id) => (
              <SectionLink key={id} id={id} onHome={onHome} active={active} />
            ))}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <BackToTop />
    </>
  );
}

export function SiteFooter({ profile, sections, onHome = false }) {
  const connect = [
    ['GitHub', profile.github_url],
    ['LinkedIn', profile.linkedin_url],
    ['Email', profile.email && `mailto:${profile.email}`],
    ['Résumé', profile.resume_url],
  ].filter(([, href]) => href);

  return (
    <Reveal as="footer" className="site-footer" variant="fade">
      <div className="container footer-grid">
        <div className="footer-brand">
          <p className="footer-name">
            <span className="grad-text">{profile.name}</span>
          </p>
          {profile.tagline && <p className="muted">{profile.tagline}</p>}
          {profile.location && <p className="muted small-text">📍 {profile.location}</p>}
        </div>
        <div>
          <h2 className="footer-heading">Explore</h2>
          <ul className="footer-links">
            {sections.map((id) => (
              <li key={id}>
                <SectionLink id={id} onHome={onHome} />
              </li>
            ))}
          </ul>
        </div>
        {connect.length > 0 && (
          <div>
            <h2 className="footer-heading">Connect</h2>
            <ul className="footer-links">
              {connect.map(([label, href]) => (
                <li key={label}>
                  <ExternalLink href={href}>{label}</ExternalLink>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {profile.name} · Built with React, Express &amp; SQLite
        </span>
        <Link to="/admin">Admin</Link>
      </div>
    </Reveal>
  );
}

export function sectionsFor(data) {
  return ['about', 'projects', ...(data.experience.length ? ['experience'] : []), 'contact'];
}
