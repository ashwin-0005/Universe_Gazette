// Runs inside the page: Fast-forward 10 years, wait for the new edition, then swipe back with the arrow key
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const before = document.querySelector('.dateline span').textContent;
  const t0 = performance.now();
  document.querySelector('#btn-ff').click();
  await sleep(1500);
  while (!document.querySelector('#warp').hidden && performance.now() - t0 < 90000) await sleep(500);
  const secs = Math.round((performance.now() - t0) / 1000);
  await sleep(2500);
  const after = document.querySelector('.dateline span').textContent;
  const banner = document.querySelector('.banner .headline').textContent;
  const toast = document.querySelector('#toast').textContent;
  dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
  await sleep(2000);
  const back = document.querySelector('.dateline span').textContent;
  return { before, after, banner, toast, secs, backToFirst: back === before };
})()
