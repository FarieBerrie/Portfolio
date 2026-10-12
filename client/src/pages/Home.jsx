import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { AvatarOrbit, CornerDecor, HeroBackdrop, ProjectArt, WaveDivider } from '../components/Graphics.jsx';
import Reveal, { useActiveSection, useScrolled } from '../components/Reveal.jsx';

const STAGGER = 90; // ms between siblings

function formatMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function ExternalLink({ href, children, className }) {
  if (!href) return null;
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={className} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
      {children}
    </a>
  );
}

function Hero({ profile }) {
  return (
    <div className="hero-wrap">
      <HeroBackdrop />
      <section className="hero container">
        <div className="hero-text">
          <Reveal as="p" className="eyebrow" delay={0}>
            {profile.title}
          </Reveal>
          {/* Gradient lives on the span: background-clip:text vanishes in Chromium when the same element animates */}
          <Reveal as="h1" delay={STAGGER}>
            <span className="grad-text">{profile.name}</span>
          </Reveal>
          {profile.tagline && (
            <Reveal as="p" className="lead" delay={STAGGER * 2}>
              {profile.tagline}
            </Reveal>
          )}
          <Reveal className="actions" delay={STAGGER * 3}>
            <a className="btn btn-primary" href="#projects">
              View projects
            </a>
            <ExternalLink className="btn" href={profile.resume_url}>
              Résumé
            </ExternalLink>
            <a className="btn" href="#contact">
              Contact me
            </a>
          </Reveal>
          <Reveal className="socials" variant="fade" delay={STAGGER * 4}>
            <ExternalLink href={profile.github_url}>GitHub</ExternalLink>
            <ExternalLink href={profile.linkedin_url}>LinkedIn</ExternalLink>
            {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
          </Reveal>
        </div>
        <Reveal className="avatar-wrap" variant="scale" delay={STAGGER * 2}>
          <AvatarOrbit />
          <div className="avatar" aria-hidden={!profile.avatar_url}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} /> : <span>{initials(profile.name)}</span>}
          </div>
        </Reveal>
      </section>
      <WaveDivider />
    </div>
  );
}

function About({ profile, skills }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const skill of skills) {
      const key = skill.category || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(skill.name);
    }
    return [...map];
  }, [skills]);

  return (
    <section id="about" className="section container">
      <CornerDecor />
      <Reveal as="h2">About</Reveal>
      <div className="about-grid">
        <Reveal className="bio" variant="left" delay={STAGGER}>
          {profile.bio.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {profile.location && <p className="muted">📍 {profile.location}</p>}
        </Reveal>
        <div className="skills">
          {groups.map(([category, names], g) => (
            <Reveal key={category} className="skill-group" delay={STAGGER * (g + 1)}>
              <h3>{category}</h3>
              <ul className="tags">
                {names.map((n, i) => (
                  <li key={n} style={{ '--i': i }}>
                    {n}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects({ projects }) {
  const [filter, setFilter] = useState(null);
  const allTech = useMemo(() => [...new Set(projects.flatMap((p) => p.tech))].sort(), [projects]);
  const sorted = useMemo(
    () => [...projects].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order),
    [projects],
  );
  const visible = filter ? sorted.filter((p) => p.tech.includes(filter)) : sorted;

  return (
    <section id="projects" className="section container">
      <Reveal as="h2">Projects</Reveal>
      {allTech.length > 1 && (
        <Reveal className="filters" variant="fade" delay={STAGGER} role="group" aria-label="Filter projects by technology">
          <button className={`chip ${filter === null ? 'active' : ''}`} onClick={() => setFilter(null)}>
            All
          </button>
          {allTech.map((t) => (
            <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(filter === t ? null : t)}>
              {t}
            </button>
          ))}
        </Reveal>
      )}
      {/* Keyed by filter so the cards re-play their entrance whenever the filter changes */}
      <div className="project-grid" key={filter ?? 'all'}>
        {visible.map((p, i) => (
          <Reveal as="article" key={p.id} className="card project" variant="scale" delay={Math.min(i, 5) * STAGGER}>
            {p.image_url ? (
              <img className="project-img" src={p.image_url} alt="" loading="lazy" />
            ) : (
              <ProjectArt seed={p.title} />
            )}
            <div className="card-body">
              <div className="project-head">
                <h3>{p.title}</h3>
                {p.featured && <span className="badge">Featured</span>}
              </div>
              {p.summary && <p>{p.summary}</p>}
              {p.description && (
                <details>
                  <summary>Details</summary>
                  <p>{p.description}</p>
                </details>
              )}
              <ul className="tags small">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="card-links">
                <ExternalLink href={p.live_url}>Live demo ↗</ExternalLink>
                <ExternalLink href={p.repo_url}>Source ↗</ExternalLink>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      {visible.length === 0 && <p className="muted">No projects use {filter}.</p>}
    </section>
  );
}

function Experience({ items }) {
  if (items.length === 0) return null;
  return (
    <section id="experience" className="section container">
      <Reveal as="h2">Experience</Reveal>
      <ol className="timeline">
        {items.map((job, i) => (
          <Reveal as="li" key={job.id} variant="left" delay={Math.min(i, 5) * STAGGER}>
            <div className="timeline-date">
              {formatMonth(job.start_date)} – {job.end_date ? formatMonth(job.end_date) : 'Present'}
            </div>
            <div>
              <h3>
                {job.role} <span className="muted">· {job.company}</span>
              </h3>
              {job.location && <p className="muted small-text">{job.location}</p>}
              {job.description && <p>{job.description}</p>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function Contact() {
  const empty = { name: '', email: '', body: '', website: '' };
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState({ state: 'idle' });

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setStatus({ state: 'sending' });
    try {
      await api('/contact', { method: 'POST', body: form });
      setForm(empty);
      setStatus({ state: 'sent' });
    } catch (err) {
      setStatus({ state: 'error', message: err.message, fields: err.fields });
    }
  }

  const fieldError = (name) => status.fields?.[name] && <span className="field-error">{status.fields[name]}</span>;

  return (
    <section id="contact" className="section container narrow">
      <CornerDecor className="flip" />
      <Reveal as="h2">Get in touch</Reveal>
      <Reveal as="p" className="muted" variant="fade" delay={STAGGER}>
        Have a role, project or question? Send a message and I'll get back to you.
      </Reveal>
      <Reveal as="form" className="card form" variant="scale" delay={STAGGER * 2} onSubmit={submit} noValidate>
        <div className="row">
          <label>
            Name
            <input name="name" value={form.name} onChange={update} required autoComplete="name" />
            {fieldError('name')}
          </label>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" />
            {fieldError('email')}
          </label>
        </div>
        <label>
          Message
          <textarea name="body" rows={5} value={form.body} onChange={update} required />
          {fieldError('body')}
        </label>
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off" />
        </label>
        <button className="btn btn-primary" disabled={status.state === 'sending'}>
          {status.state === 'sending' ? 'Sending…' : 'Send message'}
        </button>
        {status.state === 'sent' && <p className="notice success pop">Thanks! Your message was sent.</p>}
        {status.state === 'error' && <p className="notice error pop">{status.message}</p>}
      </Reveal>
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const scrolled = useScrolled();

  const sections = data ? ['about', 'projects', ...(data.experience.length ? ['experience'] : []), 'contact'] : [];
  const active = useActiveSection(sections);

  useEffect(() => {
    api('/portfolio')
      .then((d) => {
        setData(d);
        document.title = `${d.profile.name} · ${d.profile.title || 'Portfolio'}`;
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="center-screen notice error">{error}</div>;
  if (!data) return <div className="center-screen muted">Loading…</div>;

  const { profile, projects, experience, skills } = data;
  const navLink = (id, label) => (
    <a href={`#${id}`} className={active === id ? 'active' : undefined} aria-current={active === id ? 'true' : undefined}>
      {label}
    </a>
  );

  return (
    <>
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="container nav-inner">
          <a href="#top" className="brand">
            {profile.name}
          </a>
          <nav>
            {navLink('about', 'About')}
            {navLink('projects', 'Projects')}
            {experience.length > 0 && navLink('experience', 'Experience')}
            {navLink('contact', 'Contact')}
          </nav>
        </div>
      </header>
      <main id="top">
        <Hero profile={profile} />
        <About profile={profile} skills={skills} />
        <Projects projects={projects} />
        <Experience items={experience} />
        <Contact />
      </main>
      <Reveal as="footer" className="footer container" variant="fade">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <Link to="/admin" className="muted">
          Admin
        </Link>
      </Reveal>
    </>
  );
}
