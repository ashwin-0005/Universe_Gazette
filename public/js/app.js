const $ = s => document.querySelector(s);

export async function generate(premise, extra = {}) {
  const r = await fetch('/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ premise, ...extra }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Unknown error');
  return data;
}

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const premise = $('#premise').value.trim() || $('#premise').placeholder;
  $('#out').textContent = 'Printing the ink...';
  try {
    $('#out').textContent = JSON.stringify(await generate(premise), null, 2);
  } catch (err) {
    $('#out').textContent = 'Error: ' + err.message;
  }
});
