import { useEffect, useMemo, useRef } from 'react';
import { ProjectScreen } from './Graphics.jsx';
import { paintLandscape } from './landscape.js';
import { createPlanetRenderer } from './planetRenderer.js';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => t * t * (3 - 2 * t);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * The fixed, full-screen landscape behind the site. `dim` (0–1) darkens it; on the home page the
 * Scene drives the dimming and parallax itself through `refs`.
 */
export function SpaceBackdrop({ dim = 0, refs = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    let last = null;
    let timer;
    const paint = () => {
      // Painted at CSS-pixel resolution (capped): a soft, painterly scene gains nothing from retina detail.
      const scale = Math.min(1, 1920 / window.innerWidth);
      const w = Math.round(window.innerWidth * scale);
      const h = Math.round(window.innerHeight * 1.1 * scale);
      // Mobile toolbars nudge the height on every scroll; only repaint for real size changes.
      if (last && last.w === w && Math.abs(h - last.h) / last.h < 0.15) return;
      last = { w, h };
      paintLandscape(canvas, w, h);
    };
    paint();
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(paint, 200);
    };
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="backdrop" ref={refs.root} aria-hidden="true">
      <div className="backdrop-world" ref={refs.world}>
        <canvas ref={canvasRef} className="backdrop-canvas" />
        <div className="backdrop-beams">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="backdrop-planet" ref={refs.planet} />
      <div className="backdrop-shade" ref={refs.shade} style={{ opacity: dim }} />
      <div className="backdrop-grain" />
    </div>
  );
}

const PANELS = 14;
const SHOWCASE_SLOTS = 6; // at least this many screens orbit in the showcase, repeating projects if needed
const SHOWCASE_REST = -14; // degrees: the front screen sits turned a little, left of the planet's centre

const themeFor = (projectIndex) => (projectIndex % 2 ? 'dark' : 'light');

function RingPanel({ i, project, index, panelRef }) {
  return (
    <div className="ring-panel" style={{ '--i': i }} ref={panelRef}>
      <div className="ring-face">
        {project ? (
          <ProjectScreen project={project} index={index} theme={themeFor(index)} />
        ) : (
          <span className="ring-tile">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>
      <div className="ring-face ring-back" />
    </div>
  );
}

/**
 * Shared between the scene and the work showcase: `focus` is the spot to swing to the front of the
 * orbit, counted in projects and running on past the last one (spot n is project 0 again, one turn
 * further round), `drag` a live turn in degrees while the visitor drags or scrolls sideways, and `nudge`
 * spins things up. The scene sets `step`, the turn in degrees from one project to the next.
 */
export const planetControl = {
  velocity: 0,
  focus: 0,
  drag: 0,
  step: 360 / SHOWCASE_SLOTS,
  nudge(dx) {
    this.velocity = clamp(this.velocity + dx * 0.08, -12, 12);
  },
};

function readPose(raw) {
  const [x, y, s, ring, dim, show = 0] = raw.trim().split(/\s+/).map(Number);
  return { x, y, s, ring, dim, show };
}

const mixPose = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));

/**
 * The home page's world: the landscape, plus a planet circled by a ring of project screens.
 * Sections opt in with data-scene="x y scale ring dim show" (x, y: the planet's centre as fractions
 * of the viewport; ring: the small ring's opacity; dim: how dark the landscape gets; show: the
 * showcase orbit of large screens), and data-scene-sm for narrow screens. As each section scrolls
 * in, the planet glides from the previous pose to its own. `introAt` (a performance.now() time)
 * starts the opening zoom; until then the scene waits in the dark.
 */
export function Scene({ projects, introAt }) {
  const rigRef = useRef(null);
  const ringRef = useRef(null);
  const ringPanels = useRef([]);
  const sphereRef = useRef(null);
  const canvasRef = useRef(null);
  const haloRef = useRef(null);
  const showTiltRef = useRef(null);
  const showRingRef = useRef(null);
  const showPanels = useRef([]);
  const backdrop = { root: useRef(null), world: useRef(null), planet: useRef(null), shade: useRef(null) };
  const introRef = useRef(introAt);
  introRef.current = introAt;

  const n = projects.length;
  const slotCount = n ? n * Math.ceil(SHOWCASE_SLOTS / n) : 0;

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const narrowQuery = window.matchMedia('(max-width: 899px)');
    let anchors = [];
    const measure = () => {
      anchors = [...document.querySelectorAll('[data-scene]')].map((el) => ({
        el,
        wide: readPose(el.dataset.scene),
        narrow: readPose(el.dataset.sceneSm || el.dataset.scene),
      }));
    };
    measure();

    // Styles are only written when they change, so once the scene settles the browser can
    // re-rasterize everything sharp and then leave it alone.
    const written = new WeakMap();
    const set = (el, prop, value) => {
      let last = written.get(el);
      if (!last) written.set(el, (last = {}));
      if (last[prop] !== value) {
        last[prop] = value;
        el.style.setProperty(prop, value);
      }
    };

    const target = () => {
      if (!anchors.length) return { x: 0.5, y: 0.4, s: 1, ring: 1, dim: 0, show: 0 };
      const key = narrowQuery.matches ? 'narrow' : 'wide';
      const vh = window.innerHeight;
      const tops = anchors.map((a) => a.el.getBoundingClientRect().top);
      let i = 0;
      tops.forEach((top, k) => {
        if (top <= vh * 0.5) i = k;
      });
      const next = anchors[i + 1];
      if (!next) return anchors[i][key];
      return mixPose(anchors[i][key], next[key], smooth(clamp((vh - tops[i + 1]) / (vh * 0.5), 0, 1)));
    };

    // The WebGL planet, when the browser can draw it; otherwise the CSS planet stays
    const sphere = sphereRef.current;
    let renderer = createPlanetRenderer(canvasRef.current);
    sphere.classList.toggle('gl', !!renderer);
    if (slotCount) planetControl.step = 360 / slotCount;

    const pose = { ...target() };
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    let angle = 0;
    let scrolled = 0; // degrees the visitor has turned the ring by scrolling sideways over it
    let scrolledShown = 0;
    let ringArea = null; // where the ring is on screen: centre and radii, in px
    let spin = 0;
    let showAngle = SHOWCASE_REST;
    let last = performance.now();
    let frame = 0;

    const onPointer = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    // Scrolling sideways (a trackpad swipe, or Shift + wheel) over the planet spins its ring of projects.
    // The showcase orbit in the work section takes sideways scrolls itself (see Work in Home.jsx).
    const onWheel = (e) => {
      if (!ringArea) return;
      const scale = e.deltaMode === 1 ? 16 : 1; // lines (some mice in Firefox) to pixels
      const dx = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0) * scale;
      if (!dx) return;
      const { x, y, rx, ry } = ringArea;
      if (((e.clientX - x) / rx) ** 2 + ((e.clientY - y) / ry) ** 2 > 1) return;
      e.preventDefault(); // also keeps the browser's swipe-to-go-back out of the way
      scrolled -= dx * 0.15;
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', measure);

    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const goal = target();
      const k = reduced ? 1 : 1 - Math.pow(0.0015, dt); // frame-rate independent easing
      for (const key of Object.keys(pose)) pose[key] += (goal[key] - pose[key]) * k;
      pointer.x += (pointer.tx - pointer.x) * k * 0.6;
      pointer.y += (pointer.ty - pointer.y) * k * 0.6;

      const start = introRef.current;
      const intro = start == null ? 0 : reduced ? 1 : easeOut(clamp((now - start) / 2000, 0, 1));

      if (!reduced) {
        angle += dt * (9 + planetControl.velocity * 6);
        spin += dt * (0.06 + Math.abs(planetControl.velocity) * 0.02);
        planetControl.velocity *= Math.pow(0.08, dt);
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rig = rigRef.current;
      // The planet is sized by layout rather than scaled, so its screens rasterize sharp at any size;
      // only the opening zoom uses a scale.
      const diameter = Math.round(clamp(vw * 0.16, 150, 290) * pose.s);
      ringArea = pose.ring > 0.5 && pose.show < 0.5 && intro > 0.5 ? { x: pose.x * vw, y: pose.y * vh, rx: diameter * 1.7, ry: diameter * 0.85 } : null;
      scrolledShown += (scrolled - scrolledShown) * (reduced ? 1 : 1 - Math.pow(0.002, dt));
      set(rig, '--d', `${diameter}px`);
      set(rig, 'transform', `translate3d(${(pose.x * vw).toFixed(1)}px, ${(pose.y * vh).toFixed(1)}px, 0) scale(${(1 + (1 - intro) * 2.2).toFixed(3)})`);
      set(rig, 'opacity', clamp(Math.min(pose.s * 3, 1) * (0.15 + intro * 0.85), 0, 1).toFixed(3));
      set(rig, 'filter', intro < 1 ? `brightness(${(0.25 + intro * 0.75).toFixed(3)})` : '');
      set(haloRef.current, 'opacity', ((0.55 + (1 - pose.ring) * 0.45) * intro).toFixed(3));

      set(ringRef.current, 'transform', `rotateY(${(angle + scrolledShown).toFixed(2)}deg)`);
      set(ringRef.current, 'visibility', pose.ring < 0.02 ? 'hidden' : 'visible');
      // Fade the panels rather than the ring: opacity on a 3D container would flatten it
      const fade = clamp(pose.ring * intro, 0, 1).toFixed(3);
      for (const el of ringPanels.current) if (el) set(el, 'opacity', fade);

      // The showcase: swing the focused spot round to the front. Slot s shows project s % n, and n
      // divides the slot count, so spot f lands on a screen showing project f % n however far round it is.
      if (slotCount) {
        const step = 360 / slotCount;
        const goalAngle = SHOWCASE_REST - planetControl.focus * step;
        showAngle += (goalAngle + planetControl.drag - showAngle) * (reduced ? 1 : 1 - Math.pow(0.004, dt));
        const show = clamp(pose.show * intro, 0, 1);
        set(showTiltRef.current, 'visibility', show < 0.02 ? 'hidden' : 'visible');
        if (show >= 0.02) {
          set(showRingRef.current, 'transform', `rotateY(${showAngle.toFixed(2)}deg)`);
          showPanels.current.forEach((el, s) => {
            if (!el) return;
            // Screens dim and fade as they swing round behind the planet
            const facing = Math.cos(((s * step + showAngle) * Math.PI) / 180);
            set(el, 'opacity', (show * clamp((facing + 0.25) / 0.75, 0, 1)).toFixed(2));
            set(el, 'filter', `brightness(${(0.3 + 0.7 * clamp(facing, 0, 1)).toFixed(2)})`);
          });
        }
      }

      if (renderer) {
        if (renderer.lost) {
          renderer = null;
          sphere.classList.remove('gl');
        } else if (pose.s > 0.01 && intro > 0) {
          // A drawing buffer about as sharp as the planet appears: grow eagerly, shrink lazily
          const want = Math.min(2048, Math.ceil((diameter * Math.min(window.devicePixelRatio || 1, 2)) / 64) * 64);
          if (want > renderer.size || want < renderer.size * 0.6) renderer.resize(want);
          renderer.draw(spin, spin * 1.6);
        }
      }

      // The landscape: fades up with the intro, drifts with the pointer and darkens deeper into the page
      const scroll = window.scrollY;
      backdrop.root.current.style.opacity = intro;
      backdrop.world.current.style.transform = `translate3d(${pointer.x * -12}px, ${Math.min(scroll * 0.03, vh * 0.05) * -1 + pointer.y * -6}px, 0) scale(${1.04 + (1 - intro) * 0.12})`;
      backdrop.shade.current.style.opacity = pose.dim;
      // A second planet rises into the lower left as the hero scrolls away
      const rise = clamp(scroll / vh, 0, 1.4);
      backdrop.planet.current.style.transform = `translate3d(${pointer.x * -24}px, ${(1 - rise) * 55}vh, 0)`;
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', measure);
      renderer?.destroy();
      sphere.classList.remove('gl');
    };
    // Anchors are read from the DOM; the parent mounts the scene once its sections exist.
  }, []);

  const warp = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        top: `${(i * 37) % 100}%`,
        left: `${(i * 53) % 90}%`,
        width: `${8 + ((i * 29) % 22)}%`,
        delay: `${(i * 47) % 500}ms`,
      })),
    [],
  );

  return (
    <>
      <SpaceBackdrop refs={backdrop} />
      <div className="planet-stage" aria-hidden="true">
        <div className="planet-rig" ref={rigRef}>
          <div className="planet-halo" ref={haloRef} />
          <div className="planet-3d">
            <div className="planet-tilt">
              <div className="planet-ring" ref={ringRef}>
                {Array.from({ length: PANELS }, (_, i) => (
                  <RingPanel key={i} i={i} project={projects[i % n]} index={i % n} panelRef={(el) => (ringPanels.current[i] = el)} />
                ))}
              </div>
              <div className="planet-sphere" ref={sphereRef}>
                <span className="planet-clouds" />
                <canvas ref={canvasRef} className="planet-canvas" />
              </div>
            </div>
            <div className="showcase-tilt" ref={showTiltRef}>
              <div className="showcase-ring" ref={showRingRef} style={{ '--slots': slotCount }}>
                {Array.from({ length: slotCount }, (_, s) => (
                  <div key={s} className="showcase-panel" style={{ '--s': s }} ref={(el) => (showPanels.current[s] = el)}>
                    <ProjectScreen project={projects[s % n]} index={s % n} theme={themeFor(s % n)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`warp${introAt != null ? ' go' : ''}`} aria-hidden="true">
        {warp.map((s, i) => (
          <i key={i} style={{ top: s.top, left: s.left, width: s.width, animationDelay: s.delay }} />
        ))}
      </div>
    </>
  );
}
