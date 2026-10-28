// The site's hover glitch: a short burst of RGB split, jitter and sliced frames, plus a quick
// letter scramble for short text. It runs through the Web Animations API with composite 'add',
// so it layers over an element's own transforms, filters and CSS animations instead of replacing them.

import { useEffect } from 'react';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// What counts as a "part": the innermost of these under the pointer is the one that glitches.
const PARTS = [
  '.hero-letter',
  'a',
  'button',
  'h1',
  'h2',
  'h3',
  'p',
  'li',
  'label',
  'time',
  'img',
  'svg',
  'canvas',
  '.status-chip',
  '.monogram',
  '.about-avatar',
  '.timeline-node',
  '.work-bignum',
  '.stat',
  '.glass',
  '.card',
  '.service-card',
].join(', ');
// Containers shake gently as a whole; everything else gets sliced frames and scrambled letters.
const BLOCKS = '.glass, .card, .service-card, canvas';
// Made of parts that glitch one by one (the name's letters), so never glitched whole
const WHOLES = '.hero-name';
// The orbiting project screens never glitch.
const SKIP = 'input, textarea, select, .preloader, .work-visual, [data-no-glitch]';
// Sliced frames clip an element, and clicks fall through the clipped parts, so anything you can
// click (or anything holding something you can click) glitches without them.
const CLICKABLE = 'a, button, label, [role="tab"]';

const DURATION = 420;
const lastRun = new WeakMap(); // element -> when it last glitched
const scrambling = new WeakSet(); // text nodes mid-scramble, so overlapping glitches can't capture garbled text

const split = (px) => `drop-shadow(${px}px 0 0 rgb(255 46 140 / 0.8)) drop-shadow(${-px}px 0 0 rgb(40 225 255 / 0.8))`;
const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];

function randomLike(ch) {
  if (/[0-9]/.test(ch)) return pick('0123456789');
  if (/[A-Z]/.test(ch)) return pick('ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&');
  return pick('abcdefghijklmnopqrstuvwxyz');
}

/** Garbles the element's text and resolves it left to right. Skips long text, which would just flicker. */
function scrambleText(el) {
  if (el.closest('.scramble') || el.querySelector('.scramble, input, textarea')) return;
  const text = el.textContent;
  if (!text.trim() || text.length > 48) return;

  const nodes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.nodeValue.trim() && !scrambling.has(node)) nodes.push({ node, original: node.nodeValue, written: null });
  }
  nodes.forEach((n) => scrambling.add(n.node));

  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / DURATION);
    for (const n of nodes) {
      // React changed the text in the meantime: that's the text to land on.
      if (n.written !== null && n.node.nodeValue !== n.written) n.original = n.node.nodeValue;
      if (t === 1) {
        n.node.nodeValue = n.original;
        scrambling.delete(n.node);
        continue;
      }
      const settled = Math.floor(t * n.original.length);
      let out = '';
      for (let i = 0; i < n.original.length; i++) {
        const ch = n.original[i];
        out += i < settled || !/[A-Za-z0-9]/.test(ch) ? ch : randomLike(ch);
      }
      n.node.nodeValue = out;
      n.written = out;
    }
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Glitches `el` once. `strength` scales the jitter and colour split; `slice` flashes horizontal
 * bands of it; `scramble` garbles short text. Repeat calls during a glitch are ignored.
 */
export function glitch(el, { strength = 1, slice = true, scramble = true } = {}) {
  if (!el?.animate || prefersReducedMotion()) return;
  const now = performance.now();
  if (now - (lastRun.get(el) ?? -Infinity) < DURATION + 250) return;
  lastRun.set(el, now);

  const full = 'inset(-20% -20% -20% -20%)'; // a little past the edges, so the colour fringes show
  const frames = [];
  const steps = 7;
  for (let i = 0; i < steps; i++) {
    const s = strength * (1 - (i / steps) * 0.6);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const frame = {
      translate: `${(dir * (1 + Math.random() * 3) * s).toFixed(1)}px ${((Math.random() - 0.5) * 2 * s).toFixed(1)}px`,
      filter: split((dir * (1.5 + Math.random() * 2.5) * s).toFixed(1)),
      easing: 'steps(1, end)',
    };
    if (slice) {
      const top = Math.random() * 70;
      const band = 10 + Math.random() * 35;
      frame.clipPath = i % 2 === 0 ? `inset(${top.toFixed(0)}% -20% ${Math.max(0, 100 - top - band).toFixed(0)}% -20%)` : full;
    }
    frames.push(frame);
  }
  frames.push({ translate: '0px 0px', filter: split(0), ...(slice && { clipPath: full }) });
  el.animate(frames, { duration: DURATION, composite: 'add' });
  if (scramble) scrambleText(el);
}

/**
 * Glitches whichever part of the page the pointer moves onto: a single letter of the name, an icon,
 * a chip, a heading, a card. Mouse and pen only; off for reduced motion.
 */
export function useGlitchHover(enabled = true) {
  useEffect(() => {
    if (!enabled || prefersReducedMotion()) return;
    let current = null;
    const onOver = (e) => {
      if (e.pointerType === 'touch' || !(e.target instanceof Element)) return;
      const part = e.target.closest(SKIP) ? null : e.target.closest(PARTS);
      if (part === current || part?.matches(WHOLES)) return;
      current = part;
      if (!part) return;
      if (part.matches(BLOCKS)) glitch(part, { strength: 0.6, slice: false, scramble: false });
      else glitch(part, { slice: !(part.matches(CLICKABLE) || part.querySelector(CLICKABLE)) });
    };
    document.addEventListener('pointerover', onOver);
    return () => document.removeEventListener('pointerover', onOver);
  }, [enabled]);
}
