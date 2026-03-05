/* ===== CAPM Calculator (Security Market Line & Jensen's Alpha) ===== */

let capmChart = null;

const CAPM_DEFAULTS = [
  { name: 'Stock A', beta: 1.2, obsReturn: 14 },
  { name: 'Stock B', beta: 0.8, obsReturn: 7  },
  { name: 'Stock C', beta: 1.5, obsReturn: 12 },
  { name: 'Stock D', beta: 0.5, obsReturn: 6  },
  { name: 'Stock E', beta: 2.0, obsReturn: 18 },
];

/* ── Helpers ────────────────────────────────────────────────────────── */

function capmGetN() {
  return parseInt(document.getElementById('capm-num-assets').value) || 3;
}

/* ── Build / rebuild asset inputs ──────────────────────────────────── */

function capmBuildInputs() {
  const n = capmGetN();
  const container = document.getElementById('capm-asset-inputs');

  // Preserve existing values
  const old = [];
  for (let i = 0; i < 10; i++) {
    const nameEl = document.getElementById(`capm-name-${i}`);
    const betaEl = document.getElementById(`capm-beta-${i}`);
    const obsEl  = document.getElementById(`capm-obs-${i}`);
    if (nameEl) {
      old.push({
        name: nameEl.value,
        beta: parseFloat(betaEl.value),
        obsReturn: parseFloat(obsEl.value)
      });
    }
  }

  let html = '';
  for (let i = 0; i < n; i++) {
    const d = old[i] || CAPM_DEFAULTS[i] || { name: `Asset ${i+1}`, beta: 1.0, obsReturn: 10 };
    html += `
      <div class="capm-asset-row">
        <div class="input-group" style="flex:1.2">
          ${i === 0 ? '<label>Name</label>' : ''}
          <input type="text" id="capm-name-${i}" value="${d.name}" oninput="capmUpdate()">
        </div>
        <div class="input-group" style="flex:0.8">
          ${i === 0 ? '<label>&beta;</label>' : ''}
          <input type="number" id="capm-beta-${i}" value="${d.beta}" step="0.1" min="-3" max="5" oninput="capmUpdate()">
        </div>
        <div class="input-group" style="flex:1">
          ${i === 0 ? '<label>Observed R (%)</label>' : ''}
          <input type="number" id="capm-obs-${i}" value="${d.obsReturn}" step="0.5" oninput="capmUpdate()">
        </div>
      </div>`;
  }
  container.innerHTML = html;
  capmUpdate();
}

function capmChangeAssets(delta) {
  const el = document.getElementById('capm-num-assets');
  const v = Math.max(2, Math.min(8, capmGetN() + delta));
  el.value = v;
  capmBuildInputs();
}

/* ── Main update ───────────────────────────────────────────────────── */

function capmUpdate() {
  const rf  = parseFloat(document.getElementById('capm-rf').value) || 0;
  const erm = parseFloat(document.getElementById('capm-erm').value) || 0;
  const mrp = erm - rf;

  // Show market risk premium
  const mrpEl = document.getElementById('capm-mrp');
  if (mrpEl) mrpEl.textContent = mrp.toFixed(2) + '%';

  const n = capmGetN();
  const assets = [];
  for (let i = 0; i < n; i++) {
    const name = (document.getElementById(`capm-name-${i}`)?.value || `Asset ${i+1}`).trim();
    const beta = parseFloat(document.getElementById(`capm-beta-${i}`)?.value) || 0;
    const obs  = parseFloat(document.getElementById(`capm-obs-${i}`)?.value);
    const hasObs = !isNaN(obs) && document.getElementById(`capm-obs-${i}`)?.value !== '';
    const expected = rf + beta * mrp;
    const alpha = hasObs ? obs - expected : null;
    let verdict = '';
    if (alpha !== null) {
      if (alpha > 0.5)       verdict = 'Undervalued';
      else if (alpha < -0.5) verdict = 'Overvalued';
      else                   verdict = 'Fairly Priced';
    }
    assets.push({ name, beta, expected, obs: hasObs ? obs : null, alpha, verdict });
  }

  // ── Results table ──
  const resultEl = document.getElementById('capm-results');
  const cols = [
    { label: 'Asset',      key: 'name' },
    { label: '\u03B2',     key: 'beta',     align: 'right' },
    { label: 'CAPM E[R]',  key: 'expected', align: 'right' },
    { label: 'Observed R', key: 'obs',      align: 'right' },
    { label: '\u03B1',     key: 'alpha',    align: 'right' },
    { label: 'Verdict',    key: 'verdict' },
  ];
  const rows = assets.map(a => ({
    name: a.name,
    beta: a.beta.toFixed(2),
    expected: a.expected.toFixed(2) + '%',
    obs: a.obs !== null ? a.obs.toFixed(2) + '%' : '\u2014',
    alpha: a.alpha !== null
      ? `<span style="color:${a.alpha > 0 ? COLORS.green : a.alpha < 0 ? COLORS.red : '#1a1a1a'};font-weight:600">${a.alpha >= 0 ? '+' : ''}${a.alpha.toFixed(2)}%</span>`
      : '\u2014',
    verdict: a.verdict
  }));
  resultEl.innerHTML = buildTable(cols, rows);

  // ── Chart ──
  const maxBeta = Math.max(...assets.map(a => a.beta), 1.5);
  const minBeta = Math.min(...assets.map(a => a.beta), 0);
  const smlMinB = Math.min(minBeta - 0.2, -0.2);
  const smlMaxB = maxBeta + 0.5;

  // SML line data
  const smlPoints = [];
  const steps = 50;
  for (let s = 0; s <= steps; s++) {
    const b = smlMinB + (smlMaxB - smlMinB) * (s / steps);
    smlPoints.push({ x: b, y: rf + b * mrp });
  }

  // Asset scatter points
  const assetPoints = assets.map(a => ({
    x: a.beta,
    y: a.obs !== null ? a.obs : a.expected
  }));
  const assetColors = assets.map(a => {
    if (a.alpha === null) return COLORS.blue;
    if (a.alpha > 0.5)    return COLORS.green;
    if (a.alpha < -0.5)   return COLORS.red;
    return COLORS.blue;
  });

  // Expected-return points (on the SML)
  const expectedPoints = assets.map(a => ({ x: a.beta, y: a.expected }));

  const ctx = document.getElementById('capm-chart').getContext('2d');
  if (capmChart) capmChart.destroy();

  capmChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Security Market Line',
          data: smlPoints,
          showLine: true,
          borderColor: COLORS.blue,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 2
        },
        {
          label: 'Assets (Observed)',
          data: assetPoints,
          pointBackgroundColor: assetColors,
          pointBorderColor: assetColors,
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
          order: 1
        },
        {
          label: 'CAPM Expected',
          data: expectedPoints,
          pointBackgroundColor: 'rgba(31,119,180,0.3)',
          pointBorderColor: COLORS.blue,
          pointBorderWidth: 2,
          pointRadius: 6,
          pointStyle: 'triangle',
          showLine: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Security Market Line (SML)',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          labels: { font: { size: 13 } }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              if (ctx.datasetIndex === 0) {
                return `SML: \u03B2=${ctx.parsed.x.toFixed(2)}, E[R]=${ctx.parsed.y.toFixed(2)}%`;
              }
              const i = ctx.dataIndex;
              const a = assets[i];
              if (!a) return '';
              if (ctx.datasetIndex === 1) {
                const lines = [`${a.name}: \u03B2=${a.beta.toFixed(2)}`];
                if (a.obs !== null) lines.push(`Observed R = ${a.obs.toFixed(2)}%`);
                lines.push(`CAPM E[R] = ${a.expected.toFixed(2)}%`);
                if (a.alpha !== null) lines.push(`\u03B1 = ${a.alpha >= 0 ? '+' : ''}${a.alpha.toFixed(2)}% (${a.verdict})`);
                return lines;
              }
              if (ctx.datasetIndex === 2) {
                return `${a.name} CAPM E[R] = ${a.expected.toFixed(2)}%`;
              }
            }
          }
        },
        // Draw alpha arrows from expected to observed
        annotation: {
          annotations: assets.reduce((acc, a, i) => {
            if (a.obs !== null && a.alpha !== null && Math.abs(a.alpha) > 0.01) {
              acc[`alpha-${i}`] = {
                type: 'line',
                xMin: a.beta, xMax: a.beta,
                yMin: a.expected, yMax: a.obs,
                borderColor: a.alpha > 0 ? COLORS.green : COLORS.red,
                borderWidth: 2,
                borderDash: [4, 4]
              };
            }
            return acc;
          }, {})
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Systematic Risk (\u03B2)', font: { size: 16, weight: 'bold' } },
          ticks: { font: { size: 14 } }
        },
        y: {
          title: { display: true, text: 'Expected Return E[R] (%)', font: { size: 16, weight: 'bold' } },
          ticks: {
            font: { size: 14 },
            callback: function(value) { return value.toFixed(1) + '%'; }
          }
        }
      }
    }
  });
}
