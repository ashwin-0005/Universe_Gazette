// Runs inside the page (?demo=1): feeds the renderer a hostile edition and checks nothing executes or leaks
(async () => {
  const { renderGazette, sanitizeSvg, fillPhoto } = await import('/js/render.js');
  window.__pwned = 0;
  const evil = '<img src=x onerror="window.__pwned++"><script>window.__pwned++</script>"\'><svg onload="window.__pwned++">';
  const badSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" onload="window.__pwned++">
    <script>window.__pwned++</script><style>@import url(http://evil.test/x.css); rect{background:url(http://evil.test/a)}</style>
    <foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><img src="x" onerror="window.__pwned++"/></body></foreignObject>
    <a href="javascript:window.__pwned++"><rect width="50" height="50"/></a>
    <image href="http://evil.test/track.png"/><use href="http://evil.test/x.svg#a"/>
    <rect width="10" height="10" fill="url(http://evil.test/f)" onclick="window.__pwned++" style="background:url(http://evil.test/s)"/>
    <set attributeName="href" to="javascript:window.__pwned++"/><animate attributeName="href" values="javascript:alert(1)"/>
    <circle cx="5" cy="5" r="5" fill="red"/></svg>`;
  const photo = () => ({ scene: evil, caption: evil, secret: evil, svg: badSvg });
  const ed = {
    universe_name: evil, masthead: evil, date: evil, banner_headline: evil, hero_photo: photo(),
    stories: [1, 2, 3].map(() => ({ headline: evil, byline: evil, text: evil, photo: photo() })),
    weather: { icon: evil, temp: evil, forecast: evil },
    sports: { headline: evil, score_a: evil, score_b: '1;alert(1)', team_a: evil, team_b: evil },
    stock_ticker: [1, 2, 3, 4].map(() => ({ name: evil, price: evil, change: evil })),
    classifieds: [evil, evil, evil], letter_to_editor: evil, cartoon: photo(),
    popups: [], chaos_score: evil, believability_score: '50%;background:url(http://evil.test/m)',
  };
  const root = document.querySelector('#gazette');
  renderGazette(ed, root);
  [ed.hero_photo, ...ed.stories.map(s => s.photo), ed.cartoon].forEach(fillPhoto);
  await new Promise(r => setTimeout(r, 1500));
  const svg = sanitizeSvg(badSvg);
  const html = root.innerHTML;
  return JSON.stringify({
    scriptsRan: window.__pwned,
    injectedTags: root.querySelectorAll('img, script, iframe, foreignObject, a, image, style, set, animate').length,
    handlerAttrs: [...root.querySelectorAll('*')].filter(n => [...n.attributes].some(a => a.name.startsWith('on'))).length,
    externalRefs: (html.match(/evil\.test/g) || []).filter(Boolean).length - (root.textContent.match(/evil\.test/g) || []).length,
    svgKeptSafeShapes: svg.querySelectorAll('circle, rect').length,
    photosRendered: root.querySelectorAll('.svg-wrap svg').length,
  });
})()
