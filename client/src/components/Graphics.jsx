// Decorative inline SVGs. Colors come from CSS variables (--blue, --violet, --purple, --dot)
// so every graphic follows the light/dark theme. All are aria-hidden.

function Gradient({ id, ...props }) {
  return (
    <linearGradient id={id} {...props}>
      <stop offset="0%" style={{ stopColor: 'var(--blue)' }} />
      <stop offset="55%" style={{ stopColor: 'var(--violet)' }} />
      <stop offset="100%" style={{ stopColor: 'var(--purple)' }} />
    </linearGradient>
  );
}

function Blob({ id, color, opacity }) {
  return (
    <radialGradient id={id}>
      <stop offset="0%" style={{ stopColor: `var(${color})`, stopOpacity: opacity }} />
      <stop offset="100%" style={{ stopColor: `var(${color})`, stopOpacity: 0 }} />
    </radialGradient>
  );
}

export function HeroBackdrop() {
  return (
    <svg className="hero-backdrop" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <Blob id="pf-blob-blue" color="--blue" opacity={0.45} />
        <Blob id="pf-blob-violet" color="--violet" opacity={0.35} />
        <Blob id="pf-blob-purple" color="--purple" opacity={0.45} />
        <Gradient id="pf-stroke" x1="0" y1="0" x2="1" y2="1" />
        <pattern id="pf-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" style={{ fill: 'var(--dot)' }} />
        </pattern>
        <radialGradient id="pf-dot-fade" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id="pf-dot-mask">
          <rect width="1200" height="640" fill="url(#pf-dot-fade)" />
        </mask>
      </defs>

      <rect width="1200" height="640" fill="url(#pf-dots)" mask="url(#pf-dot-mask)" />

      <circle className="blob b1" cx="960" cy="170" r="340" fill="url(#pf-blob-purple)" />
      <circle className="blob b2" cx="160" cy="540" r="320" fill="url(#pf-blob-blue)" />
      <circle className="blob b3" cx="620" cy="60" r="240" fill="url(#pf-blob-violet)" />

      <g fill="none" stroke="url(#pf-stroke)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <g className="float f1">
          <circle cx="60" cy="140" r="26" />
        </g>
        <g className="float f2">
          <path d="M1090 450 l30 52 h-60 z" />
        </g>
        <g className="float f3">
          <path d="M560 430 q20 -24 40 0 t40 0 t40 0 t40 0" />
        </g>
        <g className="float f4">
          <path d="M1020 300 v28 M1006 314 h28" />
        </g>
        <g className="float f5">
          <path d="M400 110 v20 M390 120 h20" />
        </g>
        <g className="float f6">
          <rect x="800" y="540" width="26" height="26" rx="5" transform="rotate(20 813 553)" />
        </g>
        <g className="float f2">
          <circle cx="700" cy="230" r="6" />
        </g>
      </g>
    </svg>
  );
}

export function AvatarOrbit() {
  return (
    <svg className="orbit" viewBox="0 0 300 300" aria-hidden="true" focusable="false">
      <defs>
        <Gradient id="pf-orbit" x1="0" y1="0" x2="1" y2="1" />
      </defs>
      <g className="spin">
        <circle cx="150" cy="150" r="140" fill="none" stroke="url(#pf-orbit)" strokeWidth="1.5" strokeDasharray="4 10" />
        <circle cx="150" cy="10" r="6" style={{ fill: 'var(--purple)' }} />
      </g>
      <g className="spin-reverse">
        <circle cx="150" cy="150" r="125" fill="none" stroke="url(#pf-orbit)" strokeWidth="1" opacity="0.5" />
        <circle cx="25" cy="150" r="4.5" style={{ fill: 'var(--blue)' }} />
        <circle cx="275" cy="150" r="3" style={{ fill: 'var(--violet)' }} />
      </g>
    </svg>
  );
}

const WAVE = 'M0 50 C 240 10 480 90 720 50 S 1200 10 1440 50';

export function WaveDivider() {
  return (
    <svg className="wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <Gradient id="pf-wave" x1="0" y1="0" x2="1" y2="0" />
      </defs>
      <path d={`${WAVE} V90 H0 Z`} style={{ fill: 'var(--bg)' }} />
      <path d={WAVE} fill="none" stroke="url(#pf-wave)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function CornerDecor({ className = '' }) {
  return (
    <svg className={`corner-decor ${className}`} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>
        <Gradient id="pf-corner" x1="0" y1="0" x2="1" y2="1" />
      </defs>
      <g fill="none" stroke="url(#pf-corner)" strokeWidth="1.5" opacity="0.6">
        <circle cx="140" cy="60" r="56" />
        <circle cx="140" cy="60" r="36" strokeDasharray="3 6" />
      </g>
      <g style={{ fill: 'var(--dot)' }}>
        {Array.from({ length: 25 }, (_, i) => (
          <circle key={i} cx={24 + (i % 5) * 14} cy={112 + Math.floor(i / 5) * 14} r="2" />
        ))}
      </g>
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

/** Generated cover art for projects without a screenshot. */
export function ProjectArt({ seed }) {
  const h = hash(seed);
  const variant = h % 3;
  const angle = (h >>> 4) % 360;
  const id = `pf-art-${h}`;

  let pattern;
  if (variant === 0) {
    const cx = 60 + ((h >>> 8) % 200);
    pattern = Array.from({ length: 9 }, (_, i) => <circle key={i} cx={cx} cy="90" r={18 + i * 22} />);
  } else if (variant === 1) {
    const amp = 12 + ((h >>> 8) % 18);
    pattern = Array.from({ length: 9 }, (_, i) => {
      const y = 10 + i * 22;
      return <path key={i} d={`M-10 ${y} Q 70 ${y - amp} 150 ${y} T 310 ${y} T 470 ${y}`} />;
    });
  } else {
    pattern = [];
    for (let x = 20; x < 320; x += 40) {
      for (let y = 20; y < 180; y += 40) {
        const filled = (h >>> ((x + y) % 24)) & 1;
        pattern.push(
          <path key={`${x}-${y}`} d={`M${x} ${y - 10} l10 10 l-10 10 l-10 -10 z`} fill={filled ? '#fff' : 'none'} fillOpacity="0.25" />,
        );
      }
    }
  }

  return (
    <svg className="project-art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <Gradient id={id} gradientTransform={`rotate(${angle} .5 .5)`} />
      </defs>
      <rect width="320" height="180" fill={`url(#${id})`} />
      <circle cx={260 - ((h >>> 12) % 200)} cy={40 + ((h >>> 16) % 100)} r="70" fill="#fff" fillOpacity="0.08" />
      <g fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5">
        {pattern}
      </g>
    </svg>
  );
}
