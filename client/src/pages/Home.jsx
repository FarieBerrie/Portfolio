import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { AvatarOrbit, CornerDecor, HeroBackdrop, ProjectArt, WaveDivider } from '../components/Graphics.jsx';

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
          <p className="eyebrow">{profile.title}</p>
          <h1>{profile.name}</h1>
          {profile.tagline && <p className="lead">{profile.tagline}</p>}
          <div className="actions">
            <a className="btn btn-primary" href="#projects">
              View projects
            </a>
            <ExternalLink className="btn" href={profile.resume_url}>
              Résumé
            </ExternalLink>
            <a className="btn" href="#contact">
              Contact me
            </a>
          </div>
          <div className="socials">
            <ExternalLink href={profile.github_url}>GitHub</ExternalLink>
            <ExternalLink href={profile.linkedin_url}>LinkedIn</ExternalLink>
            {profile.email && <a href={`mailto:${profile.email}`}>{profile.email}</a>}
          </div>
        </div>
        <div className="avatar-wrap">
          <AvatarOrbit />
          <div className="avatar" aria-hidden={!profile.avatar_url}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} /> : <span>{initials(profile.name)}</span>}
          </div>
        </div>
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
      <h2>About</h2>
      <div className="about-grid">
        <div className="bio">
          {profile.bio.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {profile.location && <p className="muted">📍 {profile.location}</p>}
        </div>
        <div className="skills">
          {groups.map(([category, names]) => (
            <div key={category} className="skill-group">
              <h3>{category}</h3>
              <ul className="tags">
                {names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
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
      <h2>Projects</h2>
      {allTech.length > 1 && (
        <div className="filters" role="group" aria-label="Filter projects by technology">
          <button className={`chip ${filter === null ? 'active' : ''}`} onClick={() => setFilter(null)}>
            All
          </button>
          {allTech.map((t) => (
            <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(filter === t ? null : t)}>
              {t}
            </button>
          ))}
        </div>
      )}
      <div className="project-grid">
        {visible.map((p) => (
          <article key={p.id} className="card project">
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
          </article>
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
      <h2>Experience</h2>
      <ol className="timeline">
        {items.map((job) => (
          <li key={job.id}>
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
          </li>
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
      <h2>Get in touch</h2>
      <p className="muted">Have a role, project or question? Send a message and I'll get back to you.</p>
      <form className="card form" onSubmit={submit} noValidate>
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
        {status.state === 'sent' && <p className="notice success">Thanks! Your message was sent.</p>}
        {status.state === 'error' && <p className="notice error">{status.message}</p>}
      </form>
    </section>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <a href="#top" className="brand">
            {profile.name}
          </a>
          <nav>
            <a href="#about">About</a>
            <a href="#projects">Projects</a>
            {experience.length > 0 && <a href="#experience">Experience</a>}
            <a href="#contact">Contact</a>
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
      <footer className="footer container">
        <span>
          © {new Date().getFullYear()} {profile.name}
        </span>
        <Link to="/admin" className="muted">
          Admin
        </Link>
      </footer>
    </>
  );
}
