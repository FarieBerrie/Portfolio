import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icons.jsx';
import { Monogram } from './Graphics.jsx';
import { ExternalLink } from './SiteChrome.jsx';
import { useScrolled } from './Reveal.jsx';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The opening screen: a glowing orb, the name spelling itself out and a counter to 100%.
 * The count runs on a clock but holds below 100 until `ready` (the portfolio data has arrived),
 * then the screen fades away and `onDone` fires.
 */
export function Preloader({ name, initials, ready, onDone }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const duration = prefersReducedMotion() ? 300 : 2200;
    const start = performance.now();
    let frame;
    let timer;
    const tick = (now) => {
      const clock = 1 - Math.pow(1 - Math.min(1, (now - start) / duration), 2);
      const p = Math.min(clock * 100, readyRef.current ? 100 : 90);
      setProgress(p);
      if (p < 100) {
        frame = requestAnimationFrame(tick);
        return;
      }
      timer = setTimeout(() => {
        setLeaving(true);
        timer = setTimeout(() => doneRef.current(), 700);
      }, 200);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);

  const letters = [...(name || '')];
  return (
    <div className={`preloader${leaving ? ' leaving' : ''}`} role="status" aria-label="Loading">
      <div className="pl-orb">
        <Monogram initials={initials || ''} />
      </div>
      <p className="pl-name" aria-hidden="true">
        {letters.map((ch, i) => (
          <span key={i} className={progress / 100 > (i + 1) / (letters.length + 1) ? 'on' : undefined}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </p>
      <p className="pl-count">
        {Math.round(progress)}
        <sup>%</sup>
      </p>
      <span className="pl-bar">
        <i style={{ transform: `scaleX(${progress / 100})` }} />
      </span>
      <p className="pl-caption">Preparing the world</p>
    </div>
  );
}

/** A soft ring that trails the pointer and swells over anything clickable (mouse and pen only). */
export function CursorRing() {
  const ref = useRef(null);

  useEffect(() => {
    if (!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches || prefersReducedMotion()) return;
    const el = ref.current;
    const at = { x: -100, y: -100 };
    const pos = { ...at };
    let frame = 0;
    const tick = () => {
      pos.x += (at.x - pos.x) * 0.22;
      pos.y += (at.y - pos.y) * 0.22;
      el.style.translate = `${pos.x}px ${pos.y}px`;
      frame = Math.hypot(at.x - pos.x, at.y - pos.y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e) => {
      at.x = e.clientX;
      at.y = e.clientY;
      el.classList.add('on');
      el.classList.toggle('hover', !!e.target.closest?.('a, button, [role="tab"], input, textarea, label'));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = () => el.classList.remove('on');
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <div className="cursor-ring" ref={ref} aria-hidden="true" />;
}

function Robot() {
  return (
    <svg className="robot" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="robot-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a58bff" />
          <stop offset="1" stopColor="#5b2ee6" />
        </linearGradient>
      </defs>
      <line x1="32" y1="5" x2="32" y2="13" stroke="#b9a6ff" strokeWidth="2" strokeLinecap="round" />
      <circle className="robot-antenna" cx="32" cy="5" r="3.2" fill="#f0abfc" />
      <rect x="6" y="20" width="5" height="11" rx="2.5" fill="#6d43f5" />
      <rect x="53" y="20" width="5" height="11" rx="2.5" fill="#6d43f5" />
      <rect x="10" y="12" width="44" height="28" rx="12" fill="url(#robot-shell)" />
      <rect x="15" y="17" width="34" height="18" rx="8" fill="#140a2e" />
      <g className="robot-eyes" fill="#c4f1ff">
        <rect x="21" y="22" width="7" height="8" rx="3.5" />
        <rect x="36" y="22" width="7" height="8" rx="3.5" />
      </g>
      <rect x="20" y="43" width="24" height="15" rx="5" fill="url(#robot-shell)" />
      <rect x="25" y="47" width="14" height="7" rx="2" fill="#140a2e" />
      <circle cx="32" cy="50.5" r="1.6" fill="#f0abfc" />
    </svg>
  );
}

/**
 * The little robot in the corner: says hello once the page has loaded, then opens a menu of
 * shortcuts around the site.
 */
export function HelperBot({ profile, initials, awake }) {
  const [open, setOpen] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!awake) return;
    const show = setTimeout(() => setGreeting(true), 1400);
    const hide = setTimeout(() => setGreeting(false), 8000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [awake]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onClick = (e) => !rootRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onClick);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div className={`bot${open ? ' open' : ''}${greeting && !open ? ' greeting' : ''}`} ref={rootRef}>
      <nav id="bot-menu" className="bot-menu" aria-label="Shortcuts" hidden={!open}>
        <p className="bot-title">Where to next?</p>
        <a href="#projects" onClick={close}>
          <Icon name="grid" /> See the work
        </a>
        <a href="#about" onClick={close}>
          <Icon name="user" /> About me
        </a>
        <a href="#contact" onClick={close}>
          <Icon name="send" /> Get in touch
        </a>
        <Link to="/flowfield">
          <Icon name="flow" /> Open the lab
        </Link>
        <ExternalLink href={profile.resume_url}>
          <Icon name="file" /> Résumé
        </ExternalLink>
        <a href="#home" onClick={close}>
          <Icon name="arrowUp" /> Back to top
        </a>
      </nav>
      <p className="bot-bubble" aria-hidden="true">
        Hi there! <span className="wave">👋</span> I&rsquo;m {initials}-bot.
      </p>
      <button type="button" className="bot-button" aria-label="Shortcuts" aria-expanded={open} aria-controls="bot-menu" onClick={() => setOpen((o) => !o)}
        onPointerEnter={() => setGreeting(true)}
        onPointerLeave={() => setGreeting(false)}
      >
        <Robot />
      </button>
    </div>
  );
}

/** "Scroll" written up the right edge, with a falling bead; it bows out once the visitor scrolls. */
export function ScrollHint() {
  const scrolled = useScrolled(80);
  return (
    <a href="#about" className={`scroll-hint${scrolled ? ' gone' : ''}`} aria-label="Scroll to About" tabIndex={scrolled ? -1 : 0}>
      <span>Scroll</span>
      <i />
    </a>
  );
}
