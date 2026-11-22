// GSAP entrance, scroll animations, 3D tilt, warp screen
const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches || !gsap;
if (gsap) gsap.registerPlugin(ScrollTrigger);

const $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
export const delay = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Warp ---------- */
const MESSAGES = ['Printing the ink...', 'Bribing the editor...', 'Inventing a new weather...', 'Interviewing a pigeon...', 'Fact-checking (skipped)...', 'Folding spacetime neatly...', 'Photoshopping the photos...', 'Waking the newsboy...'];
const FLYERS = ['EXTRA!', 'SCANDAL', 'EXCLUSIVE', 'SHOCKING', 'LATE EDITION', 'READ ALL ABOUT IT', 'UNCONFIRMED', 'WOW'];
let msgTimer;

export function startWarp() {
  const warp = $('#warp'), tunnel = warp.querySelector('.tunnel');
  warp.hidden = false;
  let i = 0;
  const next = () => { $('#warp-msg').textContent = MESSAGES[i++ % MESSAGES.length]; };
  next();
  msgTimer = setInterval(next, 1500);
  if (reduced) return;
  tunnel.innerHTML = Array.from({ length: 26 }, (_, n) => {
    const word = n % 3 === 0 ? `<b>${FLYERS[n % FLYERS.length]}</b>` : '';
    return `<div class="${word ? 'flyer' : 'page'}" style="--x:${rand(-60, 60).toFixed(0)}vw;--y:${rand(-60, 60).toFixed(0)}vh;--r:${rand(-200, 200).toFixed(0)}deg;animation-delay:${rand(-2.4, 0).toFixed(2)}s">${word}</div>`;
  }).join('');
  gsap.fromTo(warp, { opacity: 0 }, { opacity: 1, duration: .3 });
}

export async function stopWarp() {
  clearInterval(msgTimer);
  const warp = $('#warp');
  if (!reduced) await gsap.to(warp, { opacity: 0, duration: .3 });
  warp.hidden = true;
  warp.querySelector('.tunnel').innerHTML = '';
}

/* ---------- Helpers ---------- */
function splitChars(el) {
  el.innerHTML = el.textContent.split(' ').map(w =>
    `<span class="word">${[...w].map(c => `<span class="ch">${c}</span>`).join('')}</span>`).join(' ');
  return el.querySelectorAll('.ch');
}

// Wrap words (except the first, which keeps the drop cap) and tag each with its line number.
function splitWords(p) {
  const [first, ...rest] = p.textContent.split(' ');
  p.textContent = first + ' ';
  const spans = rest.map(w => {
    const s = document.createElement('span');
    s.className = 'w'; s.textContent = w;
    p.append(s, ' ');
    return s;
  });
  const tops = [...new Set(spans.map(s => s.offsetTop))];
  return spans.map(s => ({ el: s, line: tops.indexOf(s.offsetTop) }));
}

function countUp(el) {
  const to = +el.dataset.to || 0, o = { v: 0 };
  el.textContent = '0';
  gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); },
    scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
}

/* ---------- Entrance + scroll ---------- */
export function playEntrance(root, { flip = false } = {}) {
  if (reduced) return;
  ScrollTrigger.getAll().forEach(t => t.kill());
  gsap.killTweensOf(root);
  gsap.set(root, { clearProps: 'transform,opacity' });

  // The paper drops in, then unfolds panel by panel
  if (flip) gsap.from(root, { rotationY: 95, opacity: 0, duration: .7, ease: 'back.out(1.2)', transformPerspective: 1400, transformOrigin: `0 ${innerHeight / 2}px` });
  else gsap.from(root, { y: -innerHeight, rotationX: 55, scale: .55, opacity: 0, duration: .8, ease: 'back.out(1.1)', transformPerspective: 1400, transformOrigin: '50% 0' });
  gsap.from(root.querySelectorAll('.panel'), { rotationX: -92, opacity: 0, transformOrigin: '50% 0', transformPerspective: 900, duration: .65, ease: 'back.out(1.5)', stagger: .11, delay: .45, clearProps: 'transform,opacity' });

  // Masthead letters bounce in
  gsap.from(splitChars(root.querySelector('.title')), { y: -90, opacity: 0, rotation: () => rand(-40, 40), duration: .7, ease: 'bounce.out', stagger: .028, delay: .7 });

  // BREAKING slams down + screen shake
  gsap.from(root.querySelector('.breaking'), { scale: 5, opacity: 0, rotation: -30, duration: .28, ease: 'power4.in', delay: 1.7,
    onComplete() {
      document.dispatchEvent(new CustomEvent('gazette:stamp'));
      gsap.fromTo('#stage', { x: -10, y: 6 }, { x: 0, y: 0, duration: .5, ease: 'elastic.out(1.4, .18)', clearProps: 'transform' });
    } });
  gsap.from(root.querySelector('.banner .headline'), { scale: .7, opacity: 0, duration: .5, ease: 'back.out(2)', delay: 1.25 });
  gsap.from(root.querySelector('.shopped'), { scale: 3, opacity: 0, duration: .25, ease: 'power4.in',
    scrollTrigger: { trigger: '.hero', start: 'center 80%', once: true }, onComplete: () => document.dispatchEvent(new CustomEvent('gazette:stamp')) });

  // Headlines slide in from alternating sides and snap
  root.querySelectorAll('.story .headline, .sports .headline, h4').forEach((h, i) => {
    gsap.from(h, { x: i % 2 ? 140 : -140, opacity: 0, duration: .55, ease: 'back.out(1.8)', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
  });

  // Photos start tilted and small, straighten toward the viewport center
  root.querySelectorAll('.photo').forEach((f, i) => {
    gsap.fromTo(f, { rotation: i % 2 ? 14 : -14, scale: .78, z: 30 }, { rotation: 0, scale: 1, z: 30, ease: 'none',
      scrollTrigger: { trigger: f, start: 'top bottom', end: 'center 55%', scrub: .4 } });
  });

  // Story text reveals line by line
  root.querySelectorAll('.story-text').forEach(p => {
    const words = splitWords(p);
    gsap.from(words.map(w => w.el), { opacity: 0, y: 12, duration: .45, ease: 'power2.out', delay: i => words[i].line * .09,
      scrollTrigger: { trigger: p, start: 'top 88%', once: true } });
  });

  // Boxes, classifieds, letter
  gsap.utils.toArray(root.querySelectorAll('.box, .ad, .letter p')).forEach((el, i) => {
    gsap.from(el, { y: 60, opacity: 0, rotation: i % 2 ? 6 : -6, duration: .6, ease: 'back.out(1.6)', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  // Numbers count up, meters fill
  root.querySelectorAll('.count').forEach(countUp);
  root.querySelectorAll('.meter-bar i').forEach(b => gsap.from(b, { width: 0, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: b, start: 'top 95%', once: true } }));

  // Paper grain drifts slower than the content; ink roller tracks progress
  gsap.fromTo(root, { '--gy': '0px' }, { '--gy': '260px', ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
  gsap.fromTo('#ink-bar', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });

  gsap.set(root.querySelectorAll('.stamp, .title'), { z: 45 });
  // re-measure once the drop-in has settled and fonts are in
  gsap.delayedCall(2.4, () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

// The page turns away like a leaf of a book (dir +1 = forward, -1 = back)
export function flipOut(root, dir = 1) {
  if (reduced) return Promise.resolve();
  document.dispatchEvent(new CustomEvent('gazette:flip'));
  return gsap.to(root, { rotationY: -95 * dir, opacity: 0, duration: .5, ease: 'power2.in', transformPerspective: 1400,
    transformOrigin: `${dir > 0 ? 0 : 100}% ${scrollY + innerHeight / 2 - root.offsetTop}px` }).then(() => {});
}

// Called when a photo's drawing arrives. The cartoon assembles itself shape by shape on scroll.
export function photoArrived(fig) {
  if (reduced || !fig?.classList.contains('cartoon-photo')) return;
  const shapes = fig.querySelectorAll('svg :is(path, rect, circle, ellipse, polygon, polyline, line, text)');
  gsap.from(shapes, { opacity: 0, scale: .2, transformOrigin: '50% 50%', ease: 'back.out(2)', stagger: .2,
    scrollTrigger: { trigger: fig, start: 'top 85%', end: 'center 45%', scrub: .5 } });
}

/* ---------- 3D tilt (pointer + gyroscope) ---------- */
export function initTilt(root) {
  if (reduced) return;
  gsap.set(root, { transformPerspective: 1600 });
  const rx = gsap.quickTo(root, 'rotationX', { duration: .6, ease: 'power3.out' });
  const ry = gsap.quickTo(root, 'rotationY', { duration: .6, ease: 'power3.out' });
  const tilt = (nx, ny) => { // nx, ny in -1..1
    if (root.offsetParent === null) return;
    // pivot around the part of the paper currently on screen
    root.style.transformOrigin = `50% ${scrollY + innerHeight / 2 - root.offsetTop}px`;
    ry(nx * 3.5); rx(-ny * 2);
  };
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') tilt(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tilt(gsap.utils.clamp(-1, 1, e.gamma / 25), gsap.utils.clamp(-1, 1, (e.beta - 45) / 25));
  });
}

// iOS needs a tap before motion sensors work
export function requestSensors() {
  for (const E of [window.DeviceOrientationEvent, window.DeviceMotionEvent]) E?.requestPermission?.().catch(() => {});
}
