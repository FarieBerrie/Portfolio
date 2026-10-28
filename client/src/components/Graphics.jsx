// Decorative inline SVGs in the site's violet and orchid. Colors come from CSS variables
// (the --night-* / --violet-* / --orchid-* scale in styles.css). Everything here is aria-hidden.

const stop = (offset, color, opacity = 1) => <stop offset={offset} style={{ stopColor: `var(${color})`, stopOpacity: opacity }} />;

function Glow({ id, color, opacity }) {
  return (
    <radialGradient id={id}>
      {stop('0%', color, opacity)}
      {stop('100%', color, 0)}
    </radialGradient>
  );
}

/** A four-pointed sparkle centred on (cx, cy). */
export function sparklePath(cx, cy, r) {
  const k = r * 0.16;
  return `M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

/** The initials on a glowing violet tile: the brand mark in the nav, footer and loader. */
export function Monogram({ initials }) {
  return (
    <span className="monogram" aria-hidden="true">
      {initials}
    </span>
  );
}

// FNV-1a, so each project gets the same artwork on every render.
function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: a small seeded random generator for the artwork's details
function random(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORCHID = 'var(--orchid-300)';
const VIOLET = 'var(--violet-300)';

function topo(rnd) {
  const cx = 80 + rnd() * 160;
  const cy = 50 + rnd() * 80;
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  return Array.from({ length: 10 }, (_, i) => {
    const r = 14 + i * 17;
    const pts = Array.from({ length: 60 }, (_, k) => {
      const t = (k / 60) * Math.PI * 2;
      const w = 1 + 0.16 * Math.sin(3 * t + ph[0]) + 0.1 * Math.sin(5 * t + ph[1] + i * 0.3) + 0.06 * Math.sin(7 * t + ph[2]);
      return `${(cx + Math.cos(t) * r * w * 1.25).toFixed(1)} ${(cy + Math.sin(t) * r * w).toFixed(1)}`;
    });
    return <path key={i} d={`M${pts.join('L')}Z`} stroke={i % 3 === 0 ? ORCHID : VIOLET} strokeOpacity={i % 3 === 0 ? 0.7 : 0.35} />;
  });
}

function isometric(rnd) {
  const s = 18;
  const h = s * 0.577;
  const out = [];
  // Cubes on a hexagonal lattice, drawn top row first so nearer cubes overlap farther ones
  for (let row = -1; row < 8; row++) {
    for (let col = -1; col < 10; col++) {
      if (rnd() < 0.5) continue;
      const x = col * s * 2 + (Math.abs(row) % 2 ? s : 0);
      const y = row * (h + s);
      const lit = rnd() < 0.12;
      const top = `M${x} ${y - h}L${x + s} ${y}L${x} ${y + h}L${x - s} ${y}Z`;
      const left = `M${x - s} ${y}L${x} ${y + h}L${x} ${y + h + s}L${x - s} ${y + s}Z`;
      const right = `M${x + s} ${y}L${x} ${y + h}L${x} ${y + h + s}L${x + s} ${y + s}Z`;
      out.push(
        <g key={`${row}-${col}`} stroke="none">
          <path d={top} style={{ fill: lit ? 'var(--orchid-200)' : 'var(--violet-300)' }} fillOpacity={lit ? 0.9 : 0.28} />
          <path d={left} style={{ fill: lit ? 'var(--orchid-500)' : 'var(--violet-500)' }} fillOpacity={lit ? 0.9 : 0.35} />
          <path d={right} style={{ fill: lit ? 'var(--orchid-700)' : 'var(--violet-800)' }} fillOpacity={lit ? 0.9 : 0.5} />
        </g>,
      );
    }
  }
  return out;
}

function sunrise(rnd) {
  const cx = 90 + rnd() * 140;
  const out = [<circle key="sun" cx={cx} cy="128" r="46" style={{ fill: 'var(--orchid-300)' }} stroke="none" fillOpacity="0.9" />];
  for (let i = 1; i < 6; i++) out.push(<circle key={`r${i}`} cx={cx} cy="128" r={46 + i * 22} stroke={ORCHID} strokeOpacity={0.5 - i * 0.07} />);
  out.push(<rect key="sea" x="0" y="128" width="320" height="52" style={{ fill: 'var(--night-900)' }} stroke="none" fillOpacity="0.85" />);
  for (let i = 0; i < 7; i++) {
    const y = 134 + i * 7;
    const w = 90 - i * 10;
    out.push(<path key={`l${i}`} d={`M${cx - w / 2} ${y}h${w}`} stroke={i % 2 ? VIOLET : ORCHID} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />);
  }
  return out;
}

function circuit(rnd) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    let x = -10;
    let y = 14 + i * 19 + rnd() * 6;
    let d = `M${x} ${y}`;
    while (x < 330) {
      x += 30 + rnd() * 50;
      d += `H${x.toFixed(0)}`;
      if (rnd() < 0.5) {
        const dy = (rnd() < 0.5 ? -1 : 1) * 12;
        x += 12;
        y += dy;
        d += `L${x.toFixed(0)} ${y.toFixed(0)}`;
      }
    }
    const lit = i % 3 === 1;
    out.push(<path key={`p${i}`} d={d} stroke={lit ? ORCHID : VIOLET} strokeOpacity={lit ? 0.75 : 0.35} />);
    const nx = 40 + rnd() * 240;
    out.push(<circle key={`n${i}`} cx={nx} cy={14 + i * 19} r="3" style={{ fill: lit ? 'var(--orchid-300)' : 'var(--violet-300)' }} stroke="none" />);
  }
  return out;
}

function waves(rnd) {
  const amp = 10 + rnd() * 16;
  return Array.from({ length: 10 }, (_, i) => {
    const y = 8 + i * 19;
    return <path key={i} d={`M-10 ${y}Q70 ${y - amp} 150 ${y}T310 ${y}T470 ${y}`} stroke={i % 4 === 1 ? ORCHID : VIOLET} strokeOpacity={i % 4 === 1 ? 0.75 : 0.35} />;
  });
}

function constellation(rnd) {
  const pts = Array.from({ length: 18 }, () => [10 + rnd() * 300, 10 + rnd() * 160]);
  const out = [];
  pts.forEach(([x, y], i) => {
    pts.slice(i + 1).forEach(([x2, y2], j) => {
      if (Math.hypot(x2 - x, y2 - y) < 70) out.push(<line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke={VIOLET} strokeOpacity="0.35" />);
    });
  });
  pts.forEach(([x, y], i) => out.push(<path key={`s${i}`} d={sparklePath(x, y, i % 4 === 0 ? 7 : 3)} style={{ fill: i % 4 === 0 ? 'var(--orchid-300)' : 'var(--violet-200)' }} stroke="none" />));
  return out;
}

const VARIANTS = [topo, isometric, sunrise, circuit, waves, constellation];

/**
 * Generated cover art for projects without a screenshot: one of six violet-and-orchid patterns.
 * `index` (the project's place in the list) picks the pattern so neighbours never match;
 * the title seeds the details.
 */
export function ProjectArt({ seed, index }) {
  const h = hash(seed);
  const rnd = random(h);
  const variant = VARIANTS[(index ?? h) % VARIANTS.length];
  const angle = (h >>> 4) % 360;
  const id = `pa-${h}`;
  return (
    <svg className="project-art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-bg`} gradientTransform={`rotate(${angle} .5 .5)`}>
          {stop('0%', '--night-900')}
          {stop('60%', '--violet-800')}
          {stop('100%', '--violet-600')}
        </linearGradient>
        <Glow id={`${id}-glow`} color="--orchid-400" opacity={0.35} />
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-bg)`} />
      <circle cx={40 + ((h >>> 12) % 240)} cy={30 + ((h >>> 16) % 120)} r="120" fill={`url(#${id}-glow)`} />
      <g fill="none" strokeWidth="1.3">{variant(rnd)}</g>
    </svg>
  );
}

/** The host part of a URL ("example.com"), or '' when it isn't one. */
export function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * A project drawn as a browser window: its screenshot when it has one, otherwise a mock landing
 * page built from its title, summary and tech over its generated art. Sizes are in container
 * units, so the same screen works as a thumbnail in the planet's ring or full size in the showcase.
 */
export function ProjectScreen({ project, index, theme = 'dark' }) {
  return (
    <div className={`screen screen-${theme}`}>
      <span className="screen-bar">
        <b />
        <b />
        <b />
        <em>{hostname(project.live_url) || project.title}</em>
      </span>
      {project.image_url ? (
        <img className="screen-img" src={project.image_url} alt="" draggable="false" />
      ) : (
        <div className="screen-page">
          <span className="screen-nav">
            <i className="screen-logo" />
            {project.title}
            <i />
            <i />
            <i />
          </span>
          <span className="screen-hero">
            <span className="screen-copy">
              <strong>{project.title}</strong>
              {project.summary && <span className="screen-sum">{project.summary}</span>}
              <span className="screen-cta">{project.live_url ? 'Visit site' : 'View code'}</span>
            </span>
            <span className="screen-art">
              <ProjectArt seed={project.title} index={index} />
            </span>
          </span>
          <span className="screen-chips">
            {project.tech.slice(0, 3).map((t) => (
              <i key={t}>{t}</i>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
