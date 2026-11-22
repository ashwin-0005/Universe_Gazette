// Runs inside the landing page: ripple, chip wiring, and the suck-in hand-off (no API call is made)
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s);
  const out = {};
  // ripple: tap the portal
  $('.lp-hit').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  await sleep(150);
  out.rippleWave = !!$('.lp-wave');
  await sleep(1600);
  out.waveCleaned = !$('.lp-wave');
  // simulate generation starting: the app un-hides the Warp
  const warp = $('#warp');
  warp.hidden = false;
  await sleep(60);
  out.warpHeldBack = document.body.classList.contains('lp-exit') && getComputedStyle(warp).visibility === 'hidden';
  await sleep(700);
  out.titleFading = +getComputedStyle($('.lp-head')).opacity < .3;
  await sleep(450);
  out.handedOffAfterMs = document.body.classList.contains('lp-exit') ? 'still held at 1.2s' : 'released by 1.2s';
  out.warpVisible = getComputedStyle(warp).visibility === 'visible';
  // warp ends with the landing still up (error path): scene must rebuild
  warp.hidden = true;
  await sleep(2200);
  out.sceneRestored = +getComputedStyle($('.lp-head')).opacity === 1 && +getComputedStyle($('.lp-controls')).opacity === 1;
  out.flashGone = +getComputedStyle($('#lp-flash')).opacity === 0;
  out.inputWired = $('#premise') && $('#form button').textContent === 'Enter Universe' && document.querySelectorAll('#chips .chip').length === 6;
  return JSON.stringify(out);
})()
