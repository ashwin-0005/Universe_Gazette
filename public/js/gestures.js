// Touch / pointer interactions
const gsap = window.gsap;

// Drag an element; on release it flings with its velocity, then springs back home.
// A press that barely moves counts as a tap and calls onTap.
export function makeDraggable(el, { onTap, axis } = {}) {
  let start, last, vel, dragging;
  el.addEventListener('pointerdown', e => {
    if (e.button) return;
    start = last = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel = { x: 0, y: 0 }; dragging = false;
  });
  el.addEventListener('pointermove', e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = axis === 'x' ? 0 : e.clientY - start.y;
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
      .to(el, { x: x + vel.x * 220, y: y + (axis === 'x' ? 0 : vel.y * 220), rotation: vel.x * 25, duration: .35, ease: 'power2.out' })
      .to(el, { x: 0, y: 0, rotation: 0, duration: .9, ease: 'elastic.out(1, .45)' });
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

const PRESETS = [
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
