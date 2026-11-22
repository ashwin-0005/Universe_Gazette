// Touch / pointer interactions
import { play } from './sound.js';
const gsap = window.gsap;

// Drag an element; on release it flings with its velocity, then springs back home.
// A press that barely moves counts as a tap and calls onTap.
export function makeDraggable(el, { onTap, spin = true } = {}) {
  let start, last, vel, dragging;
  el.addEventListener('pointerdown', e => {
    if (e.button) return;
    start = last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel = { x: 0, y: 0 }; dragging = false;
  });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!dragging) {
      if (Math.hypot(dx, dy) < 8) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('dragging');
      gsap?.killTweensOf(el, 'x,y');
    }
    const now = performance.now(), dt = Math.max(1, now - last.t);
    vel = { x: (e.clientX - last.x) / dt, y: (e.clientY - last.y) / dt };
    last = { x: e.clientX, y: e.clientY, t: now };
    if (gsap) gsap.set(el, { x: dx, y: dy });
  });
  const end = e => {
    if (!start) return;
    const wasDrag = dragging;
    start = null; dragging = false;
    el.classList.remove('dragging');
    if (!wasDrag) { if (e.type === 'pointerup') onTap?.(e); return; }
    // swallow the click that follows a drag
    el.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); }, { capture: true, once: true });
    if (!gsap) return;
    const x = +gsap.getProperty(el, 'x'), y = +gsap.getProperty(el, 'y');
    gsap.timeline()
      .to(el, { x: x + vel.x * 220, y: y + vel.y * 220, ...(spin && { rotation: vel.x * 25 }), duration: .35, ease: 'power2.out' })
      .to(el, { x: 0, y: 0, ...(spin && { rotation: 0 }), duration: .9, ease: 'elastic.out(1, .45)' });
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export const PRESETS = [
  'What if Bhopal became the capital of India?',
  'What if cats ran the government?',
  'What if chai was the national currency?',
  'What if the Moon had free Wi-Fi?',
  'What if dinosaurs never went extinct?',
  'What if cricket was banned on Sundays?',
];

// Wobbly preset chips: tap to visit, or drag and fling them around
export function initChips(box, onPick) {
  box.innerHTML = PRESETS.map((p, i) => `<button type="button" class="chip" style="--d:${(i * -.37).toFixed(2)}s;--tilt:${[-4, 3, -2, 5, -3, 2][i]}deg">${p}</button>`).join('');
  box.querySelectorAll('.chip').forEach(chip => {
    makeDraggable(chip, { onTap: () => onPick(chip.textContent) });
    // keyboard users have no pointerup, so Enter/Space still works
    chip.addEventListener('click', e => { if (e.detail === 0) onPick(chip.textContent); });
  });
}

/* ---------- Gazette gestures ---------- */
const TABLOID = ['SHOCK!', 'EXCLUSIVE:', 'YOU WILL NOT BELIEVE THIS:', 'OMG!', 'SCANDAL:', 'WORLD STUNNED:'];

// Hold still for half a second to fire
function longPress(el, fire) {
  let timer, at;
  const cancel = () => clearTimeout(timer);
  el.addEventListener('pointerdown', e => {
    at = { x: e.clientX, y: e.clientY };
    timer = setTimeout(fire, 550);
  });
  el.addEventListener('pointermove', e => { if (at && Math.hypot(e.clientX - at.x, e.clientY - at.y) > 8) cancel(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, cancel);
  el.addEventListener('contextmenu', e => e.preventDefault());
}

// Long-press a headline for its tabloid version (long-press again to restore)
function toggleTabloid(h) {
  if (h.dataset.plain) {
    h.textContent = h.dataset.plain;
    delete h.dataset.plain;
    h.classList.remove('tabloid');
  } else {
    h.dataset.plain = h.textContent;
    h.textContent = `${TABLOID[Math.floor(Math.random() * TABLOID.length)]} ${h.textContent.replace(/[.!]+$/, '').toUpperCase()}!!!`;
    h.classList.add('tabloid');
  }
  play('thud');
  gsap?.fromTo(h, { scale: 1.25 }, { scale: 1, duration: .5, ease: 'elastic.out(1, .4)' });
}

function zoomPhoto(fig) {
  const svg = fig.querySelector('svg'), zoom = document.querySelector('#zoom');
  if (!svg) return;
  zoom.replaceChildren(svg.cloneNode(true));
  zoom.hidden = false;
  gsap?.fromTo(zoom.firstChild, { scale: .4, rotation: -8 }, { scale: 1, rotation: 0, duration: .45, ease: 'back.out(1.6)' });
}

// Call after every render: headlines and photos are new elements each time.
export function bindGazetteGestures(root) {
  root.querySelectorAll('.headline').forEach(h => {
    makeDraggable(h, { spin: false });
    longPress(h, () => toggleTabloid(h));
  });
  root.querySelectorAll('.photo').forEach(f => {
    makeDraggable(f, { spin: false });
    let lastTap = 0;
    f.addEventListener('click', () => { // second tap within 300ms = zoom
      if (performance.now() - lastTap < 300) zoomPhoto(f);
      lastTap = performance.now();
    });
  });
}

// Call once: swipe between editions, N key / shake for a new universe, zoom overlay
export function initGlobalGestures({ onSwipe, onNewUniverse }) {
  const stage = document.querySelector('#stage'), zoom = document.querySelector('#zoom');
  zoom.addEventListener('click', () => { zoom.hidden = true; });

  let s;
  stage.addEventListener('pointerdown', e => {
    s = e.target.closest('.headline, .photo, button') ? null : { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  stage.addEventListener('pointerup', e => {
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60 && performance.now() - s.t < 700) onSwipe(dx < 0 ? 1 : -1);
    s = null;
  });

  addEventListener('keydown', e => {
    if (e.target.matches?.('input, textarea') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'n' || e.key === 'N') onNewUniverse();
    if (e.key === 'ArrowRight') onSwipe(1);
    if (e.key === 'ArrowLeft') onSwipe(-1);
    if (e.key === 'Escape') zoom.hidden = true;
  });

  // Shake the phone for a new universe
  let lastShake = 0, prev;
  addEventListener('devicemotion', e => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (prev) {
      const jolt = Math.abs(a.x - prev.x) + Math.abs(a.y - prev.y) + Math.abs(a.z - prev.z);
      if (jolt > 32 && Date.now() - lastShake > 4000) { lastShake = Date.now(); onNewUniverse(); }
    }
    prev = { x: a.x, y: a.y, z: a.z };
  });
}
