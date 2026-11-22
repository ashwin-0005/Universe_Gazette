// Runs inside the page: full demo path for one premise (PREMISE is substituted by the caller)
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
  const t0 = performance.now(), secs = () => Math.round((performance.now() - t0) / 100) / 10;
  $('#premise').value = 'PREMISE';
  $('#form button').click();
  await sleep(1000);
  while (!$('#warp').hidden && secs() < 80) await sleep(250);
  const paperAt = secs();
  while ($$('.svg-wrap.shimmer').length && secs() < 110) await sleep(250);
  const photosAt = secs();
  window.scrollTo(0, document.body.scrollHeight);
  await sleep(2500);
  return JSON.stringify({
    paperAt, photosAt,
    status: $('#status').textContent, toast: $('#toast').textContent, archive: /archive/i.test($('#toast').textContent),
    masthead: $('.title')?.textContent,
    banner: $('.banner .headline')?.textContent,
    stories: $$('.story').length, ticks: $$('.tick').length / 2, ads: $$('.ad').length,
    photosOk: $$('.svg-wrap svg').length, photosLost: $$('.no-photo').length,
    letter: ($('.letter p')?.textContent || '').length > 20,
    scores: [...$$('.scoreboard b')].map(b => b.textContent),
    meters: [...$$('.meter b')].map(b => b.textContent),
    overflowX: document.documentElement.scrollWidth > innerWidth,
  });
})()
