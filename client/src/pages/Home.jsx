import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, getPortfolio } from '../api.js';
import { AvatarOrbit, CornerDecor, HeroBackdrop, ProjectArt, WaveDivider } from '../components/Graphics.jsx';
import Reveal, { useActiveSection, useInView } from '../components/Reveal.jsx';
import { ExternalLink, SiteFooter, SiteNav, sectionsFor } from '../components/SiteChrome.jsx';

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

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Counts the number inside a value like "12", "3+" or "$1.5k" up from zero once it scrolls into view. */
function CountUp({ value }) {
  const [ref, inView] = useInView();
  const match = /^(\D*)(\d+(?:\.\d+)?)(.*)$/.exec(value);
  const target = match ? Number(match[2]) : null;
  const decimals = match?.[2].split('.')[1]?.length ?? 0;
  const [current, setCurrent] = useState(target === null || prefersReducedMotion() ? target : 0);

  useEffect(() => {
    if (!inView || target === null || prefersReducedMotion()) return;
    const duration = 1400;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setCurrent(target * (1 - Math.pow(1 - t, 3))); // ease-out cubic
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // Background tabs pause animation frames; make sure the real number always lands.
    const done = setTimeout(() => setCurrent(target), duration + 200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [inView, target]);

  if (!match) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref} aria-label={value}>
      {match[1]}
      {current.toFixed(decimals)}
      {match[3]}
    </span>
  );
}

function Stats({ stats }) {
  if (stats.length === 0) return null;
  return (
    <section className="stats container" aria-label="Highlights">
      {stats.map((s, i) => (
        <Reveal key={s.id} className="stat" variant="scale" delay={i * STAGGER}>
          <span className="stat-value grad-text">
            <CountUp value={s.value} />
          </span>
          <span className="stat-label">{s.label}</span>
        </Reveal>
      ))}
    </section>
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
          {/* Gradient text + an animated blur filter don't mix in Chromium, so this uses the blur-free "rise" */}
          <Reveal as="h1" variant="rise" delay={STAGGER}>
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
            {/* Image duplicates the title link, so it's hidden from keyboard and screen readers */}
            <Link to={`/projects/${p.id}`} className="project-media" tabIndex={-1} aria-hidden="true">
              {p.image_url ? (
                <img className="project-img" src={p.image_url} alt="" loading="lazy" />
              ) : (
                <ProjectArt seed={p.title} />
              )}
            </Link>
            <div className="card-body">
              <div className="project-head">
                <h3>
                  <Link to={`/projects/${p.id}`}>{p.title}</Link>
                </h3>
                {p.featured && <span className="badge">Featured</span>}
              </div>
              {(p.year || p.role) && <p className="project-meta">{[p.year, p.role].filter(Boolean).join(' · ')}</p>}
              {p.summary && <p>{p.summary}</p>}
              <ul className="tags small">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="card-links">
                <Link to={`/projects/${p.id}`} className="case-study-link">
                  Read case study <span aria-hidden="true">→</span>
                </Link>
                <ExternalLink href={p.live_url}>Live ↗</ExternalLink>
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

function Contact({ profile }) {
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
        {profile.resume_url && (
          <>
            {' '}
            My <ExternalLink href={profile.resume_url}>résumé</ExternalLink> is here too.
          </>
        )}
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
  const { hash } = useLocation();

  const sections = data ? sectionsFor(data) : [];
  const active = useActiveSection(sections);

  useEffect(() => {
    getPortfolio()
      .then((d) => {
        setData(d);
        document.title = `${d.profile.name} · ${d.profile.title || 'Portfolio'}`;
      })
      .catch((err) => setError(err.message));
  }, []);

  // Arriving from another page via /#projects: the section only exists once data has loaded.
  useEffect(() => {
    if (data && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [data, hash]);

  if (error) return <div className="center-screen notice error">{error}</div>;
  if (!data) return <div className="center-screen muted">Loading…</div>;

  const { profile, projects, experience, skills, stats } = data;

  return (
    <>
      <SiteNav profile={profile} sections={sections} active={active} onHome />
      <main id="top">
        <Hero profile={profile} />
        <Stats stats={stats} />
        <About profile={profile} skills={skills} />
        <Projects projects={projects} />
        <Experience items={experience} />
        <Contact profile={profile} />
      </main>
      <SiteFooter profile={profile} sections={sections} onHome />
    </>
  );
}
