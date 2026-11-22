// Landing page ("Portal") only: builds the 3D scene and animates it.
// It never calls into the app; it only watches #warp / #portal to know when generation starts or the landing returns.
import { makeDraggable } from './gestures.js';

const gsap = window.gsap;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !gsap;
const $ = (s, el = document) => el.querySelector(s);
const portal = $('#portal'), scene = $('.lp-scene'), warp = $('#warp');
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- Portal: rings, core, sparkles ---------- */
const RINGS = [ // size, depth, seconds per turn, direction, colours
  { s: 100, z: 70, t: 26, dir: 'normal', c: ['#e0261f', '#f6c51c', '#f4ead2'] },
  { s: 86, z: 0, t: 19, dir: 'reverse', c: ['#7c5cff', '#19e3ff', '#f4ead2'] },
  { s: 72, z: -75, t: 14, dir: 'normal', c: ['#f6c51c', '#ff3ea5', '#e0261f'] },
  { s: 59, z: -150, t: 10, dir: 'reverse', c: ['#19e3ff', '#7c5cff', '#ff3ea5'] },
  { s: 47, z: -225, t: 7, dir: 'normal', c: ['#f4ead2', '#f6c51c', '#e0261f'] },
  { s: 36, z: -295, t: 5, dir: 'reverse', c: ['#ff3ea5', '#f6c51c', '#19e3ff'] },
];
const rings = RINGS.map((r, i) => `<div class="lp-ring" style="--s:${r.s}%;--z:${r.z}px;--t:${r.t}s;--dir:${r.dir};--a:${i * 47}deg;--c1:${r.c[0]};--c2:${r.c[1]};--c3:${r.c[2]}"></div>`).join('');
const sparks = Array.from({ length: 12 }, (_, i) => {
  const c = ['#fff', '#f6c51c', '#19e3ff', '#ff3ea5'][i % 4];
  return `<div class="lp-spark" style="--r:calc(var(--ps) * ${rand(.2, .56).toFixed(2)});--z:${rand(-260, 90).toFixed(0)}px;--t:${rand(5, 13).toFixed(1)}s;--dir:${i % 2 ? 'reverse' : 'normal'};--d:${rand(4, 8).toFixed(0)}px;--c:${c};rotate:${i * 30}deg"></div>`;
}).join('');

/* ---------- Floating objects ---------- */
const PAGES = [ // x%, y%, depth, headline, doodle
  [9, 20, -120, 'ALIENS WIN TOSS', '🛸'], [90, 17, 60, 'MOON ON STRIKE', '🌙'], [13, 66, 110, 'CHAI HITS ₹900', '🫖'],
  [89, 62, -160, 'CATS DEMAND VOTE', '🐈'], [29, 9, -260, 'TIME RUNS LATE', '⏰'], [72, 88, 30, 'GHOST ELECTED', '🗳️'], [5, 90, -60, 'SKY MISPLACED', '☁️'],
];
const STICKERS = [[21, 40, 140, '🚀'], [80, 38, -40, '🥟'], [7, 45, -200, '🏏'], [94, 84, 120, '📷'], [70, 10, -120, '☕'], [26, 86, 70, '👻']];
const float = () => `--dur:${rand(4, 8).toFixed(1)}s;--del:${rand(-6, 0).toFixed(1)}s;--rx:${rand(8, 26).toFixed(0)}deg;--ry:${rand(-34, 34).toFixed(0)}deg;--rz:${rand(-14, 14).toFixed(0)}deg`;
const pages = PAGES.map(([x, y, z, head, doodle], i) =>
  `<div class="lp-slot${i > 3 ? ' extra' : ''}" data-z="${z}" style="--x:${x}%;--y:${y}%"><div class="lp-float" style="${float()}"><div class="lp-page"><b>${head}</b><span>${doodle}</span></div></div></div>`).join('');
const stickers = STICKERS.map(([x, y, z, emoji], i) =>
  `<div class="lp-slot${i > 3 ? ' extra' : ''}" data-z="${z}" style="--x:${x}%;--y:${y}%"><div class="lp-float" style="${float()}"><div class="lp-sticker${i % 2 ? ' alt' : ''}">${emoji}</div></div></div>`).join('');

scene.innerHTML = `
  <div class="lp-dust d1"><i></i></div><div class="lp-dust d2"><i></i></div>
  <div class="lp-world">
    <div class="lp-portal"><div class="lp-tilt"><div class="lp-glow"></div>${rings}<div class="lp-core"></div>${sparks}</div></div>
    ${pages}${stickers}
  </div>
  <div class="lp-dust d3"><i></i></div>
  <div class="lp-hit"></div>`;
const flash = Object.assign(document.createElement('div'), { id: 'lp-flash' });
document.body.append(flash);

const world = $('.lp-world', scene), portalEl = $('.lp-portal', scene), tilt = $('.lp-tilt', scene);
const slots = [...scene.querySelectorAll('.lp-slot')], dust = [...scene.querySelectorAll('.lp-dust')];
const title = $('.lp-title'), head = $('.lp-head'), controls = $('.lp-controls');

/* ---------- Text: split title, typewriter tagline ---------- */
let n = 0;
title.innerHTML = title.textContent.split(' ').map(w => `<span class="lw">${[...w].map(c => `<span class="lc" style="--i:${n++}">${c}</span>`).join('')}</span>`).join(' ');
const letters = title.querySelectorAll('.lc');

const LINES = ["All the news that's fit to imagine.", 'Printed in a universe near you.', 'Facts not guaranteed in any dimension.', 'Now with 40% more Tuesdays.', 'Trusted by nobody, read by everybody.'];
function typewriter(el) {
  let line = 0, pos = el.textContent.length, dir = -1, wait = 40;
  setInterval(() => {
    if (portal.hidden) return;
    if (wait > 0) { wait--; return; }
    pos += dir;
    el.textContent = LINES[line].slice(0, pos);
    if (pos === 0) { dir = 1; line = (line + 1) % LINES.length; }
    if (dir === 1 && pos === LINES[line].length) { dir = -1; wait = 45; } // hold the full line
  }, 45);
}

/* ---------- Interactions ---------- */
// vector from a slot's home to the centre of the portal
function toCentre(slot) {
  const s = slot.getBoundingClientRect(), p = scene.getBoundingClientRect();
  const x = +gsap.getProperty(slot, 'x'), y = +gsap.getProperty(slot, 'y');
  return { x: p.left + p.width / 2 - (s.left - x), y: p.top + p.height * .43 - (s.top - y) };
}

function ripple() {
  const wave = document.createElement('div');
  wave.className = 'lp-wave';
  tilt.append(wave);
  gsap.fromTo(wave, { scale: .2, opacity: 1, z: 60 }, { scale: 4.2, opacity: 0, duration: .9, ease: 'power2.out', onComplete: () => wave.remove() });
  gsap.fromTo(portalEl, { scale: 1.16 }, { scale: 1, duration: .9, ease: 'elastic.out(1, .35)' });
  slots.forEach(slot => { // scatter away from the centre, then drift home
    const c = toCentre(slot), d = Math.hypot(c.x, c.y) || 1;
    gsap.timeline().to(slot, { x: -c.x / d * 90, y: -c.y / d * 90, duration: .28, ease: 'power2.out' })
      .to(slot, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, .4)' });
  });
}

function inkSplat(btn) {
  const r = btn.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 14; i++) {
    const drop = document.createElement('i');
    drop.className = 'lp-ink';
    drop.style.setProperty('--c', ['#e0261f', '#f6c51c', '#1b1712', '#f4ead2'][i % 4]);
    document.body.append(drop);
    const a = rand(0, Math.PI * 2), dist = rand(50, 150);
    gsap.fromTo(drop, { x: cx, y: cy, scale: rand(.5, 1.7) },
      { x: cx + Math.cos(a) * dist, y: cy + Math.sin(a) * dist + 40, scale: 0, duration: rand(.45, .8), ease: 'power2.out', onComplete: () => drop.remove() });
  }
}

function initParallax() {
  gsap.set(world, { transformPerspective: 900 });
  const to = (el, prop) => gsap.quickTo(el, prop, { duration: .7, ease: 'power3.out' });
  const wx = to(world, 'rotationY'), wy = to(world, 'rotationX');
  const layers = [[dust[0], 8], [dust[1], 20], [dust[2], 44], [head, -10]].map(([el, k]) => ({ x: to(el, 'x'), y: to(el, 'y'), k }));
  const move = (nx, ny) => { // nx, ny in -1..1
    wx(nx * 9); wy(-ny * 6);
    layers.forEach(l => { l.x(-nx * l.k); l.y(-ny * l.k); });
  };
  addEventListener('pointermove', e => { if (!portal.hidden && e.pointerType === 'mouse') move(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });

  // phones: gyroscope when allowed, otherwise a slow automatic sway
  let sway;
  if (matchMedia('(pointer: coarse)').matches) {
    const o = { a: 0 };
    sway = gsap.to(o, { a: Math.PI * 2, duration: 14, repeat: -1, ease: 'none', onUpdate: () => !portal.hidden && move(Math.sin(o.a) * .7, Math.cos(o.a * 2) * .4) });
  }
  addEventListener('deviceorientation', e => {
    if (e.gamma == null || portal.hidden) return;
    sway?.kill(); sway = null;
    move(gsap.utils.clamp(-1, 1, e.gamma / 28), gsap.utils.clamp(-1, 1, (e.beta - 45) / 28));
  });
}

/* ---------- Page-load intro (under 2 seconds) ---------- */
function intro() {
  gsap.killTweensOf([portalEl, tilt, head, controls, title, ...slots, ...letters]);
  gsap.set([portalEl, tilt, head, controls, title, ...slots], { clearProps: 'scale,opacity,x,y,rotation' });
  slots.forEach(s => gsap.set(s, { z: +s.dataset.z }));
  title.classList.remove('wave');
  gsap.from(portalEl, { scale: 0, duration: .9, ease: 'back.out(1.7)' });
  slots.forEach((slot, i) => {
    const c = toCentre(slot);
    gsap.from(slot, { x: c.x, y: c.y, scale: 0, rotation: rand(-200, 200), duration: .85, ease: 'back.out(1.3)', delay: .25 + i * .05 });
  });
  gsap.from(letters, { y: -70, opacity: 0, rotation: () => rand(-35, 35), duration: .6, ease: 'bounce.out', stagger: .022, delay: .3,
    onComplete: () => { gsap.set(letters, { clearProps: 'transform,opacity' }); title.classList.add('wave'); } });
  gsap.from('.lp-stamp', { scale: 3, opacity: 0, duration: .25, ease: 'power4.in', delay: 1.1 });
  gsap.from(controls.children, { y: 40, opacity: 0, duration: .5, ease: 'back.out(1.6)', stagger: .08, delay: .7, clearProps: 'transform,opacity' });
}

/* ---------- Transition: 1-second suck-in, then the existing Warp takes over ---------- */
function suckIn() {
  document.body.classList.add('lp-exit'); // CSS keeps the already-running Warp out of sight
  title.classList.remove('wave');
  gsap.timeline({
    onComplete() {
      document.body.classList.remove('lp-exit');
      gsap.to(flash, { opacity: 0, duration: .35, ease: 'power1.out' });
    },
  })
    .to(portalEl, { scale: 3.4, duration: .95, ease: 'power3.in' }, 0)
    .to(tilt, { rotation: 540, duration: .95, ease: 'power2.in' }, 0)
    .to(slots, { x: i => toCentre(slots[i]).x, y: i => toCentre(slots[i]).y, scale: 0, rotation: 360, duration: .7, ease: 'power3.in', stagger: .015 }, 0)
    .to(head, { scale: .5, opacity: 0, duration: .55, ease: 'power2.in' }, 0)
    .to(controls, { scale: .8, opacity: 0, duration: .45, ease: 'power2.in' }, 0)
    .to(flash, { opacity: 1, duration: .22, ease: 'power2.in' }, .75);
}

/* ---------- Wiring ---------- */
if (reduced) {
  slots.forEach(s => { s.style.transform = `translateZ(${s.dataset.z}px)`; });
} else {
  typewriter($('#lp-type'));
  initParallax();
  slots.forEach(s => makeDraggable(s));
  $('.lp-hit', scene).addEventListener('pointerdown', ripple);
  $('#form button').addEventListener('pointerdown', e => inkSplat(e.currentTarget));
  $('#form').addEventListener('submit', () => inkSplat($('#form button')));
  document.fonts?.ready.then(intro) ?? intro();

  // Generation started (Warp shown while the landing is up) -> suck-in.
  // Warp finished or landing reopened while the landing is visible -> rebuild the scene.
  new MutationObserver(() => {
    if (portal.hidden) return;
    if (!warp.hidden) suckIn(); else intro();
  }).observe(warp, { attributes: true, attributeFilter: ['hidden'] });
  new MutationObserver(() => { if (!portal.hidden && warp.hidden) intro(); })
    .observe(portal, { attributes: true, attributeFilter: ['hidden'] });
}
