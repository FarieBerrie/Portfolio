import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api, getPortfolio } from '../api.js';
import { AvatarOrbit, CodeWindow, CornerDecor, HeroBackdrop, PaperPlane, ProjectArt, ScrollCue, Underline, sparklePath } from '../components/Graphics.jsx';
import Icon, { categoryIcon } from '../components/Icons.jsx';
import Reveal, { spotlight, useActiveSection, useInView } from '../components/Reveal.jsx';
import { ExternalLink, SiteFooter, SiteNav, SocialIcons, initials, sectionsFor } from '../components/SiteChrome.jsx';

const STAGGER = 90; // ms between siblings

function formatMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
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

const STAT_ICONS = ['sparkle', 'bolt', 'star', 'layers'];

function Stats({ stats }) {
  if (stats.length === 0) return null;
  return (
    <section className="stats container" aria-label="Highlights">
      {stats.map((s, i) => (
        <Reveal key={s.id} className="stat spot" variant="scale" delay={i * STAGGER}>
          <span className="stat-icon">
            <Icon name={STAT_ICONS[i % STAT_ICONS.length]} />
          </span>
          <span className="stat-value">
            <CountUp value={s.value} />
          </span>
          <span className="stat-label">{s.label}</span>
        </Reveal>
      ))}
    </section>
  );
}

/** The name with its last word set in gold italic, underlined by a hand-drawn stroke. */
function Name({ name }) {
  const words = name.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.length > 0 && `${words.join(' ')} `}
      <span className="name-accent">
        {last}
        <Underline />
      </span>
    </>
  );
}

/** Every skill on a slowly scrolling strip (decorative: the About section lists them properly). */
function SkillMarquee({ skills }) {
  if (skills.length < 3) return null;
  const names = skills.map((s) => s.name);
  // Long enough to fill a wide screen, then doubled so the loop has no seam
  const run = Array.from({ length: Math.ceil(14 / names.length) }, () => names).flat();
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {[0, 1].map((copy) => (
          <ul key={copy} className="marquee-row">
            {run.map((n, i) => (
              <li key={i}>
                <svg viewBox="0 0 20 20" className="marquee-star">
                  <path d={sparklePath(10, 10, 8)} />
                </svg>
                {n}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

const CHIP_SPOTS = ['chip-a', 'chip-b', 'chip-c'];

function Hero({ profile, skills }) {
  const chips = skills.slice(0, 3);
  return (
    <div className="hero-wrap ink">
      <HeroBackdrop />
      <section className="hero container">
        <div className="hero-text">
          <Reveal as="p" className="eyebrow" delay={0}>
            <Icon name="sparkle" />
            {profile.title}
          </Reveal>
          {/* Gradient text + an animated blur filter don't mix in Chromium, so this uses the blur-free "rise" */}
          <Reveal as="h1" variant="rise" delay={STAGGER}>
            <Name name={profile.name} />
          </Reveal>
          {profile.tagline && (
            <Reveal as="p" className="lead" delay={STAGGER * 2}>
              {profile.tagline}
            </Reveal>
          )}
          <Reveal className="actions" delay={STAGGER * 3}>
            <a className="btn btn-primary" href="#projects">
              View projects <Icon name="arrowRight" />
            </a>
            <ExternalLink className="btn btn-ghost" href={profile.resume_url}>
              <Icon name="file" /> Résumé
            </ExternalLink>
            <a className="btn btn-ghost" href="#contact">
              Contact me
            </a>
          </Reveal>
          <Reveal className="hero-meta" variant="fade" delay={STAGGER * 4}>
            <SocialIcons profile={profile} />
            {profile.location && (
              <span className="with-icon muted">
                <Icon name="pin" /> {profile.location}
              </span>
            )}
          </Reveal>
        </div>
        <Reveal className="avatar-wrap" variant="scale" delay={STAGGER * 2}>
          <AvatarOrbit />
          <div className="avatar" aria-hidden={!profile.avatar_url}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} /> : <span>{initials(profile.name)}</span>}
          </div>
          {chips.map((skill, i) => (
            <span key={skill.id} className={`float-chip ${CHIP_SPOTS[i]}`} aria-hidden="true">
              <Icon name={categoryIcon(skill.category)} />
              {skill.name}
            </span>
          ))}
        </Reveal>
      </section>
      <SkillMarquee skills={skills} />
      <a href="#about" className="scroll-cue-link" aria-label="Scroll to About">
        <ScrollCue />
      </a>
    </div>
  );
}

/** "02 — Projects" kicker over a heading whose <em> words are set in gold italic. */
function SectionHead({ n, icon, label, children }) {
  return (
    <header className="section-head">
      <Reveal as="p" className="kicker" variant="fade">
        <span className="kicker-icon">
          <Icon name={icon} />
        </span>
        <span className="kicker-num">{String(n).padStart(2, '0')}</span>
        <span className="kicker-rule" />
        {label}
      </Reveal>
      <Reveal as="h2" variant="rise" delay={60}>
        {children}
      </Reveal>
    </header>
  );
}

function About({ n, profile, skills }) {
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
      <SectionHead n={n} icon="user" label="About">
        About <em>me</em>
      </SectionHead>
      <div className="bento">
        <Reveal className="card bento-bio spot" variant="left" delay={STAGGER}>
          {profile.bio.split(/\n\s*\n/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
          {profile.location && (
            <p className="with-icon muted">
              <Icon name="pin" /> {profile.location}
            </p>
          )}
        </Reveal>
        <Reveal className="bento-code" variant="right" delay={STAGGER * 2}>
          <CodeWindow />
        </Reveal>
        <div className="skill-cards">
          {groups.map(([category, names], g) => (
            <Reveal key={category} className="card skill-group spot" delay={STAGGER * (g + 1)}>
              <div className="skill-head">
                <span className="skill-icon">
                  <Icon name={categoryIcon(category)} />
                </span>
                <h3>{category}</h3>
              </div>
              <ul className="tags">
                {names.map((name, i) => (
                  <li key={name} style={{ '--i': i }}>
                    {name}
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

function Projects({ n, projects }) {
  const [filter, setFilter] = useState(null);
  const allTech = useMemo(() => [...new Set(projects.flatMap((p) => p.tech))].sort(), [projects]);
  const sorted = useMemo(
    () => [...projects].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order),
    [projects],
  );
  const visible = filter ? sorted.filter((p) => p.tech.includes(filter)) : sorted;

  return (
    <section id="projects" className="section container">
      <SectionHead n={n} icon="grid" label="Work">
        Selected <em>projects</em>
      </SectionHead>
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
          <Reveal as="article" key={p.id} className={`card project spot${p.featured ? ' featured' : ''}`} variant="scale" delay={Math.min(i, 5) * STAGGER}>
            {/* Image duplicates the title link, so it's hidden from keyboard and screen readers */}
            <Link to={`/projects/${p.id}`} className="project-media" tabIndex={-1} aria-hidden="true">
              {p.image_url ? <img className="project-img" src={p.image_url} alt="" loading="lazy" /> : <ProjectArt seed={p.title} index={sorted.indexOf(p)} />}
              <span className="media-arrow">
                <Icon name="arrowUpRight" />
              </span>
              {p.featured && (
                <span className="badge">
                  <Icon name="star" /> Featured
                </span>
              )}
            </Link>
            <div className="card-body">
              {(p.year || p.role) && <p className="project-meta">{[p.year, p.role].filter(Boolean).join(' · ')}</p>}
              <h3>
                <Link to={`/projects/${p.id}`}>{p.title}</Link>
              </h3>
              {p.summary && <p>{p.summary}</p>}
              <ul className="tags small">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="card-links">
                <Link to={`/projects/${p.id}`} className="case-study-link">
                  Case study <Icon name="arrowRight" />
                </Link>
                {p.live_url && (
                  <ExternalLink href={p.live_url} className="icon-link" aria-label={`${p.title}: live site`} title="Live site">
                    <Icon name="globe" />
                  </ExternalLink>
                )}
                {p.repo_url && (
                  <ExternalLink href={p.repo_url} className="icon-link" aria-label={`${p.title}: source code`} title="Source code">
                    <Icon name="github" />
                  </ExternalLink>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
      {visible.length === 0 && <p className="muted">No projects use {filter}.</p>}
    </section>
  );
}

function Experience({ n, items }) {
  if (items.length === 0) return null;
  return (
    <section id="experience" className="section container">
      <SectionHead n={n} icon="briefcase" label="Career">
        Where I&rsquo;ve <em>worked</em>
      </SectionHead>
      <ol className="timeline">
        {items.map((job, i) => (
          <Reveal as="li" key={job.id} variant="left" delay={Math.min(i, 5) * STAGGER}>
            <svg className="timeline-node" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2 22 12 12 22 2 12Z" />
              <path d="M12 7 17 12 12 17 7 12Z" />
            </svg>
            <div className="card timeline-card spot">
              <div className="timeline-date">
                <Icon name="clock" />
                {formatMonth(job.start_date)} – {job.end_date ? formatMonth(job.end_date) : 'Present'}
              </div>
              <h3>
                {job.role} <span className="muted">· {job.company}</span>
              </h3>
              {job.location && (
                <p className="muted small-text with-icon">
                  <Icon name="pin" /> {job.location}
                </p>
              )}
              {job.description && <p>{job.description}</p>}
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function Contact({ n, profile }) {
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
    <section id="contact" className="section container">
      <CornerDecor className="flip" />
      <SectionHead n={n} icon="send" label="Contact">
        Get in <em>touch</em>
      </SectionHead>
      <div className="contact-grid">
        <Reveal className="contact-intro" variant="left" delay={STAGGER}>
          <p className="lead">
            Have a role, project or question? Send a message and I&rsquo;ll get back to you.
            {profile.resume_url && (
              <>
                {' '}
                My <ExternalLink href={profile.resume_url}>résumé</ExternalLink> is here too.
              </>
            )}
          </p>
          <ul className="contact-methods">
            {profile.email && (
              <li>
                <span className="method-icon">
                  <Icon name="mail" />
                </span>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            )}
            {profile.location && (
              <li>
                <span className="method-icon">
                  <Icon name="pin" />
                </span>
                {profile.location}
              </li>
            )}
          </ul>
          <PaperPlane />
        </Reveal>
        <Reveal as="form" className="card form spot" variant="scale" delay={STAGGER * 2} onSubmit={submit} noValidate>
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
            <textarea name="body" rows={6} value={form.body} onChange={update} required />
            {fieldError('body')}
          </label>
          <label className="honeypot" aria-hidden="true">
            Website
            <input name="website" value={form.website} onChange={update} tabIndex={-1} autoComplete="off" />
          </label>
          <button className="btn btn-primary" disabled={status.state === 'sending'}>
            {status.state === 'sending' ? 'Sending…' : 'Send message'} <Icon name="send" />
          </button>
          {status.state === 'sent' && <p className="notice success pop">Thanks! Your message was sent.</p>}
          {status.state === 'error' && <p className="notice error pop">{status.message}</p>}
        </Reveal>
      </div>
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
  const number = (id) => sections.indexOf(id) + 1;

  return (
    <>
      <SiteNav profile={profile} sections={sections} active={active} onHome />
      <main id="top" onPointerMove={spotlight}>
        <Hero profile={profile} skills={skills} />
        <Stats stats={stats} />
        <About n={number('about')} profile={profile} skills={skills} />
        <Projects n={number('projects')} projects={projects} />
        <Experience n={number('experience')} items={experience} />
        <Contact n={number('contact')} profile={profile} />
      </main>
      <SiteFooter profile={profile} sections={sections} onHome />
    </>
  );
}
