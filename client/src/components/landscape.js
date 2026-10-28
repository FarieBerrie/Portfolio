// Paints the home page's backdrop: an alien valley at dusk, in the style of a digital matte painting.
// Brushy clouds over a magenta-to-amber sky, ranges of crystal spires, a lake catching the glow and
// dark cliffs framing the view. It's drawn once per canvas size from a fixed seed, so every visit
// (and every resize) shows the same scene.

// mulberry32
function seeded(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HORIZON = 0.64; // fraction of the height

const SKY = [
  [0, '#0b0520'],
  [0.16, '#211043'],
  [0.3, '#4d1a5e'],
  [0.43, '#912b6d'],
  [0.53, '#d24a6c'],
  [0.6, '#f07a62'],
  [HORIZON, '#ffb27a'],
  [HORIZON + 0.001, '#3b2370'],
  [1, '#0a0618'],
];

// Cloud colors from the top of the sky down to the horizon
const CLOUD_BANDS = [
  ['#3a1a66', '#5a2380', '#2a1050'],
  ['#7d2a7e', '#a8357f', '#5c2275'],
  ['#d9567a', '#f07a7e', '#b8407a'],
  ['#ffb08a', '#ff9a72', '#f6c39a'],
];

function cloudColor(rnd, yFrac) {
  const band = CLOUD_BANDS[Math.min(CLOUD_BANDS.length - 1, Math.floor((yFrac / HORIZON) * CLOUD_BANDS.length))];
  return band[Math.floor(rnd() * band.length)];
}

function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

/** Smooth 1D value noise: random heights at whole numbers, eased in between. */
function valueNoise(rnd, count) {
  const v = Array.from({ length: count + 2 }, () => rnd());
  return (t) => {
    const i = Math.max(0, Math.floor(t));
    const f = t - i;
    return v[i] + (v[i + 1] - v[i]) * f * f * (3 - 2 * f);
  };
}

/** Heights along a ridge: layered noise for the rolling line, plus spires that flare out at the base. */
function ridge(rnd, W, base, amp, spires, spireHeight) {
  const step = 3;
  const n = Math.ceil(W / step) + 3;
  const broad = valueNoise(rnd, Math.ceil(W / 260) + 2);
  const mid = valueNoise(rnd, Math.ceil(W / 70) + 2);
  const fine = valueNoise(rnd, Math.ceil(W / 12) + 2);
  const at = (k) => Math.max(0, k * step - step);
  const ys = [];
  for (let k = 0; k < n; k++) {
    const x = at(k);
    ys.push(base - amp * (broad(x / 260) * 0.6 + mid(x / 70) * 0.3 + fine(x / 12) * 0.1));
  }
  for (let s = 0; s < spires; s++) {
    const cx = rnd() * W;
    const w = 14 + rnd() * 46; // half-width at the base
    const h = spireHeight * (0.35 + rnd() * 0.65);
    const lean = (rnd() - 0.5) * 0.6;
    for (let k = 0; k < n; k++) {
      const x = at(k);
      const d = x < cx ? ((cx - x) / w) * (1 + lean) : ((x - cx) / w) * (1 - lean);
      if (d < 1) ys[k] -= h * Math.pow(1 - d, 1.8) * (0.9 + fine(x / 12) * 0.2);
    }
  }
  return { ys, step };
}

function ridgePath(ctx, { ys, step }, bottom) {
  ctx.beginPath();
  ctx.moveTo(-step, bottom);
  ys.forEach((y, i) => ctx.lineTo(i * step - step, y));
  ctx.lineTo(ys.length * step, bottom);
  ctx.closePath();
}

function paintRidge(ctx, rnd, W, H, r, { top, bottom, rim, streak, streaks }) {
  const minY = Math.min(...r.ys);
  const g = ctx.createLinearGradient(0, minY, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ridgePath(ctx, r, H + 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ridgePath(ctx, r, H + 2);
  ctx.clip();
  // Vertical striations: the painted texture of rock faces
  ctx.lineCap = 'round';
  for (let i = 0; i < streaks; i++) {
    const x = rnd() * W;
    const y = r.ys[Math.max(0, Math.min(r.ys.length - 1, Math.round(x / r.step) + 1))];
    const len = 12 + rnd() * 110;
    ctx.globalAlpha = 0.05 + rnd() * 0.16;
    ctx.strokeStyle = rnd() < 0.6 ? streak : bottom;
    ctx.lineWidth = 1 + rnd() * 3;
    ctx.beginPath();
    ctx.moveTo(x, y + rnd() * 10);
    ctx.lineTo(x + (rnd() - 0.5) * 8, y + len);
    ctx.stroke();
  }
  // Rim light where the glowing sky catches the edge
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  r.ys.forEach((y, i) => (i ? ctx.lineTo(i * r.step - r.step, y + 1) : ctx.moveTo(-r.step, y + 1)));
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A dark rock face rising up one side of the frame (side: -1 left, 1 right). */
function cliff(ctx, rnd, W, H, side, reach, peak) {
  const pts = [];
  const steps = 90;
  const rough = valueNoise(rnd, 20);
  const crag = valueNoise(rnd, 60);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 at the top of the cliff, 1 at the bottom
    const y = H * (peak + (1 - peak) * t);
    const bulge = Math.sin(t * Math.PI * 0.9) * 0.6 + t * 0.5;
    const edge = W * reach * (0.3 + bulge + (rough(t * 18) - 0.5) * 0.5 + (crag(t * 58) - 0.5) * 0.18);
    pts.push([side < 0 ? edge : W - edge, y]);
  }
  const outer = side < 0 ? -10 : W + 10;
  ctx.beginPath();
  ctx.moveTo(outer, H * peak - 40);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(outer, H + 10);
  ctx.closePath();
  const g = ctx.createLinearGradient(side < 0 ? 0 : W, 0, side < 0 ? W * reach : W * (1 - reach), 0);
  g.addColorStop(0, '#0d0619');
  g.addColorStop(1, '#2a1442');
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.lineCap = 'round';
  for (let i = 0; i < 160; i++) {
    const [x, y] = pts[Math.floor(rnd() * pts.length)];
    ctx.globalAlpha = 0.06 + rnd() * 0.14;
    ctx.strokeStyle = rnd() < 0.5 ? '#5a2c6e' : '#120820';
    ctx.lineWidth = 1 + rnd() * 4;
    ctx.beginPath();
    ctx.moveTo(x - side * rnd() * 30, y);
    ctx.lineTo(x - side * (10 + rnd() * 90), y + (rnd() - 0.3) * 60);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#e0709e';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x + side * -1, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

export function paintLandscape(canvas, W, H) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const rnd = seeded(20260611);
  const hy = H * HORIZON;

  // Sky and ground
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  for (const [at, color] of SKY) sky.addColorStop(at, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.6, hy, W * 0.55, '#ffb47a', 0.55);
  glow(ctx, W * 0.24, H * 0.4, W * 0.4, '#c23f8a', 0.4);
  glow(ctx, W * 0.82, H * 0.28, W * 0.3, '#6b2a9a', 0.45);

  // Stars, thinning toward the horizon
  for (let i = 0; i < 220; i++) {
    const y = Math.pow(rnd(), 1.8) * hy * 0.75;
    ctx.globalAlpha = (1 - y / (hy * 0.75)) * (0.25 + rnd() * 0.75);
    ctx.fillStyle = rnd() < 0.2 ? '#ffd6f4' : '#ffffff';
    const s = rnd() < 0.08 ? 2 : 1;
    ctx.fillRect(rnd() * W, y, s, s);
  }
  ctx.globalAlpha = 1;

  // Clouds: soft masses painted on a layer, blurred, then brushed over with crisp streaks
  const layer = document.createElement('canvas');
  layer.width = W;
  layer.height = H;
  const lc = layer.getContext('2d');
  for (let i = 0; i < 340; i++) {
    const yFrac = 0.03 + Math.pow(rnd(), 0.8) * (HORIZON - 0.06);
    const rx = W * (0.03 + rnd() * 0.14);
    lc.globalAlpha = 0.1 + rnd() * 0.28;
    lc.fillStyle = cloudColor(rnd, yFrac);
    lc.beginPath();
    lc.ellipse(rnd() * W * 1.1 - W * 0.05, yFrac * H, rx, rx * (0.07 + rnd() * 0.18), (rnd() - 0.5) * 0.25, 0, Math.PI * 2);
    lc.fill();
  }
  ctx.filter = `blur(${Math.round(W / 140)}px)`;
  ctx.drawImage(layer, 0, 0);
  ctx.filter = 'none';

  ctx.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const yFrac = 0.04 + Math.pow(rnd(), 0.75) * (HORIZON - 0.05);
    const x = rnd() * W;
    const y = yFrac * H;
    const len = 20 + rnd() * W * 0.07;
    const tilt = (rnd() - 0.5) * 0.18;
    ctx.globalAlpha = 0.05 + rnd() * 0.2;
    ctx.strokeStyle = cloudColor(rnd, yFrac);
    ctx.lineWidth = 1 + rnd() * 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + len / 2, y + tilt * len - rnd() * 6, x + len, y + tilt * len * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Faint energy threads across the sky
  ctx.shadowColor = '#ffe58a';
  ctx.shadowBlur = 10;
  for (let k = 0; k < 2; k++) {
    let x = -40;
    let y = H * (0.2 + k * 0.17 + rnd() * 0.05);
    ctx.globalAlpha = 0.3 - k * 0.1;
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (x < W + 40) {
      const nx = x + 70 + rnd() * 90;
      const ny = y + (rnd() - 0.5) * 26;
      ctx.quadraticCurveTo(x + (nx - x) / 2, y + (rnd() - 0.5) * 30, nx, ny);
      x = nx;
      y = ny;
    }
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  // A small dark moon, high on the right
  const mx = W * 0.9;
  const my = H * 0.17;
  const mr = Math.max(10, H * 0.026);
  glow(ctx, mx, my, mr * 3, '#ff9ec7', 0.25);
  ctx.fillStyle = '#170b28';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  // Ranges, far to near
  paintRidge(ctx, rnd, W, H, ridge(rnd, W, hy + H * 0.012, H * 0.04, 7, H * 0.07), {
    top: '#a68bd2',
    bottom: '#7a60b0',
    rim: '#ffd9cc',
    streak: '#cdb4ea',
    streaks: 140,
  });
  paintRidge(ctx, rnd, W, H, ridge(rnd, W, hy + H * 0.06, H * 0.055, 12, H * 0.23), {
    top: '#7253b6',
    bottom: '#3a2574',
    rim: '#f6a0c6',
    streak: '#9d7dd8',
    streaks: 520,
  });

  // The lake: a soft pool of the horizon's glow, broken into streaks
  const lakeY = hy + H * 0.13;
  ctx.save();
  ctx.translate(W * 0.55, lakeY);
  ctx.scale(1, 0.14);
  glow(ctx, 0, 0, W * 0.38, '#c9a2ff', 0.5);
  ctx.restore();
  for (let i = 0; i < 300; i++) {
    const t = rnd();
    const y = lakeY - H * 0.035 + t * H * 0.09;
    const spread = W * (0.1 + t * 0.28);
    const x = W * 0.55 + (rnd() - 0.5) * spread * 2;
    const len = 8 + rnd() * W * 0.06 * (1 - t * 0.5);
    ctx.globalAlpha = (0.12 + rnd() * 0.45) * (1 - t * 0.7);
    ctx.strokeStyle = rnd() < 0.5 ? '#e9d8ff' : '#ffb3c6';
    ctx.lineWidth = 1 + rnd() * 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  paintRidge(ctx, rnd, W, H, ridge(rnd, W, hy + H * 0.21, H * 0.06, 5, H * 0.11), {
    top: '#45297e',
    bottom: '#170c31',
    rim: '#d987c8',
    streak: '#6c4aa8',
    streaks: 360,
  });

  // Foreground shore
  paintRidge(ctx, rnd, W, H, ridge(rnd, W, H * 0.95, H * 0.07, 3, H * 0.06), {
    top: '#20103f',
    bottom: '#07040f',
    rim: '#8f5bc4',
    streak: '#3a2066',
    streaks: 200,
  });

  cliff(ctx, rnd, W, H, 1, 0.13, 0.12);
  cliff(ctx, rnd, W, H, -1, 0.08, 0.5);

  // Fade the bottom edge into the page
  const fade = ctx.createLinearGradient(0, H * 0.82, 0, H);
  fade.addColorStop(0, 'rgba(7, 4, 15, 0)');
  fade.addColorStop(1, 'rgba(7, 4, 15, 0.95)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);
}
