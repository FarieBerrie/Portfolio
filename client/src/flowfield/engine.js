// Flow-field particle painter with an optional kaleidoscope view.
// The simulation always draws into an offscreen "source" canvas (which keeps the trails).
// Each frame the visible canvas either shows the source as-is, or a kaleidoscope built
// from one wedge of it, copied around the centre with every other copy mirrored.

// ---------- Perlin noise (3D, improved) ----------
const perm = new Uint8Array(512);
export function seedNoise() {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
}
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + t * (b - a);
function grad(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}
function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
  const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
  return lerp(
    lerp(
      lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
      lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}

// ---------- Palettes ----------
export const PALETTES = [
  { name: 'Nebula', bg: '#09091a', colors: ['#60a5fa', '#8b5cf6', '#c084fc', '#e879f9', '#dbeafe'] },
  { name: 'Ember', bg: '#0b0b10', colors: ['#ff6b35', '#f7c59f', '#ffb86b', '#e63946', '#fff1d0'] },
  { name: 'Ocean', bg: '#03111c', colors: ['#00b4d8', '#90e0ef', '#48cae4', '#caf0f8', '#0077b6'] },
  { name: 'Aurora', bg: '#070a14', colors: ['#7cff9b', '#3ddbd9', '#a06cd5', '#ff00ff', '#c8ffd4'] },
  { name: 'Candy', bg: '#1a0f1f', colors: ['#ff8fab', '#ffc6ff', '#bdb2ff', '#a0c4ff', '#fdffb6'] },
  { name: 'Mono', bg: '#0a0a0a', colors: ['#ffffff', '#d4d4d4', '#a3a3a3', '#737373'] },
  { name: 'Paper', bg: '#f3ede2', colors: ['#1d3557', '#e63946', '#457b9d', '#2a2a2a', '#a8dadc'] },
];

export const DEFAULT_SETTINGS = {
  palette: 0,
  speed: 1.5,
  density: 1500,
  scale: 2.5,
  trail: 92,
  brush: 60,
  symmetry: 1,
  mirror: true,
  kaleidoscope: true,
  segments: 8,
  spin: 0.3,
};

export class FlowField {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.src = document.createElement('canvas');
    this.sctx = this.src.getContext('2d');
    this.settings = { ...settings };
    this.particles = [];
    this.paused = false;
    this.t = 0;
    this.spinAngle = 0;
    this.pointer = { down: false, x: 0, y: 0 };
    this.symTransforms = [];
    this.frame = 0;
    this.W = 0;
    this.H = 0;
    seedNoise();
    this.buildSymmetry();
    this.loop = this.loop.bind(this);
  }

  // ----- lifecycle -----
  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = width;
    this.H = height;
    for (const [c, ctx] of [
      [this.canvas, this.ctx],
      [this.src, this.sctx],
    ]) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    this.particles = this.particles.filter((p) => p.x < width && p.y < height);
    this.clear();
  }

  start() {
    if (!this.frame) this.frame = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  // ----- settings & actions -----
  update(next) {
    const prev = this.settings;
    this.settings = { ...next };
    if (next.symmetry !== prev.symmetry || next.mirror !== prev.mirror) this.buildSymmetry();
    if (next.palette !== prev.palette) {
      const pal = PALETTES[next.palette].colors;
      for (const p of this.particles) p.color = pal[Math.floor(Math.random() * pal.length)];
      this.clear();
    }
    if (this.paused) this.render(); // e.g. kaleidoscope toggled while paused
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) this.render(); // keep the view correct if e.g. kaleidoscope is toggled while paused
  }

  clear() {
    this.sctx.fillStyle = PALETTES[this.settings.palette].bg;
    this.sctx.fillRect(0, 0, this.W, this.H);
    this.render();
  }

  toDataURL() {
    return this.canvas.toDataURL('image/png');
  }

  // The kaleidoscope samples a wedge pointing along the canvas's longer axis, scaled up just
  // enough that it reaches the far corners of the screen.
  kaleidoGeometry() {
    const { W, H } = this;
    return {
      base: W >= H ? 0 : Math.PI / 2,
      zoom: Math.hypot(W, H) / Math.max(W, H, 1),
    };
  }

  // ----- pointer: maps the visible canvas back into the simulated (source) canvas -----
  pointerTo(x, y) {
    if (!this.settings.kaleidoscope) return { x, y };
    const cx = this.W / 2, cy = this.H / 2;
    const dx = x - cx, dy = y - cy;
    const { base, zoom } = this.kaleidoGeometry();
    const r = Math.hypot(dx, dy) / zoom;
    const wedge = Math.PI / this.settings.segments;
    // Fold the angle into the single source wedge [0, wedge], undoing spin and mirroring.
    let a = Math.atan2(dy, dx) - this.spinAngle;
    a = ((a % (2 * wedge)) + 2 * wedge) % (2 * wedge);
    if (a > wedge) a = 2 * wedge - a;
    return { x: cx + r * Math.cos(a + base), y: cy + r * Math.sin(a + base) };
  }

  pointerDown(x, y) {
    this.pointer.down = true;
    Object.assign(this.pointer, this.pointerTo(x, y));
  }
  pointerMove(x, y) {
    Object.assign(this.pointer, this.pointerTo(x, y));
  }
  pointerUp() {
    this.pointer.down = false;
  }

  // ----- simulation -----
  buildSymmetry() {
    // Rotation (and optional reflection) matrices around the centre for painted strokes.
    this.symTransforms = [];
    const n = this.settings.symmetry;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      this.symTransforms.push([c, -s, s, c]);
      if (this.settings.mirror && n > 1) this.symTransforms.push([c, s, s, -c]);
    }
  }

  makeParticle(x, y) {
    const pal = PALETTES[this.settings.palette].colors;
    return {
      x: x ?? Math.random() * this.W,
      y: y ?? Math.random() * this.H,
      px: 0,
      py: 0,
      color: pal[Math.floor(Math.random() * pal.length)],
      life: 200 + Math.random() * 400,
      width: 0.5 + Math.random() * 1.5,
      sym: false,
    };
  }

  spawnAt(x, y, n) {
    const sym = this.symTransforms.length > 1;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * this.settings.brush;
      const p = this.makeParticle(x + Math.cos(a) * r, y + Math.sin(a) * r);
      p.sym = sym;
      this.particles.push(p);
    }
    // Cap the total so painting never melts the browser (symmetric particles draw many copies).
    const { density } = this.settings;
    const max = density + Math.round((density * 2) / Math.sqrt(Math.max(1, this.symTransforms.length)));
    if (this.particles.length > max) this.particles.splice(0, this.particles.length - max);
  }

  simulate() {
    const { settings: st, sctx: ctx, W, H } = this;
    this.t += 0.0025 * st.speed;
    this.spinAngle += st.spin * 0.004;

    // Fade the previous frame toward the background -> trails
    ctx.globalAlpha = 1 - (st.trail / 100) * 0.995;
    ctx.fillStyle = PALETTES[st.palette].bg;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.85;

    while (this.particles.length < st.density) this.particles.push(this.makeParticle());
    if (this.pointer.down) this.spawnAt(this.pointer.x, this.pointer.y, 12);

    const s = st.scale / 1000, sp = st.speed, cx = W / 2, cy = H / 2;
    ctx.lineCap = 'round';
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.px = p.x;
      p.py = p.y;
      const angle = noise(p.x * s, p.y * s, this.t) * Math.PI * 4;
      p.x += Math.cos(angle) * sp;
      p.y += Math.sin(angle) * sp;
      p.life--;

      if (p.life <= 0 || p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        // Recycle ambient particles; drop extras painted by the user
        if (this.particles.length > st.density) this.particles.splice(i, 1);
        else this.particles[i] = this.makeParticle();
        continue;
      }
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.width;
      ctx.beginPath();
      if (p.sym) {
        const ax = p.px - cx, ay = p.py - cy, bx = p.x - cx, by = p.y - cy;
        for (const [m0, m1, m2, m3] of this.symTransforms) {
          ctx.moveTo(cx + m0 * ax + m1 * ay, cy + m2 * ax + m3 * ay);
          ctx.lineTo(cx + m0 * bx + m1 * by, cy + m2 * bx + m3 * by);
        }
      } else {
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ----- compositing to the visible canvas -----
  render() {
    const { ctx, W, H, src } = this;
    if (!this.settings.kaleidoscope) {
      ctx.drawImage(src, 0, 0, W, H);
      return;
    }
    const n = this.settings.segments;
    const wedge = Math.PI / n;
    const cx = W / 2, cy = H / 2;
    const R = Math.hypot(W, H) / 2 + 2;
    const overlap = 0.004; // hides hairline seams between wedges
    const { base, zoom } = this.kaleidoGeometry();

    ctx.fillStyle = PALETTES[this.settings.palette].bg;
    ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 2 * n; k++) {
      ctx.save();
      ctx.translate(cx, cy);
      if (k % 2 === 0) {
        ctx.rotate(k * wedge + this.spinAngle);
      } else {
        // Mirrored copy: source angle a lands at (k+1)·wedge − a, i.e. inside [k·wedge, (k+1)·wedge].
        ctx.rotate((k + 1) * wedge + this.spinAngle);
        ctx.scale(1, -1);
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, -overlap, wedge + overlap);
      ctx.closePath();
      ctx.clip();
      // Source angles [base, base + wedge] land in this clipped wedge.
      ctx.scale(zoom, zoom);
      ctx.rotate(-base);
      ctx.drawImage(src, -cx, -cy, W, H);
      ctx.restore();
    }
  }

  loop() {
    this.frame = requestAnimationFrame(this.loop);
    if (this.paused) return;
    this.simulate();
    this.render();
  }
}
