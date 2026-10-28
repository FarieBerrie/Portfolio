import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Monogram } from './Graphics.jsx';
import Icon from './Icons.jsx';
import { useScrolled } from './Reveal.jsx';

const SECTION_LABELS = { home: 'Home', about: 'About', services: 'Services', projects: 'Work', experience: 'Experience', contact: 'Contact' };

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
  if (onHome) {
    return (
      <a href={`#${id}`} {...props}>
        {SECTION_LABELS[id]}
      </a>
    );
  }
  return (
    <Link to={id === 'home' ? '/' : `/#${id}`} {...props}>
      {SECTION_LABELS[id]}
    </Link>
  );
}

/** A link on the home page, or back to that spot on it from anywhere else. */
function HomeLink({ id, onHome, children, ...rest }) {
  return onHome ? (
    <a href={`#${id}`} {...rest}>
      {children}
    </a>
  ) : (
    <Link to={`/#${id}`} {...rest}>
      {children}
    </Link>
  );
}

export function SiteNav({ profile, sections, active, onHome = false }) {
  const scrolled = useScrolled();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname, hash } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname, hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const brand = (
    <>
      <Monogram initials={initials(profile.name)} />
      <span className="brand-name">{profile.name}</span>
    </>
  );

  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <div className="topbar-inner">
        {onHome ? (
          <a href="#home" className="brand">
            {brand}
          </a>
        ) : (
          <Link to="/" className="brand">
            {brand}
          </Link>
        )}
        {/* Closing on any link click covers in-page anchors, which don't change the route on a repeat click */}
        <nav id="site-menu" className="topbar-links" aria-label="Main" onClick={(e) => e.target.closest('a') && setMenuOpen(false)}>
          {sections.map((id) => (
            <SectionLink key={id} id={id} onHome={onHome} active={active} />
          ))}
          <NavLink to="/flowfield" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Lab
          </NavLink>
        </nav>
        <div className="topbar-end">
          <span className="work-status">
            <i />
            Open for work
          </span>
          <HomeLink id="contact" onHome={onHome} className="hire-btn">
            Hire Me <Icon name="arrowRight" strokeWidth={2.2} />
          </HomeLink>
          <button type="button" className="menu-btn" aria-label="Menu" aria-expanded={menuOpen} aria-controls="site-menu" onClick={() => setMenuOpen((o) => !o)}>
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ profile, sections, onHome = false }) {
  const connect = socialLinks(profile);

  return (
    <footer className="site-footer">
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
              <Link to="/flowfield">Lab</Link>
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
      <p className="footer-giant" aria-hidden="true">
        {profile.name}
      </p>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <span>Built with React, Express &amp; SQLite</span>
      </div>
    </footer>
  );
}

export function sectionsFor(data) {
  return ['home', 'about', 'services', 'projects', ...(data.experience.length ? ['experience'] : []), 'contact'];
}
