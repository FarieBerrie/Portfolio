import { useEffect, useRef, useState } from 'react';
import { getPortfolio } from '../api.js';
import { SiteNav, sectionsFor } from '../components/SiteChrome.jsx';
import { DEFAULT_SETTINGS, FlowField, PALETTES, seedNoise } from '../flowfield/engine.js';

const SLIDERS = [
  { key: 'speed', label: 'Speed', min: 0.2, max: 4, step: 0.1 },
  { key: 'density', label: 'Density', min: 200, max: 4000, step: 100 },
  { key: 'scale', label: 'Turbulence', min: 0.5, max: 8, step: 0.1 },
  { key: 'trail', label: 'Trail length', min: 0, max: 100, step: 1 },
  { key: 'brush', label: 'Brush size', min: 5, max: 200, step: 5 },
];

const KALEIDO_SLIDERS = [
  { key: 'segments', label: 'Segments', min: 3, max: 12, step: 1 },
  { key: 'spin', label: 'Spin', min: -2, max: 2, step: 0.1 },
];

const STROKE_SLIDERS = [{ key: 'symmetry', label: 'Stroke symmetry', min: 1, max: 12, step: 1, off: 1 }];

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const isSmallScreen = () => window.matchMedia?.('(max-width: 700px)').matches;

function Slider({ spec, value, onChange }) {
  const id = `ff-${spec.key}`;
  const shown = spec.off !== undefined && value === spec.off ? 'Off' : value;
  return (
    <div className="ff-field">
      <label htmlFor={id}>
        {spec.label} <output htmlFor={id}>{shown}</output>
      </label>
      <input
        id={id}
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => onChange(spec.key, Number(e.target.value))}
      />
    </div>
  );
}

export default function FlowFieldPage() {
  const canvasRef = useRef(null);
  const stageRef = useRef(null);
  const engineRef = useRef(null);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [panelOpen, setPanelOpen] = useState(() => !isSmallScreen());

  useEffect(() => {
    getPortfolio()
      .then(setData)
      .catch(() => {});
    document.title = 'Flow Field · Kaleidoscope';
  }, []);

  // Create the engine once; size it to its container.
  useEffect(() => {
    const engine = new FlowField(canvasRef.current, settings);
    engineRef.current = engine;
    const stage = stageRef.current;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) engine.resize(width, height);
    });
    observer.observe(stage);
    engine.setPaused(paused);
    engine.start();
    return () => {
      observer.disconnect();
      engine.destroy();
    };
    // Settings and pause state are pushed in by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => engineRef.current?.update(settings), [settings]);
  useEffect(() => engineRef.current?.setPaused(paused), [paused]);

  const set = (key, value) => setSettings((s) => ({ ...s, [key]: value }));

  function randomize() {
    seedNoise();
    setSettings((s) => ({
      ...s,
      speed: +(0.5 + Math.random() * 3).toFixed(1),
      scale: +(0.8 + Math.random() * 6).toFixed(1),
      trail: Math.floor(80 + Math.random() * 19),
      segments: 3 + Math.floor(Math.random() * 10),
      spin: +(Math.random() * 1.6 - 0.8).toFixed(1),
      palette: Math.floor(Math.random() * PALETTES.length),
    }));
  }

  function save() {
    const a = document.createElement('a');
    a.download = `flowfield-${Date.now()}.png`;
    a.href = engineRef.current.toDataURL();
    a.click();
  }

  // Keyboard shortcuts, ignored while a form control has focus or a modifier is held.
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, button, select, textarea, a')) return;
      const k = e.key.toLowerCase();
      if (k === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (k === 'c') engineRef.current.clear();
      else if (k === 'r') randomize();
      else if (k === 's') save();
      else if (k === 'h') setPanelOpen((o) => !o);
      else if (k === 'k') setSettings((s) => ({ ...s, kaleidoscope: !s.kaleidoscope }));
      else if (k === 'm') setSettings((s) => ({ ...s, mirror: !s.mirror }));
      else if (k === '[' || k === ']') {
        const field = settings.kaleidoscope ? 'segments' : 'symmetry';
        const [min, max] = field === 'segments' ? [3, 12] : [1, 12];
        setSettings((s) => ({ ...s, [field]: Math.max(min, Math.min(max, s[field] + (k === ']' ? 1 : -1))) }));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.kaleidoscope]);

  // Pointer painting (coordinates relative to the canvas).
  function pointer(handler) {
    return (e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      handler(e.clientX - rect.left, e.clientY - rect.top, e);
    };
  }

  const sections = data ? sectionsFor(data) : [];

  return (
    <div className="ff-page">
      {data && <SiteNav profile={data.profile} sections={sections} />}
      <main className="ff-stage" ref={stageRef} style={{ background: PALETTES[settings.palette].bg }}>
        <h1 className="sr-only">Flow field with kaleidoscope view</h1>
        <canvas
          ref={canvasRef}
          className="ff-canvas"
          data-no-glitch // painting maps the pointer to the canvas's position, so it must hold still
          role="img"
          aria-label={`Animated flow field${settings.kaleidoscope ? `, kaleidoscope view with ${settings.segments} segments` : ''}. Drag to paint particles.`}
          onPointerDown={pointer((x, y, e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            engineRef.current.pointerDown(x, y);
          })}
          onPointerMove={pointer((x, y) => engineRef.current.pointerMove(x, y))}
          onPointerUp={() => engineRef.current.pointerUp()}
          onPointerCancel={() => engineRef.current.pointerUp()}
        />

        <aside id="ff-panel" className={`ff-panel${panelOpen ? '' : ' hidden'}`} aria-label="Flow field controls" inert={!panelOpen ? '' : undefined}>
          <h2>Flow Field</h2>

          <fieldset className="ff-group">
            <legend>Palette</legend>
            <div className="ff-palettes">
              {PALETTES.map((p, i) => (
                <button
                  key={p.name}
                  type="button"
                  className={`ff-swatch${settings.palette === i ? ' active' : ''}`}
                  style={{ background: `linear-gradient(90deg, ${p.colors.join(',')})` }}
                  aria-label={p.name}
                  aria-pressed={settings.palette === i}
                  title={p.name}
                  onClick={() => set('palette', i)}
                />
              ))}
            </div>
          </fieldset>

          <fieldset className="ff-group">
            <legend>Kaleidoscope</legend>
            <label className="ff-switch">
              <input type="checkbox" role="switch" checked={settings.kaleidoscope} onChange={(e) => set('kaleidoscope', e.target.checked)} />
              <span className="ff-switch-track" aria-hidden="true" />
              Kaleidoscope view
            </label>
            {settings.kaleidoscope &&
              KALEIDO_SLIDERS.map((spec) => <Slider key={spec.key} spec={spec} value={settings[spec.key]} onChange={set} />)}
          </fieldset>

          <fieldset className="ff-group">
            <legend>Field</legend>
            {SLIDERS.map((spec) => (
              <Slider key={spec.key} spec={spec} value={settings[spec.key]} onChange={set} />
            ))}
            {STROKE_SLIDERS.map((spec) => (
              <Slider key={spec.key} spec={spec} value={settings[spec.key]} onChange={set} />
            ))}
            <label className="ff-check">
              <input type="checkbox" checked={settings.mirror} onChange={(e) => set('mirror', e.target.checked)} />
              Mirror painted strokes
            </label>
          </fieldset>

          <div className="ff-buttons">
            <button type="button" className="btn btn-small btn-primary" onClick={() => setPaused((p) => !p)}>
              {paused ? 'Play' : 'Pause'}
            </button>
            <button type="button" className="btn btn-small" onClick={() => engineRef.current.clear()}>
              Clear
            </button>
            <button type="button" className="btn btn-small" onClick={randomize}>
              Randomize
            </button>
            <button type="button" className="btn btn-small" onClick={save}>
              Save PNG
            </button>
          </div>

          <p className="ff-hint">
            Drag on the canvas to paint. <kbd>Space</kbd> pause · <kbd>K</kbd> kaleidoscope · <kbd>[</kbd> <kbd>]</kbd>{' '}
            {settings.kaleidoscope ? 'segments' : 'symmetry'} · <kbd>C</kbd> clear · <kbd>R</kbd> randomize · <kbd>S</kbd> save ·{' '}
            <kbd>H</kbd> hide panel
          </p>
        </aside>

        <button
          type="button"
          className="ff-toggle"
          aria-expanded={panelOpen}
          aria-controls="ff-panel"
          onClick={() => setPanelOpen((o) => !o)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {panelOpen ? 'Hide controls' : 'Show controls'}
        </button>
      </main>
    </div>
  );
}
