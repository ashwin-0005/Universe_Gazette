// Runs inside the page (via tools/shot.mjs): long-press the banner headline, double-tap a photo
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const h = document.querySelector('.banner .headline'), r = h.getBoundingClientRect();
  const o = { bubbles: true, clientX: r.x + 50, clientY: r.y + 20, pointerId: 1 };
  h.dispatchEvent(new PointerEvent('pointerdown', o));
  await sleep(700);
  h.dispatchEvent(new PointerEvent('pointerup', o));
  const p = document.querySelector('.photo');
  p.click(); p.click();
  return { headline: h.className, text: h.textContent.slice(0, 40), zoomOpen: !document.querySelector('#zoom').hidden };
})()
