import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Globe, HeroBackdrop, Monogram } from './Graphics.jsx';
import Icon from './Icons.jsx';
import Reveal, { useScrolled, useScrollProgress } from './Reveal.jsx';

const SECTION_LABELS = { about: 'About', projects: 'Projects', experience: 'Experience', contact: 'Contact' };

export function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** The profile's links that are filled in, as [label, href, icon]. */
export function socialLinks(profile) {
  return [
    ['GitHub', profile.github_url, 'github'],
    ['LinkedIn', profile.linkedin_url, 'linkedin'],
    ['Email', profile.email && `mailto:${profile.email}`, 'mail'],
    ['Résumé', profile.resume_url, 'file'],
  ].filter(([, href]) => href);
}

/** Round icon buttons for the profile's links. */
export function SocialIcons({ profile, className = '' }) {
  return (
    <div className={`social-icons ${className}`}>
      {socialLinks(profile).map(([label, href, icon]) => (
        <ExternalLink key={label} href={href} className="social-icon" aria-label={label} title={label}>
          <Icon name={icon} />
        </ExternalLink>
      ))}
    </div>
  );
}

export function ExternalLink({ href, children, className, ...rest }) {
  if (!href) return null;
  // http(s) links and site-relative paths (such as /resume.pdf) leave this page, so open a new tab.
  // mailto: stays in this tab. An empty href renders nothing, which hides optional links like the résumé.
  const opensNewTab = /^https?:\/\//.test(href) || (href.startsWith('/') && !href.startsWith('//'));
  return (
    <a href={href} className={className} {...(opensNewTab ? { target: '_blank', rel: 'noreferrer' } : {})} {...rest}>
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

/** Nav link to the flow-field playground. On narrow screens only the icon shows; the label stays for screen readers. */
function FlowFieldLink() {
  return (
    <NavLink to="/flowfield" className={({ isActive }) => `nav-lab${isActive ? ' active' : ''}`} title="Flow Field">
      <Icon name="flow" />
      <span className="nav-lab-label">Flow Field</span>
    </NavLink>
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
      <Icon name="arrowUp" strokeWidth={2.2} />
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
              <Monogram initials={initials(profile.name)} />
              <span className="brand-name">{profile.name}</span>
            </a>
          ) : (
            <Link to="/" className="brand">
              <Monogram initials={initials(profile.name)} />
              <span className="brand-name">{profile.name}</span>
            </Link>
          )}
          <nav aria-label="Main">
            {sections.map((id) => (
              <SectionLink key={id} id={id} onHome={onHome} active={active} />
            ))}
            {profile.resume_url && (
              <ExternalLink href={profile.resume_url} className="nav-resume">
                Résumé
              </ExternalLink>
            )}
            <FlowFieldLink />
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <BackToTop />
    </>
  );
}

export function SiteFooter({ profile, sections, onHome = false }) {
  const connect = socialLinks(profile);

  return (
    <Reveal as="footer" className="site-footer ink" variant="fade">
      <HeroBackdrop />
      <Globe />
      <div className="container footer-grid">
        <div className="footer-brand">
          <p className="footer-name">
            <Monogram initials={initials(profile.name)} />
            {profile.name}
          </p>
          {profile.tagline && <p className="muted">{profile.tagline}</p>}
          {profile.location && (
            <p className="muted small-text with-icon">
              <Icon name="pin" /> {profile.location}
            </p>
          )}
          <SocialIcons profile={profile} />
        </div>
        <div>
          <h2 className="footer-heading">Explore</h2>
          <ul className="footer-links">
            {sections.map((id) => (
              <li key={id}>
                <SectionLink id={id} onHome={onHome} />
              </li>
            ))}
            <li>
              <Link to="/flowfield">Flow Field</Link>
            </li>
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
      </div>
    </Reveal>
  );
}

export function sectionsFor(data) {
  return ['about', 'projects', ...(data.experience.length ? ['experience'] : []), 'contact'];
}
