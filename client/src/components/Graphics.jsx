// Decorative inline SVGs in the site's blue and gold. Colors come from CSS variables (the
// --blue-* / --gold-* brand scale, plus --line and --dot, which follow the light/dark theme).
// Everything here is aria-hidden; animation lives in styles.css and stops for reduced motion.

const stop = (offset, color, opacity = 1) => <stop offset={offset} style={{ stopColor: `var(${color})`, stopOpacity: opacity }} />;

function GoldGradient({ id, ...props }) {
  return (
    <linearGradient id={id} {...props}>
      {stop('0%', '--gold-200')}
      {stop('50%', '--gold-400')}
      {stop('100%', '--gold-600')}
    </linearGradient>
  );
}

function BlueGoldGradient({ id, ...props }) {
  return (
    <linearGradient id={id} {...props}>
      {stop('0%', '--blue-400')}
      {stop('60%', '--blue-300')}
      {stop('100%', '--gold-400')}
    </linearGradient>
  );
}

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

const STARS = [
  [180, 120, 9],
  [1040, 90, 12],
  [640, 70, 6],
  [1130, 420, 8],
  [90, 470, 7],
  [760, 560, 10],
  [430, 610, 6],
];

// A loose constellation drawn across the upper right of the hero
const NODES = [
  [700, 150],
  [790, 110],
  [880, 170],
  [960, 120],
  [1050, 210],
  [930, 260],
  [830, 240],
];
const LINKS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 2],
];

/** The backdrop for dark ("ink") panels: a fading grid, drifting light, a constellation and sparkles. */
export function HeroBackdrop() {
  return (
    <svg className="hero-backdrop" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <Glow id="hb-blue" color="--blue-500" opacity={0.55} />
        <Glow id="hb-royal" color="--blue-700" opacity={0.7} />
        <Glow id="hb-gold" color="--gold-400" opacity={0.3} />
        <GoldGradient id="hb-goldline" x1="0" y1="0" x2="1" y2="0" />
        <linearGradient id="hb-meteor" x1="0" y1="0" x2="1" y2="0">
          {stop('0%', '--gold-200', 0)}
          {stop('100%', '--gold-200', 0.9)}
        </linearGradient>
        <pattern id="hb-grid" width="56" height="56" patternUnits="userSpaceOnUse">
          <path d="M56 0H0V56" fill="none" style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.09" />
        </pattern>
        <radialGradient id="hb-fade" cx="62%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="hb-mask">
          <rect width="1200" height="700" fill="url(#hb-fade)" />
        </mask>
      </defs>

      <circle className="blob b1" cx="980" cy="140" r="420" fill="url(#hb-royal)" />
      <circle className="blob b2" cx="120" cy="620" r="380" fill="url(#hb-blue)" />
      <circle className="blob b3" cx="700" cy="720" r="300" fill="url(#hb-gold)" />

      <rect width="1200" height="700" fill="url(#hb-grid)" mask="url(#hb-mask)" />

      {/* Wide arcs, as if from a planet just out of frame */}
      <g fill="none" strokeWidth="1.2">
        <circle cx="1180" cy="760" r="420" style={{ stroke: 'var(--blue-400)' }} strokeOpacity="0.18" />
        <circle cx="1180" cy="760" r="520" stroke="url(#hb-goldline)" strokeOpacity="0.35" strokeDasharray="2 10" className="spin-slow" />
        <circle cx="1180" cy="760" r="640" style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.1" />
      </g>

      <g className="constellation">
        <g style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.28" strokeWidth="1">
          {LINKS.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
          ))}
        </g>
        {NODES.map(([x, y], i) => (
          <circle key={i} className={`node n${i % 3}`} cx={x} cy={y} r={i % 3 === 0 ? 3.5 : 2.2} style={{ fill: i % 2 ? 'var(--blue-300)' : 'var(--gold-300)' }} />
        ))}
      </g>

      <g style={{ fill: 'var(--gold-300)' }}>
        {STARS.map(([x, y, r], i) => (
          <path key={i} className={`twinkle t${i % 4}`} d={sparklePath(x, y, r)} />
        ))}
      </g>

      {/* The streak animates along its own length, inside a group that sets its angle */}
      <g transform="translate(300 90) rotate(18)">
        <line className="meteor" x1="0" y1="0" x2="160" y2="0" stroke="url(#hb-meteor)" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

/** Rings, a watch-bezel of ticks and orbiting planets around the avatar. */
export function AvatarOrbit() {
  return (
    <svg className="orbit" viewBox="0 0 340 340" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id="ao-gold" x1="0" y1="0" x2="1" y2="1" />
        <BlueGoldGradient id="ao-blue" x1="1" y1="0" x2="0" y2="1" />
        <Glow id="ao-halo" color="--blue-500" opacity={0.45} />
      </defs>
      <circle cx="170" cy="170" r="168" fill="url(#ao-halo)" />
      <g style={{ stroke: 'var(--gold-300)' }} strokeOpacity="0.45" strokeWidth="1">
        {TICKS.map((a) => {
          const long = a % 30 === 0;
          const r0 = long ? 143 : 147;
          const t = (a * Math.PI) / 180;
          return <line key={a} x1={170 + Math.cos(t) * r0} y1={170 + Math.sin(t) * r0} x2={170 + Math.cos(t) * 151} y2={170 + Math.sin(t) * 151} strokeOpacity={long ? 0.9 : 0.4} />;
        })}
      </g>
      <g className="spin">
        <circle cx="170" cy="170" r="162" fill="none" stroke="url(#ao-gold)" strokeWidth="1.5" strokeDasharray="1 7" strokeLinecap="round" />
        <circle cx="170" cy="8" r="6" style={{ fill: 'var(--gold-300)' }} />
        <circle cx="170" cy="8" r="11" fill="none" style={{ stroke: 'var(--gold-300)' }} strokeOpacity="0.4" />
      </g>
      <g className="spin-reverse">
        <circle cx="170" cy="170" r="134" fill="none" stroke="url(#ao-blue)" strokeWidth="1.2" strokeOpacity="0.7" />
        <circle cx="36" cy="170" r="4.5" style={{ fill: 'var(--blue-300)' }} />
        <circle cx="304" cy="170" r="3" style={{ fill: 'var(--gold-400)' }} />
      </g>
      <g style={{ fill: 'var(--gold-200)' }}>
        <path className="twinkle t1" d={sparklePath(300, 52, 9)} />
        <path className="twinkle t3" d={sparklePath(40, 290, 6)} />
      </g>
    </svg>
  );
}

/** A hand-drawn gold stroke that draws itself under a highlighted word. */
export function Underline() {
  return (
    <svg className="underline" viewBox="0 0 220 24" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id="ul-gold" x1="0" y1="0" x2="1" y2="0" />
      </defs>
      <path d="M4 17C52 7 120 3 216 9" fill="none" stroke="url(#ul-gold)" strokeWidth="5" strokeLinecap="round" pathLength="1" />
      <path d="M40 21C90 15 140 13 196 15" fill="none" stroke="url(#ul-gold)" strokeWidth="2.5" strokeLinecap="round" pathLength="1" opacity="0.6" />
    </svg>
  );
}

export function ScrollCue() {
  return (
    <svg className="scroll-cue" viewBox="0 0 24 36" aria-hidden="true" focusable="false">
      <rect x="1.5" y="1.5" width="21" height="33" rx="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle className="wheel" cx="12" cy="10" r="2.2" style={{ fill: 'var(--gold-300)' }} />
    </svg>
  );
}

/** The site's mark: initials on a blue tile inside a gold diamond. */
export function Monogram({ initials }) {
  return (
    <svg className="monogram" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="mg-tile" x1="0" y1="0" x2="1" y2="1">
          {stop('0%', '--blue-500')}
          {stop('100%', '--blue-800')}
        </linearGradient>
        <GoldGradient id="mg-gold" x1="0" y1="0" x2="1" y2="1" />
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#mg-tile)" />
      <path d="M20 5.5 34.5 20 20 34.5 5.5 20Z" fill="none" stroke="url(#mg-gold)" strokeWidth="1.4" />
      <text x="20" y="24.4" textAnchor="middle" className="monogram-text">
        {initials}
      </text>
    </svg>
  );
}

/** Gold arcs and a dot grid that sit in a section's margin. */
export function CornerDecor({ className = '' }) {
  return (
    <svg className={`corner-decor ${className}`} viewBox="0 0 220 220" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id={`cd-gold-${className || 'r'}`} x1="0" y1="0" x2="1" y2="1" />
      </defs>
      <g fill="none" stroke={`url(#cd-gold-${className || 'r'})`} strokeWidth="1.4">
        <path d="M150 20a70 70 0 0 1 0 140" opacity="0.8" />
        <path d="M150 44a46 46 0 0 1 0 92" strokeDasharray="2 7" strokeLinecap="round" />
        <circle cx="150" cy="20" r="3.5" style={{ fill: 'var(--gold-400)' }} />
      </g>
      <g style={{ fill: 'var(--dot)' }}>
        {Array.from({ length: 30 }, (_, i) => (
          <circle key={i} cx={22 + (i % 6) * 14} cy={130 + Math.floor(i / 6) * 14} r="1.8" />
        ))}
      </g>
      <path d={sparklePath(64, 70, 10)} style={{ fill: 'var(--blue-400)' }} className="twinkle t2" />
    </svg>
  );
}

const CODE = [
  // [indent, width, color] per line: a code editor's worth of syntax-coloured bars
  [[0, 34, 'k'], [38, 60, 'f'], [102, 18, 'p']],
  [[16, 40, 'k'], [60, 70, 'v'], [134, 30, 's']],
  [[16, 26, 'k'], [46, 90, 'f']],
  [[32, 54, 'v'], [90, 22, 'p'], [116, 64, 's']],
  [[32, 80, 'f'], [116, 26, 'p']],
  [[16, 14, 'p']],
  [[16, 44, 'k'], [64, 50, 'v']],
  [[0, 14, 'p']],
];
const SYNTAX = { k: '--blue-400', f: '--gold-300', v: '--blue-200', s: '--gold-500', p: '--ink-muted' };

/** A small editor window with syntax-coloured lines and a blinking cursor. */
export function CodeWindow() {
  return (
    <svg className="code-window" viewBox="0 0 320 210" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="cw-bg" x1="0" y1="0" x2="0" y2="1">
          {stop('0%', '--navy-800')}
          {stop('100%', '--navy-900')}
        </linearGradient>
        <Glow id="cw-glow" color="--gold-400" opacity={0.25} />
      </defs>
      <rect x="0.5" y="0.5" width="319" height="209" rx="14" fill="url(#cw-bg)" style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.2" />
      <circle cx="270" cy="170" r="90" fill="url(#cw-glow)" />
      <path d="M0.5 36.5h319" style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.15" />
      <circle cx="20" cy="18.5" r="5" style={{ fill: 'var(--gold-400)' }} />
      <circle cx="37" cy="18.5" r="5" style={{ fill: 'var(--blue-400)' }} />
      <circle cx="54" cy="18.5" r="5" style={{ fill: 'var(--ink-muted)' }} opacity="0.5" />
      <rect x="120" y="12" width="80" height="13" rx="6.5" style={{ fill: 'var(--blue-300)' }} opacity="0.12" />
      {CODE.map((line, i) => (
        <g key={i}>
          <text x="20" y={60 + i * 18} className="code-num">
            {i + 1}
          </text>
          {line.map(([x, w, c], j) => (
            <rect key={j} className="code-bar" style={{ fill: `var(${SYNTAX[c]})`, '--i': i }} x={44 + x} y={53 + i * 18} width={w} height="7" rx="3.5" />
          ))}
        </g>
      ))}
      <rect className="cursor" x="74" y={52 + 7 * 18} width="2.5" height="10" rx="1" style={{ fill: 'var(--gold-300)' }} />
    </svg>
  );
}

/** A paper plane looping in on a dashed trail. */
export function PaperPlane() {
  return (
    <svg className="paper-plane" viewBox="0 0 320 220" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id="pp-gold" x1="0" y1="0" x2="1" y2="1" />
        <linearGradient id="pp-blue" x1="0" y1="0" x2="1" y2="1">
          {stop('0%', '--blue-400')}
          {stop('100%', '--blue-700')}
        </linearGradient>
      </defs>
      <path
        className="trail"
        d="M10 200C60 196 92 170 96 140 100 108 70 96 58 116 44 140 82 160 120 150 170 137 196 92 236 70"
        fill="none"
        style={{ stroke: 'var(--line)' }}
        strokeWidth="2"
        strokeDasharray="6 8"
        strokeLinecap="round"
      />
      <g className="plane">
        <path d="M232 70 304 26 278 104 256 84Z" fill="url(#pp-gold)" />
        <path d="M232 70 304 26 256 84Z" fill="url(#pp-blue)" />
        <path d="M256 84 262 108 272 94" fill="url(#pp-blue)" opacity="0.8" />
      </g>
      <g style={{ fill: 'var(--gold-400)' }}>
        <path className="twinkle t0" d={sparklePath(180, 30, 8)} />
        <path className="twinkle t2" d={sparklePath(40, 70, 6)} />
        <path className="twinkle t3" d={sparklePath(290, 150, 7)} />
      </g>
      <g style={{ fill: 'var(--dot)' }}>
        <circle cx="210" cy="170" r="3" />
        <circle cx="226" cy="186" r="2" />
        <circle cx="140" cy="40" r="2.5" />
      </g>
    </svg>
  );
}

// Places on the footer globe, as [longitude°, latitude°]
const PLACES = [
  [-20, 25],
  [35, 40],
  [60, -10],
  [-45, -25],
  [10, -40],
];

/** A wireframe globe with pulsing gold places and an arc flying between two of them. */
export function Globe() {
  const R = 150;
  const project = ([lon, lat]) => {
    const l = (lon * Math.PI) / 180;
    const p = (lat * Math.PI) / 180;
    return [160 + R * Math.cos(p) * Math.sin(l), 160 - R * Math.sin(p)];
  };
  const [a, b] = [project(PLACES[0]), project(PLACES[1])];
  return (
    <svg className="globe" viewBox="0 0 320 320" aria-hidden="true" focusable="false">
      <defs>
        <GoldGradient id="gl-gold" x1="0" y1="0" x2="1" y2="0" />
        <Glow id="gl-glow" color="--blue-500" opacity={0.35} />
      </defs>
      <circle cx="160" cy="160" r="160" fill="url(#gl-glow)" />
      <g fill="none" style={{ stroke: 'var(--blue-300)' }} strokeOpacity="0.22" strokeWidth="1">
        <circle cx="160" cy="160" r={R} strokeOpacity="0.4" />
        {[0.25, 0.5, 0.75].map((k) => (
          <g key={k}>
            <ellipse cx="160" cy="160" rx={R * k} ry={R} />
            <ellipse cx="160" cy={160 - R * Math.sin(k * 1.2)} rx={R * Math.cos(k * 1.2)} ry={R * Math.cos(k * 1.2) * 0.12} />
            <ellipse cx="160" cy={160 + R * Math.sin(k * 1.2)} rx={R * Math.cos(k * 1.2)} ry={R * Math.cos(k * 1.2) * 0.12} />
          </g>
        ))}
        <ellipse cx="160" cy="160" rx={R} ry={R * 0.12} />
        <line x1="160" y1="10" x2="160" y2="310" />
      </g>
      <path className="flight" d={`M${a[0]} ${a[1]}Q${(a[0] + b[0]) / 2} ${Math.min(a[1], b[1]) - 70} ${b[0]} ${b[1]}`} fill="none" stroke="url(#gl-gold)" strokeWidth="1.6" strokeDasharray="4 6" strokeLinecap="round" />
      {PLACES.map((pl, i) => {
        const [x, y] = project(pl);
        return (
          <g key={i}>
            <circle className={`ping p${i % 3}`} cx={x} cy={y} r="9" fill="none" style={{ stroke: 'var(--gold-300)' }} />
            <circle cx={x} cy={y} r="3" style={{ fill: 'var(--gold-300)' }} />
          </g>
        );
      })}
    </svg>
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

const GOLD = 'var(--gold-300)';
const BLUE = 'var(--blue-300)';

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
    return <path key={i} d={`M${pts.join('L')}Z`} stroke={i % 3 === 0 ? GOLD : BLUE} strokeOpacity={i % 3 === 0 ? 0.7 : 0.35} />;
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
      const gold = rnd() < 0.12;
      const top = `M${x} ${y - h}L${x + s} ${y}L${x} ${y + h}L${x - s} ${y}Z`;
      const left = `M${x - s} ${y}L${x} ${y + h}L${x} ${y + h + s}L${x - s} ${y + s}Z`;
      const right = `M${x + s} ${y}L${x} ${y + h}L${x} ${y + h + s}L${x + s} ${y + s}Z`;
      out.push(
        <g key={`${row}-${col}`} stroke="none">
          <path d={top} style={{ fill: gold ? 'var(--gold-200)' : 'var(--blue-300)' }} fillOpacity={gold ? 0.9 : 0.28} />
          <path d={left} style={{ fill: gold ? 'var(--gold-500)' : 'var(--blue-500)' }} fillOpacity={gold ? 0.9 : 0.35} />
          <path d={right} style={{ fill: gold ? 'var(--gold-700)' : 'var(--blue-800)' }} fillOpacity={gold ? 0.9 : 0.5} />
        </g>,
      );
    }
  }
  return out;
}

function sunrise(rnd) {
  const cx = 90 + rnd() * 140;
  const out = [<circle key="sun" cx={cx} cy="128" r="46" style={{ fill: 'var(--gold-300)' }} stroke="none" fillOpacity="0.9" />];
  for (let i = 1; i < 6; i++) out.push(<circle key={`r${i}`} cx={cx} cy="128" r={46 + i * 22} stroke={GOLD} strokeOpacity={0.5 - i * 0.07} />);
  out.push(<rect key="sea" x="0" y="128" width="320" height="52" style={{ fill: 'var(--navy-900)' }} stroke="none" fillOpacity="0.85" />);
  for (let i = 0; i < 7; i++) {
    const y = 134 + i * 7;
    const w = 90 - i * 10;
    out.push(<path key={`l${i}`} d={`M${cx - w / 2} ${y}h${w}`} stroke={i % 2 ? BLUE : GOLD} strokeOpacity="0.6" strokeWidth="2" strokeLinecap="round" />);
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
    const gold = i % 3 === 1;
    out.push(<path key={`p${i}`} d={d} stroke={gold ? GOLD : BLUE} strokeOpacity={gold ? 0.75 : 0.35} />);
    const nx = 40 + rnd() * 240;
    out.push(<circle key={`n${i}`} cx={nx} cy={14 + i * 19} r="3" style={{ fill: gold ? 'var(--gold-300)' : 'var(--blue-300)' }} stroke="none" />);
  }
  return out;
}

function waves(rnd) {
  const amp = 10 + rnd() * 16;
  return Array.from({ length: 10 }, (_, i) => {
    const y = 8 + i * 19;
    return <path key={i} d={`M-10 ${y}Q70 ${y - amp} 150 ${y}T310 ${y}T470 ${y}`} stroke={i % 4 === 1 ? GOLD : BLUE} strokeOpacity={i % 4 === 1 ? 0.75 : 0.35} />;
  });
}

function constellation(rnd) {
  const pts = Array.from({ length: 18 }, () => [10 + rnd() * 300, 10 + rnd() * 160]);
  const out = [];
  pts.forEach(([x, y], i) => {
    pts.slice(i + 1).forEach(([x2, y2], j) => {
      if (Math.hypot(x2 - x, y2 - y) < 70) out.push(<line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke={BLUE} strokeOpacity="0.35" />);
    });
  });
  pts.forEach(([x, y], i) => out.push(<path key={`s${i}`} d={sparklePath(x, y, i % 4 === 0 ? 7 : 3)} style={{ fill: i % 4 === 0 ? 'var(--gold-300)' : 'var(--blue-200)' }} stroke="none" />));
  return out;
}

const VARIANTS = [topo, isometric, sunrise, circuit, waves, constellation];

/**
 * Generated cover art for projects without a screenshot: one of six blue-and-gold patterns.
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
          {stop('0%', '--navy-900')}
          {stop('60%', '--blue-800')}
          {stop('100%', '--blue-600')}
        </linearGradient>
        <Glow id={`${id}-glow`} color="--gold-400" opacity={0.35} />
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-bg)`} />
      <circle cx={40 + ((h >>> 12) % 240)} cy={30 + ((h >>> 16) % 120)} r="120" fill={`url(#${id}-glow)`} />
      <g fill="none" strokeWidth="1.3">{variant(rnd)}</g>
    </svg>
  );
}
