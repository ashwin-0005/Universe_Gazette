// Runs inside the page: submit a premise and record what the user sees when the API is dead
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  document.querySelector('#form button').click();
  const toasts = [];
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const x = document.querySelector('#toast').textContent;
    if (x && !toasts.includes(x)) toasts.push(x);
  }
  const title = document.querySelector('.title');
  return JSON.stringify({ toasts, paper: title ? title.textContent : null, stageHidden: document.querySelector('#stage').hidden });
})()
