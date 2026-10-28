import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getPortfolio } from '../api.js';
import { ProjectScreen } from '../components/Graphics.jsx';
import Icon, { categoryIcon } from '../components/Icons.jsx';
import { CursorRing, HelperBot, Preloader, ScrollHint } from '../components/Overlays.jsx';
import Reveal, { spotlight, useActiveSection, useInView, useMediaQuery } from '../components/Reveal.jsx';
import { ExternalLink, SiteFooter, SiteNav, SocialIcons, initials, sectionsFor } from '../components/SiteChrome.jsx';
import { Scene, planetControl } from '../components/Space.jsx';
import { DEFAULT_SETTINGS, FlowField } from '../flowfield/engine.js';

const STAGGER = 90; // ms between siblings
const INTRO_KEY = 'intro-seen';

const pad = (n) => String(n).padStart(2, '0');
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mod = (a, b) => ((a % b) + b) % b; // a remainder that stays positive, for counting round a loop
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function formatMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  return new Date(Number(match[1]), Number(match[2]) - 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

const dateRange = (job) => `${formatMonth(job.start_date)} – ${job.end_date ? formatMonth(job.end_date) : 'Present'}`;

function ordered(projects) {
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured) || a.sort_order - b.sort_order);
}

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

/** A pill button with its arrow in a round badge, as `as` (a link by default). */
function Pill({ as: Tag = 'a', variant = 'primary', icon = 'arrowRight', className = '', children, ...rest }) {
  return (
    <Tag className={`pill pill-${variant} ${className}`} {...rest}>
      <span>{children}</span>
      <span className="pill-icon">
        <Icon name={icon} strokeWidth={2.2} />
      </span>
    </Tag>
  );
}

function SectionHead({ kicker, children, className = '' }) {
  return (
    <header className={`section-head ${className}`}>
      <Reveal as="p" className="kicker" variant="fade">
        {kicker}
      </Reveal>
      <Reveal as="h2" variant="rise" delay={60}>
        {children}
      </Reveal>
    </header>
  );
}

// ------------------------------------------------------------------ hero

const WORDS = ['Fast', 'Accessible', 'Scalable', 'Reliable'];
const GLYPHS = 'abcdefghijklmnopqrstuvwxyz';

/** Cycles through `words`, each new word resolving out of random letters. Decorative: screen readers get the list. */
function ScrambleWord({ words }) {
  const [text, setText] = useState(words[0]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let i = 0;
    let frame;
    let timer;
    const next = () => {
      i = (i + 1) % words.length;
      const target = words[i];
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 650);
        const settled = Math.floor(t * target.length);
        let out = target.slice(0, settled);
        for (let k = settled; k < target.length; k++) {
          const ch = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          out += k === 0 ? ch.toUpperCase() : ch;
        }
        setText(out);
        if (t < 1) frame = requestAnimationFrame(tick);
        else timer = setTimeout(next, 2300);
      };
      frame = requestAnimationFrame(tick);
    };
    timer = setTimeout(next, 3200);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [words]);

  return (
    <span className="scramble" aria-hidden="true">
      {text}
    </span>
  );
}

function Hero({ profile }) {
  return (
    <section id="home" className="hero" data-scene="0.6 0.33 1 1 0" data-scene-sm="0.7 0.24 0.72 1 0.2">
      <div className="container hero-inner">
        <p className="status-chip hero-in" style={{ '--d': 0 }}>
          <i />
          Available for new opportunities
        </p>
        <p className="hero-hi hero-in" style={{ '--d': 1 }}>
          Hi, I&rsquo;m
        </p>
        <h1 className="hero-name" aria-label={profile.name}>
          {[...profile.name].map((ch, i) => (
            <span key={i} className="hero-letter" style={{ '--d': i }} aria-hidden="true">
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
        <p className="hero-line hero-in" style={{ '--d': 4 }}>
          {profile.title ? <strong>{profile.title}</strong> : null} {profile.title ? 'crafting' : 'Crafting'} <ScrambleWord words={WORDS} />
          <span className="sr-only">{WORDS.join(', ').toLowerCase()}</span> web applications.
        </p>
        <div className="actions hero-in" style={{ '--d': 5 }}>
          <Pill href="#contact">Hire Me</Pill>
          <Pill href="#projects" variant="dark">
            View My Work
          </Pill>
        </div>
        <p className="hero-note hero-in" style={{ '--d': 6 }}>
          Open to remote teams{profile.location && ` · Based in ${profile.location}`}
        </p>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ about

/** `text` with every skill name it mentions highlighted. */
function Highlighted({ text, terms }) {
  if (!terms.length) return text;
  const escaped = [...terms].sort((a, b) => b.length - a.length).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(?<![\\w])(${escaped.join('|')})(?![\\w])`, 'g'));
  return parts.map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

/** The stats from the admin, or, when none are set, a few worked out from the rest of the portfolio. */
function statsFor({ stats, projects, skills, experience }) {
  if (stats.length) return stats.map((s) => ({ key: s.id, value: s.value, label: s.label }));
  const out = [];
  const startYears = experience.map((job) => Number(/^(\d{4})/.exec(job.start_date)?.[1])).filter(Boolean);
  const years = startYears.length ? new Date().getFullYear() - Math.min(...startYears) : 0;
  if (years >= 1) out.push({ key: 'years', value: `${years}+`, label: 'Years building software' });
  if (projects.length) out.push({ key: 'projects', value: String(projects.length), label: projects.length === 1 ? 'Project shipped' : 'Projects shipped' });
  if (skills.length) out.push({ key: 'skills', value: String(skills.length), label: 'Technologies in the toolkit' });
  const layers = new Set(skills.map((s) => s.category).filter(Boolean)).size;
  if (layers > 1) out.push({ key: 'layers', value: String(layers), label: 'Layers of the stack' });
  return out;
}

function About({ data }) {
  const { profile, skills, experience } = data;
  const terms = useMemo(() => skills.map((s) => s.name), [skills]);
  const stats = statsFor(data);

  return (
    <section id="about" className="section about" data-scene="0.52 0.2 0.8 1 0.15" data-scene-sm="0.78 0.1 0.5 1 0.45">
      <div className="container about-grid">
        <Reveal as="h2" variant="rise" className="about-title">
          {profile.title || 'Engineer'} building software <span className="grad">people actually use.</span>
        </Reveal>
        <Reveal className="glass about-card spot" variant="right" delay={STAGGER}>
          <p className="kicker">Who I am</p>
          <div className="about-id">
            <span className="about-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(profile.name)}</span>
            <p className="about-who">
              <strong>{profile.name}</strong>
              {profile.location && <span> · {profile.location}</span>}
            </p>
            <span className="status-chip small">
              <i />
              Open to work
            </span>
          </div>
          <div className="about-bio">
            {profile.bio.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>
                <Highlighted text={para} terms={terms} />
              </p>
            ))}
          </div>
          {experience.length > 0 && (
            <ol className="about-roles" aria-label="Recent roles">
              {experience.slice(0, 3).map((job, i) => (
                <li key={job.id} className={i === 0 ? 'current' : undefined}>
                  <span>
                    <strong>{job.role}</strong>
                    <small>{job.company}</small>
                  </span>
                  <time>{dateRange(job)}</time>
                </li>
              ))}
            </ol>
          )}
          <div className="actions">
            <Pill href="#contact">Start a project</Pill>
            <Pill href="#projects" variant="dark">
              See past work
            </Pill>
          </div>
        </Reveal>
      </div>
      {stats.length > 0 && (
        <div className="container stats" aria-label="Highlights">
          {stats.map((s, i) => (
            <Reveal key={s.key} className="stat" variant="rise" delay={i * STAGGER}>
              <span className="stat-value">
                <CountUp value={s.value} />
              </span>
              <span className="stat-label">{s.label}</span>
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ stack

function Stack({ skills }) {
  if (skills.length < 3) return null;
  const names = skills.map((s) => s.name);
  const categories = [...new Set(skills.map((s) => s.category).filter(Boolean))];
  // Long enough to fill a wide screen, then doubled so the loop has no seam
  const run = Array.from({ length: Math.ceil(12 / names.length) }, () => names).flat();

  return (
    <section className="section stack" aria-labelledby="stack-title" data-scene="0.64 0.52 1.25 1 0.1" data-scene-sm="0.55 0.62 0.9 1 0.35">
      <div className="container">
        <Reveal as="h2" id="stack-title" variant="rise">
          One stack, <span className="grad">end to end.</span>
        </Reveal>
        <Reveal as="p" className="stack-lead" delay={STAGGER}>
          The tools behind every project, from the interface down to the database.
        </Reveal>
        <Reveal as="ul" className="chip-row" variant="fade" delay={STAGGER * 2}>
          {categories.map((c) => (
            <li key={c}>
              <Icon name={categoryIcon(c)} />
              {c}
            </li>
          ))}
        </Reveal>
      </div>
      <div className="marquee" aria-hidden="true">
        {['', ' reverse'].map((dir) => (
          <div key={dir} className={`marquee-track${dir}`}>
            {[0, 1].map((copy) => (
              <ul key={copy}>
                {run.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            ))}
          </div>
        ))}
      </div>
      <ul className="sr-only">
        {names.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ services

const SERVICES = [
  {
    icon: 'monitor',
    title: 'Web Applications',
    text: 'Production-grade React apps that load fast, work for everyone and stay easy to change.',
    includes: ['Single-page and multi-page apps', 'Responsive, accessible interfaces', 'Performance and Core Web Vitals'],
    art: 'browser',
  },
  {
    icon: 'server',
    title: 'APIs & Backends',
    text: 'Node.js and Express services on SQL databases, with authentication and clean integration patterns.',
    includes: ['REST API design and docs', 'Auth with JWTs and sessions', 'Database modelling in SQL'],
    art: 'api',
  },
  {
    icon: 'layers',
    title: 'Admin Panels & CMS',
    text: 'Internal tools and dashboards that let a team manage content and data without touching code.',
    includes: ['Editors for any content type', 'Sign-in and protected routes', 'Inbox and activity views'],
    art: 'dashboard',
  },
  {
    icon: 'sparkle',
    title: 'Interactive Experiences',
    text: 'Canvas, SVG and motion work that makes a product feel alive without costing performance.',
    includes: ['Canvas and generative visuals', 'Scroll and motion design', 'Reduced-motion friendly'],
    art: 'motion',
  },
];

/** Line drawings for the service cards. */
function ServiceArt({ kind }) {
  const frame = (
    <>
      <rect x="8" y="8" width="224" height="134" rx="12" className="sa-frame" />
      <path d="M8 30h224" className="sa-line" />
      <circle cx="22" cy="19" r="3" className="sa-dot" />
      <circle cx="33" cy="19" r="3" className="sa-dot" />
      <circle cx="44" cy="19" r="3" className="sa-dot" />
    </>
  );
  return (
    <svg className="service-art" viewBox="0 0 240 150" aria-hidden="true" focusable="false">
      {kind === 'browser' && (
        <>
          {frame}
          <rect x="24" y="46" width="104" height="12" rx="4" className="sa-fill" />
          <rect x="24" y="66" width="78" height="7" rx="3" className="sa-soft" />
          <rect x="24" y="79" width="92" height="7" rx="3" className="sa-soft" />
          <rect x="24" y="100" width="56" height="24" rx="12" className="sa-accent" />
          <rect x="146" y="46" width="70" height="80" rx="8" className="sa-soft" />
          <path d="M108 96l12 30 5-12 12-5z" className="sa-cursor" />
        </>
      )}
      {kind === 'api' && (
        <>
          <path d="M60 75h60M120 75l60-42M120 75l60 42" className="sa-wire" />
          <rect x="16" y="55" width="52" height="40" rx="9" className="sa-frame" />
          <rect x="96" y="55" width="52" height="40" rx="9" className="sa-accent" />
          <rect x="172" y="14" width="52" height="38" rx="9" className="sa-frame" />
          <rect x="172" y="98" width="52" height="38" rx="9" className="sa-frame" />
          <path d="M28 70h28M28 80h18M184 28h28M184 38h16M184 112h28M184 122h20" className="sa-line" />
          <path d="M113 69l-6 6 6 6M131 69l6 6-6 6" className="sa-glyph" />
          <circle r="3.5" className="sa-pulse">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M60 75h60l60-42" />
          </circle>
          <circle r="3.5" className="sa-pulse">
            <animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M60 75h60l60 42" />
          </circle>
        </>
      )}
      {kind === 'dashboard' && (
        <>
          {frame}
          <rect x="8" y="30" width="44" height="112" className="sa-soft" />
          <rect x="66" y="42" width="70" height="9" rx="4" className="sa-fill" />
          <rect x="176" y="40" width="42" height="13" rx="6.5" className="sa-accent" />
          {[34, 52, 20, 64, 44, 72].map((h, i) => (
            <rect key={i} x={70 + i * 24} y={128 - h} width="14" height={h} rx="3" className={i === 5 ? 'sa-accent' : 'sa-fill'} />
          ))}
        </>
      )}
      {kind === 'motion' && (
        <>
          {frame}
          <path d="M20 96q25-40 50 0t50 0 50 0 50 0" className="sa-wave" />
          <path d="M20 110q25-26 50 0t50 0 50 0 50 0" className="sa-line" />
          {[[46, 60, 4], [96, 52, 3], [150, 66, 5], [196, 50, 3], [120, 78, 2.5]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className="sa-spark" />
          ))}
        </>
      )}
    </svg>
  );
}

function Services() {
  return (
    <section id="services" className="section services" data-scene="0.5 0.22 1 1 0.35" data-scene-sm="0.5 0.1 0.55 1 0.55">
      <div className="container">
        <SectionHead kicker="What I build">
          What I can build for you, <span className="grad">end-to-end.</span>
        </SectionHead>
        <div className="service-stack">
          {SERVICES.map((s, i) => (
            <article key={s.title} className="service-card" style={{ '--i': i }}>
              <div className="service-main">
                <p className="service-num">
                  Service {pad(i + 1)} / {pad(SERVICES.length)}
                </p>
                <span className="service-icon">
                  <Icon name={s.icon} />
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                <a href="#contact" className="text-link">
                  Start this project <Icon name="arrowRight" />
                </a>
              </div>
              <div className="service-side">
                <ServiceArt kind={s.art} />
                <p className="service-includes-title">What&rsquo;s included</p>
                <ul className="service-includes">
                  {s.includes.map((item) => (
                    <li key={item}>
                      <Icon name="check" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <Reveal className="glass cta-bar" variant="scale">
          <div>
            <p className="kicker">Have something in mind?</p>
            <h3>Let&rsquo;s scope it together.</h3>
            <p className="muted">Tell me about the product or the role and I&rsquo;ll reply with a plan and next steps.</p>
          </div>
          <Pill href="#contact">Get in touch</Pill>
        </Reveal>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ work

/**
 * The selected projects, one at a time beside the big planet. On wide screens the section pins in
 * place, the project screens orbit the planet in the scene behind (see Scene in Space.jsx), and
 * scrolling swings each project round to the front. Scrolling sideways (a trackpad swipe or
 * Shift + wheel), dragging, the arrow keys, tabs and buttons all turn the orbit too, and it loops:
 * past the last project comes the first again. Clicking the front screen opens its case study.
 * Narrow screens get a single screen above the details instead.
 */
function Work({ projects }) {
  const n = projects.length;
  const pinned = useMediaQuery('(min-width: 900px)') && n > 0;
  const [scrolledTo, setScrolledTo] = useState(0); // the project spot the page has scrolled to (wide screens)
  const [shift, setShift] = useState(0); // projects turned past by swiping, dragging, the arrows and the tabs
  const [turn, setTurn] = useState(0);
  const sectionRef = useRef(null);
  const drag = useRef(null);
  const navigate = useNavigate();

  // How far round the orbit has turned, counted in projects. It counts on past the last project
  // (and below the first) instead of wrapping, so the orbit keeps turning the way you swipe.
  const position = scrolledTo + shift;
  const index = n ? mod(position, n) : 0;

  // Swing the orbit round to this spot
  useEffect(() => {
    planetControl.focus = position;
  }, [position]);

  useEffect(() => {
    if (!pinned) return;
    const onScroll = () => {
      const rect = sectionRef.current.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      setScrolledTo(Math.floor(clamp(-rect.top / span, 0, 0.9999) * n));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned, n]);

  const step = (by) => setShift((s) => s + by);
  // Tabs turn the shorter way round to their project
  function goTo(i) {
    const by = mod(i - index, n);
    step(by > n / 2 ? by - n : by);
  }

  // Sideways scrolling turns the orbit with the gesture, then settles on the project it reached
  useEffect(() => {
    if (n < 2) return;
    const el = sectionRef.current;
    const perProject = 220; // px of sideways scroll per project
    let travel = 0;
    let timer;
    const settle = () => {
      const steps = Math.round(travel / perProject);
      travel = 0;
      planetControl.drag = 0;
      setTurn(0);
      if (steps) setShift((s) => s + steps);
    };
    const onWheel = (e) => {
      const scale = e.deltaMode === 1 ? 16 : 1; // lines (some mice in Firefox) to pixels
      const dx = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0) * scale;
      if (!dx) return; // vertical scrolling still steps through the section
      e.preventDefault(); // also keeps the browser's swipe-to-go-back out of the way
      travel += dx;
      planetControl.drag = -(travel / perProject) * planetControl.step;
      setTurn(clamp(-travel / 6, -32, 32));
      clearTimeout(timer);
      timer = setTimeout(settle, 160);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('wheel', onWheel);
    };
  }, [n]);

  // Left and right arrow keys step through the projects while the showcase fills the screen
  useEffect(() => {
    if (n < 2) return;
    const onKey = (e) => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.3 || rect.bottom < window.innerHeight * 0.7) return;
      e.preventDefault();
      setShift((s) => s + (e.key === 'ArrowRight' ? 1 : -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [n]);

  const p = projects[index];
  const release = () => {
    drag.current = null;
    planetControl.drag = 0;
    setTurn(0);
  };
  const dragHandlers = {
    onPointerDown(e) {
      drag.current = { x: e.clientX, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove(e) {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 6) drag.current.moved = true;
      if (pinned) planetControl.drag = dx * 0.25;
      else setTurn(clamp(dx / 5, -32, 32));
      planetControl.nudge(e.movementX);
    },
    onPointerUp(e) {
      if (!drag.current) return;
      const { x, moved } = drag.current;
      const dx = e.clientX - x;
      release();
      if (!moved) navigate(`/projects/${p.id}`);
      else if (Math.abs(dx) > 80 && n > 1) step(dx < 0 ? 1 : -1);
    },
    onPointerCancel: release,
  };

  if (n === 0) {
    return (
      <section id="projects" className="section" data-scene="0.68 0.5 2.1 0 0.2">
        <div className="container">
          <div className="glass work-panel">
            <p className="kicker">Selected work</p>
            <h2>Projects are on their way.</h2>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="projects"
      ref={sectionRef}
      className={`work${pinned ? ' pinned' : ''}`}
      style={{ '--count': n }}
      data-scene="0.73 0.44 2.1 0 0.2 1"
      data-scene-sm="0.5 0.28 1.2 0 0.45 0"
    >
      <div className="work-sticky">
        <div className="container work-grid">
          <div className="glass work-panel">
            <p className="kicker">Selected work · {pad(n)}</p>
            <h2>
              Things I&rsquo;ve built <span className="grad">and shipped.</span>
            </h2>
            <div className="work-detail" key={p.id}>
              <p className="work-meta">{[`${pad(index + 1)} / ${pad(n)}`, p.role, p.year].filter(Boolean).join(' · ')}</p>
              <h3>
                <Link to={`/projects/${p.id}`}>{p.title}</Link>
              </h3>
              {p.summary && <p className="work-summary">{p.summary}</p>}
              <ul className="chip-row small">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <div className="actions">
                {p.live_url ? (
                  <Pill as={ExternalLink} href={p.live_url} icon="arrowUpRight">
                    Visit live
                  </Pill>
                ) : (
                  <Pill as={ExternalLink} href={p.repo_url} icon="github">
                    Source code
                  </Pill>
                )}
                <Link to={`/projects/${p.id}`} className="text-link">
                  Case study <Icon name="arrowRight" />
                </Link>
              </div>
            </div>
            <div className="work-pager">
              <button type="button" onClick={() => step(-1)} aria-label="Previous project">
                <Icon name="arrowLeft" />
              </button>
              <span>
                {pad(index + 1)} / {pad(n)}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next project">
                <Icon name="arrowRight" />
              </button>
              <span className="work-bignum" aria-hidden="true">
                {pad(index + 1)}
              </span>
            </div>
          </div>
          <div className="work-visual" aria-hidden="true" {...dragHandlers}>
            <div className="work-turn" style={{ transform: `rotateY(${turn}deg)` }}>
              <div className="work-screen" key={p.id}>
                <ProjectScreen project={p} index={index} theme={index % 2 ? 'dark' : 'light'} />
              </div>
            </div>
          </div>
        </div>
        <div className="container work-tabs">
          <p className="work-hint" aria-hidden="true">
            Drag or scroll sideways to turn the world
          </p>
          <div className="work-tablist" aria-label="Projects">
            {projects.map((proj, i) => (
              <button key={proj.id} type="button" className={i === index ? 'active' : undefined} aria-current={i === index ? 'true' : undefined} onClick={() => goTo(i)}>
                <span>{pad(i + 1)}</span>
                {proj.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ experience

/** A job description: bullet points when it's written one point per line, otherwise a paragraph. */
function Description({ text }) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return (
      <ul className="timeline-points">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    );
  }
  return lines.length ? <p>{lines[0]}</p> : null;
}

function Experience({ items }) {
  if (items.length === 0) return null;
  return (
    <section id="experience" className="section experience" data-scene="0.84 0.2 0.72 1 0.35" data-scene-sm="0.86 0.08 0.4 1 0.6">
      <div className="container">
        <SectionHead kicker="Career">
          Where I&rsquo;ve <span className="grad">worked.</span>
        </SectionHead>
        <ol className="timeline">
          {items.map((job, i) => (
            <Reveal as="li" key={job.id} variant="left" delay={Math.min(i, 5) * STAGGER}>
              <p className="timeline-date">{dateRange(job)}</p>
              <span className="timeline-node" aria-hidden="true" />
              <div className="timeline-body">
                <h3>{job.role}</h3>
                <p className="timeline-org">{[job.company, job.location].filter(Boolean).join(' · ')}</p>
                <Description text={job.description || ''} />
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ lab

const LAB_ITEMS = [
  { icon: 'flow', title: 'Flow field', text: 'Thousands of particles riding Perlin noise, painting trails as they go.' },
  { icon: 'sparkle', title: 'Kaleidoscope', text: 'One wedge of the canvas, mirrored around the centre and set spinning.' },
  { icon: 'pen', title: 'Symmetry brush', text: 'Paint with up to twelve mirrored strokes at once.' },
];

/** A live, hands-off preview of the flow-field playground; it only runs while on screen. */
function Lab() {
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const engine = new FlowField(canvasRef.current, { ...DEFAULT_SETTINGS, palette: 1, density: 900 });
    const stage = stageRef.current;
    let running = false;
    let timer;
    const sized = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) engine.resize(width, height);
    });
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        engine.start();
        running = true;
        timer = setTimeout(() => setWarm(true), 1600);
      } else if (!entry.isIntersecting && running) {
        engine.destroy();
        running = false;
      }
    });
    sized.observe(stage);
    seen.observe(stage);
    return () => {
      clearTimeout(timer);
      sized.disconnect();
      seen.disconnect();
      engine.destroy();
    };
  }, []);

  return (
    <section id="lab" className="section lab" data-scene="0.5 0.12 0 0 0.85" data-scene-sm="0.5 0.12 0 0 0.85">
      <div className="container">
        <SectionHead kicker="The lab">
          Experiments, <span className="grad">for the fun of it.</span>
        </SectionHead>
        <Reveal className="glass lab-stage" variant="scale">
          <div className="lab-canvas" ref={stageRef}>
            <canvas ref={canvasRef} aria-hidden="true" />
          </div>
          <p className={`lab-status${warm ? ' done' : ''}`} aria-hidden="true">
            Building the field.
          </p>
          <Pill as={Link} to="/flowfield" className="lab-enter">
            Enter the lab
          </Pill>
        </Reveal>
        <div className="lab-cards">
          {LAB_ITEMS.map((item, i) => (
            <Reveal as={Link} to="/flowfield" key={item.title} className="glass lab-card spot" delay={i * STAGGER}>
              <span className="lab-card-head">
                <span className="lab-icon">
                  <Icon name={item.icon} />
                </span>
                <span className="lab-num">{pad(i + 1)}</span>
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ contact

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
    <section id="contact" className="section contact" data-scene="0.84 0.24 0.6 1 0.6" data-scene-sm="0.86 0.08 0.4 1 0.7">
      <div className="container">
        <div className="glass contact-panel">
          <Reveal className="contact-intro" variant="left">
            <p className="kicker">Contact</p>
            <h2>
              Let&rsquo;s build something <span className="grad">worth using.</span>
            </h2>
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
            <SocialIcons profile={profile} />
          </Reveal>
          <Reveal as="form" className="form contact-form" variant="scale" delay={STAGGER} onSubmit={submit} noValidate>
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
            <Pill as="button" icon="send" disabled={status.state === 'sending'}>
              {status.state === 'sending' ? 'Sending…' : 'Send message'}
            </Pill>
            {status.state === 'sent' && <p className="notice success pop">Thanks! Your message was sent.</p>}
            {status.state === 'error' && <p className="notice error pop">{status.message}</p>}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ page

function HomeContent({ data, introAt }) {
  const { profile, experience, skills } = data;
  const projects = useMemo(() => ordered(data.projects), [data.projects]);
  const sections = sectionsFor(data);
  const active = useActiveSection(sections);
  const ready = introAt != null;

  return (
    <div className={`home${ready ? ' ready' : ''}`}>
      <Scene projects={projects} introAt={introAt} />
      <SiteNav profile={profile} sections={sections} active={active ?? 'home'} onHome />
      <main onPointerMove={spotlight}>
        <Hero profile={profile} />
        <About data={data} />
        <Stack skills={skills} />
        <Services />
        <Work projects={projects} />
        <Experience items={experience} />
        <Lab />
        <Contact profile={profile} />
      </main>
      <SiteFooter profile={profile} sections={sections} onHome />
      <ScrollHint />
      <HelperBot profile={profile} initials={initials(profile.name)} awake={ready} />
      <CursorRing />
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  // The loader plays once per visit; coming back to the home page goes straight to the intro.
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(INTRO_KEY);
    } catch {
      return true;
    }
  });
  const [introAt, setIntroAt] = useState(null);
  const { hash } = useLocation();

  useEffect(() => {
    getPortfolio()
      .then((d) => {
        setData(d);
        document.title = `${d.profile.name} · ${d.profile.title || 'Portfolio'}`;
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (data && !loading && introAt == null) setIntroAt(performance.now());
  }, [data, loading, introAt]);

  // No scrolling behind the loader
  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', loading);
    return () => document.documentElement.classList.remove('is-loading');
  }, [loading]);

  // Arriving from another page via /#projects: the section only exists once data has loaded.
  useEffect(() => {
    if (data && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [data, hash]);

  function finishLoading() {
    try {
      sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      /* storage blocked: the loader just plays again next time */
    }
    setLoading(false);
  }

  if (error) return <div className="center-screen notice error">{error}</div>;

  return (
    <>
      {loading && <Preloader name={data?.profile.name} initials={data ? initials(data.profile.name) : ''} ready={!!data} onDone={finishLoading} />}
      {data && <HomeContent data={data} introAt={introAt} />}
    </>
  );
}
