/* ===== Efficient Frontier Calculator (Mean-Variance Optimization) ===== */

let efChart = null;

/* ── Tiny matrix library ─────────────────────────────────────────────── */

/** Create an NxN identity matrix */
function matEye(n) {
  const m = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

/** Multiply two matrices A (m×n) and B (n×p) → C (m×p) */
function matMul(A, B) {
  const m = A.length, n = B.length, p = B[0].length;
  const C = Array.from({length: m}, () => new Array(p).fill(0));
  for (let i = 0; i < m; i++)
    for (let j = 0; j < p; j++)
      for (let k = 0; k < n; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}

/** Multiply matrix A (m×n) by column vector v (n×1, as flat array) → flat array (m) */
function matVecMul(A, v) {
  return A.map(row => row.reduce((s, a, j) => s + a * v[j], 0));
}

/** Dot product of two flat vectors */
function vecDot(a, b) {
  return a.reduce((s, ai, i) => s + ai * b[i], 0);
}

/** Invert a square matrix using Gauss-Jordan elimination with partial pivoting.
 *  Returns null if singular. */
function matInverse(M) {
  const n = M.length;
  // Augment [M | I]
  const aug = M.map((row, i) => {
    const r = row.slice();
    for (let j = 0; j < n; j++) r.push(i === j ? 1 : 0);
    return r;
  });

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col, maxVal = Math.abs(aug[col][col]);
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > maxVal) {
        maxVal = Math.abs(aug[row][col]);
        maxRow = row;
      }
    }
    if (maxVal < 1e-12) return null; // singular
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    // Scale pivot row
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;

    // Eliminate column
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  // Extract right half
  return aug.map(row => row.slice(n));
}


/* ── Build / rebuild asset inputs ────────────────────────────────────── */

const EF_DEFAULTS = [
  { name: 'Stocks',        mu: 10, sigma: 20 },
  { name: 'Bonds',         mu: 5,  sigma: 10 },
  { name: 'Real Estate',   mu: 8,  sigma: 15 },
  { name: 'Commodities',   mu: 6,  sigma: 25 },
  { name: 'International', mu: 9,  sigma: 22 },
];

function efGetN() {
  return parseInt(document.getElementById('ef-num-assets').value) || 2;
}

function efBuildInputs() {
  const n = efGetN();
  const container = document.getElementById('ef-asset-inputs');

  // Preserve existing values
  const oldMu = [], oldSigma = [], oldNames = [];
  for (let i = 0; i < 10; i++) {
    const muEl = document.getElementById(`ef-mu-${i}`);
    const sigEl = document.getElementById(`ef-sigma-${i}`);
    const nameEl = document.getElementById(`ef-name-${i}`);
    if (muEl) oldMu.push(parseFloat(muEl.value));
    if (sigEl) oldSigma.push(parseFloat(sigEl.value));
    if (nameEl) oldNames.push(nameEl.value);
  }

  let html = '';
  for (let i = 0; i < n; i++) {
    const def = EF_DEFAULTS[i] || { name: `Asset ${i+1}`, mu: 7, sigma: 15 };
    const name  = i < oldNames.length  ? oldNames[i]  : def.name;
    const mu    = i < oldMu.length     ? oldMu[i]     : def.mu;
    const sigma = i < oldSigma.length  ? oldSigma[i]  : def.sigma;

    html += `
      <div class="ef-asset-row">
        <div class="input-group" style="flex:1.2">
          <label>Name</label>
          <input type="text" id="ef-name-${i}" value="${name}" oninput="efUpdate()">
        </div>
        <div class="input-group" style="flex:1">
          <label>E[R] (%)</label>
          <input type="number" id="ef-mu-${i}" value="${mu}" step="0.5" oninput="efUpdate()">
        </div>
        <div class="input-group" style="flex:1">
          <label>&sigma; (%)</label>
          <input type="number" id="ef-sigma-${i}" value="${sigma}" min="0.1" step="0.5" oninput="efUpdate()">
        </div>
      </div>`;
  }
  container.innerHTML = html;

  // Build correlation matrix inputs
  efBuildCorrInputs(n);
  efUpdate();
}

function efBuildCorrInputs(n) {
  const container = document.getElementById('ef-corr-inputs');

  // Preserve old values
  const oldCorr = {};
  container.querySelectorAll('input[data-pair]').forEach(el => {
    oldCorr[el.dataset.pair] = parseFloat(el.value);
  });

  if (n < 2) {
    container.innerHTML = '';
    return;
  }

  let html = '<div class="ef-corr-grid">';
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i}-${j}`;
      const val = oldCorr[key] !== undefined ? oldCorr[key] : 0.3;
      const nameI = document.getElementById(`ef-name-${i}`)?.value || `Asset ${i+1}`;
      const nameJ = document.getElementById(`ef-name-${j}`)?.value || `Asset ${j+1}`;
      html += `
        <div class="ef-corr-item">
          <label>&rho;(${i+1},${j+1})</label>
          <input type="number" id="ef-corr-${key}" data-pair="${key}"
                 value="${val}" min="-1" max="1" step="0.05" oninput="efUpdate()">
        </div>`;
    }
  }
  html += '</div>';
  container.innerHTML = html;
}

function efChangeAssets(delta) {
  const input = document.getElementById('ef-num-assets');
  let n = parseInt(input.value) || 2;
  n = Math.max(2, Math.min(8, n + delta));
  input.value = n;
  efBuildInputs();
}


/* ── Read inputs and compute frontier ────────────────────────────────── */

function efReadInputs() {
  const n = efGetN();
  const mu = [], sigma = [], names = [];

  for (let i = 0; i < n; i++) {
    mu.push((parseFloat(document.getElementById(`ef-mu-${i}`).value) || 0) / 100);
    sigma.push((parseFloat(document.getElementById(`ef-sigma-${i}`).value) || 1) / 100);
    names.push(document.getElementById(`ef-name-${i}`)?.value || `Asset ${i+1}`);
  }

  // Build covariance matrix from sigma and correlations
  const cov = Array.from({length: n}, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    cov[i][i] = sigma[i] * sigma[i];
    for (let j = i + 1; j < n; j++) {
      const rhoEl = document.getElementById(`ef-corr-${i}-${j}`);
      const rho = rhoEl ? parseFloat(rhoEl.value) || 0 : 0;
      cov[i][j] = rho * sigma[i] * sigma[j];
      cov[j][i] = cov[i][j];
    }
  }

  return { n, mu, sigma, cov, names };
}

function efComputeFrontier(mu, cov) {
  const n = mu.length;
  const ones = new Array(n).fill(1);

  const covInv = matInverse(cov);

  // ── Analytical path (invertible Σ) ──
  if (covInv) {
    const covInvMu   = matVecMul(covInv, mu);
    const covInvOnes  = matVecMul(covInv, ones);

    const A = vecDot(ones, covInvMu);
    const B = vecDot(mu, covInvMu);
    const C = vecDot(ones, covInvOnes);
    const D = B * C - A * A;

    if (Math.abs(D) > 1e-14) {
      const mvpMu    = A / C;
      const mvpSigma = Math.sqrt(1 / C);

      const g = covInvOnes.map((ci, i) => (B * ci - A * covInvMu[i]) / D);
      const h = covInvMu.map((ci, i) => (C * ci - A * covInvOnes[i]) / D);

      const muMax = Math.max(...mu);
      const range = (muMax - Math.min(...mu)) || 0.05;
      const sweepLo = mvpMu - range * 0.5;
      const sweepHi = muMax + range * 0.8;
      const nPoints = 200;

      const frontier = [];
      for (let i = 0; i < nPoints; i++) {
        const mup = sweepLo + (sweepHi - sweepLo) * i / (nPoints - 1);
        const sigp2 = (C * mup * mup - 2 * A * mup + B) / D;
        if (sigp2 < 0) continue;
        const w = g.map((gi, k) => gi + h[k] * mup);
        frontier.push({ mu: mup, sigma: Math.sqrt(sigp2), weights: w });
      }

      return { frontier, mvpMu, mvpSigma, g, h, A, B, C, D, analytical: true };
    }
  }

  // ── Fallback: weight-sweep (handles singular Σ, e.g. ρ = ±1) ──
  return efComputeFrontierSweep(mu, cov);
}

/** Compute frontier by sweeping portfolio weights directly.
 *  Works for any covariance matrix including singular ones. */
function efComputeFrontierSweep(mu, cov) {
  const n = mu.length;
  const nSteps = 400;

  // Compute portfolio σ and μ for a given weight vector
  function portStats(w) {
    let mup = 0;
    for (let i = 0; i < n; i++) mup += w[i] * mu[i];
    let varp = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        varp += w[i] * w[j] * cov[i][j];
    return { mu: mup, sigma: Math.sqrt(Math.max(0, varp)), weights: w.slice() };
  }

  // Generate portfolios by sweeping weights
  let allPortfolios = [];

  if (n === 2) {
    // Simple 1-D sweep over w1
    for (let i = 0; i <= nSteps; i++) {
      const w1 = -0.5 + 2.0 * i / nSteps;  // w1 from -0.5 to 1.5
      allPortfolios.push(portStats([w1, 1 - w1]));
    }
  } else if (n === 3) {
    // 2-D grid over w1, w2; w3 = 1 - w1 - w2
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        const w1 = -0.5 + 2.0 * i / steps;
        const w2 = -0.5 + 2.0 * j / steps;
        const w3 = 1 - w1 - w2;
        allPortfolios.push(portStats([w1, w2, w3]));
      }
    }
  } else {
    // For N>3: random portfolios + structured sweeps along pairs
    for (let i = 0; i < 5000; i++) {
      const w = new Array(n);
      let sum = 0;
      for (let k = 0; k < n - 1; k++) { w[k] = -0.5 + 2.0 * Math.random(); sum += w[k]; }
      w[n - 1] = 1 - sum;
      allPortfolios.push(portStats(w));
    }
  }

  // Sort by return, then extract the minimum-variance envelope
  allPortfolios.sort((a, b) => a.mu - b.mu);

  // Bin by target return and keep the min-variance portfolio in each bin
  const muMin = allPortfolios[0].mu;
  const muMax = allPortfolios[allPortfolios.length - 1].mu;
  const nBins = 200;
  const frontier = [];

  for (let b = 0; b < nBins; b++) {
    const lo = muMin + (muMax - muMin) * b / nBins;
    const hi = muMin + (muMax - muMin) * (b + 1) / nBins;
    const inBin = allPortfolios.filter(p => p.mu >= lo && p.mu < hi);
    if (inBin.length === 0) continue;
    inBin.sort((a, b) => a.sigma - b.sigma);
    frontier.push(inBin[0]);
  }

  // Find MVP
  let mvpIdx = 0;
  for (let i = 1; i < frontier.length; i++) {
    if (frontier[i].sigma < frontier[mvpIdx].sigma) mvpIdx = i;
  }
  const mvpMu = frontier[mvpIdx].mu;
  const mvpSigma = frontier[mvpIdx].sigma;

  return { frontier, mvpMu, mvpSigma, g: null, h: null, analytical: false };
}


/* ── Update chart and display ────────────────────────────────────────── */

function efUpdate() {
  const { n, mu, sigma, cov, names } = efReadInputs();
  const result = efComputeFrontier(mu, cov);

  if (!result) {
    // Singular matrix or degenerate case
    const ctx = document.getElementById('ef-chart').getContext('2d');
    if (efChart) efChart.destroy();
    efChart = null;
    document.getElementById('ef-mvp-info').innerHTML =
      '<div class="warning-box">Could not compute frontier. Check that standard deviations are positive and the correlation matrix is valid.</div>';
    return;
  }

  const { frontier, mvpMu, mvpSigma } = result;

  // Split into efficient (upper) and inefficient (lower) branches
  const efficient = frontier.filter(p => p.mu >= mvpMu - 1e-10);
  const inefficient = frontier.filter(p => p.mu <= mvpMu + 1e-10);

  // ── Chart ──
  const ctx = document.getElementById('ef-chart').getContext('2d');
  if (efChart) efChart.destroy();

  const assetColors = [COLORS.blue, COLORS.orange, COLORS.green, COLORS.red, COLORS.purple,
                       '#8c564b', '#e377c2', '#17becf'];

  const datasets = [];

  // Efficient frontier (upper branch)
  datasets.push({
    label: 'Efficient Frontier',
    data: efficient.map(p => ({ x: p.sigma * 100, y: p.mu * 100 })),
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(31,119,180,0.08)',
    pointRadius: 0,
    showLine: true,
    borderWidth: 3,
    tension: 0.3,
    fill: false,
    order: 2
  });

  // Inefficient frontier (lower branch, dashed)
  datasets.push({
    label: 'Inefficient Frontier',
    data: inefficient.map(p => ({ x: p.sigma * 100, y: p.mu * 100 })),
    borderColor: '#aaa',
    borderDash: [6, 4],
    pointRadius: 0,
    showLine: true,
    borderWidth: 2,
    tension: 0.3,
    fill: false,
    order: 3
  });

  // Individual assets
  for (let i = 0; i < n; i++) {
    datasets.push({
      label: names[i],
      data: [{ x: sigma[i] * 100, y: mu[i] * 100 }],
      backgroundColor: assetColors[i % assetColors.length],
      borderColor: assetColors[i % assetColors.length],
      pointRadius: 8,
      pointStyle: 'circle',
      showLine: false,
      order: 1
    });
  }

  // MVP point
  datasets.push({
    label: 'Min Variance',
    data: [{ x: mvpSigma * 100, y: mvpMu * 100 }],
    backgroundColor: '#000',
    borderColor: '#fff',
    borderWidth: 2,
    pointRadius: 7,
    pointStyle: 'diamond',
    showLine: false,
    order: 0
  });

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Efficient Frontier',
        font: { size: 20, weight: 'bold' }
      },
      legend: {
        labels: { font: { size: 13 }, usePointStyle: true }
      },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            const ds = ctx.dataset;
            const pt = ctx.parsed;
            let text = `${ds.label}: σ = ${pt.x.toFixed(2)}%, E[R] = ${pt.y.toFixed(2)}%`;

            // Show weights for frontier points
            if ((ds.label === 'Efficient Frontier' || ds.label === 'Inefficient Frontier') && result) {
              if (result.analytical) {
                const targetMu = pt.y / 100;
                const w = result.g.map((gi, k) => gi + result.h[k] * targetMu);
                const wStr = w.map((wi, k) => `${names[k]}: ${(wi * 100).toFixed(1)}%`).join(', ');
                text += `  [${wStr}]`;
              } else {
                // Find closest frontier point by return
                const targetMu = pt.y / 100;
                let best = result.frontier[0];
                for (const fp of result.frontier) {
                  if (Math.abs(fp.mu - targetMu) < Math.abs(best.mu - targetMu)) best = fp;
                }
                const wStr = best.weights.map((wi, k) => `${names[k]}: ${(wi * 100).toFixed(1)}%`).join(', ');
                text += `  [${wStr}]`;
              }
            }
            return text;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        title: { display: true, text: 'Portfolio Std Deviation σ (%)', font: { size: 16, weight: 'bold' } },
        ticks: {
          font: { size: 14 },
          callback: v => v.toFixed(0) + '%'
        },
        min: 0
      },
      y: {
        type: 'linear',
        title: { display: true, text: 'Portfolio Expected Return E[R] (%)', font: { size: 16, weight: 'bold' } },
        ticks: {
          font: { size: 14 },
          callback: v => v.toFixed(0) + '%'
        }
      }
    }
  };

  efChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: opts
  });

  // ── MVP info ──
  let mvpWeights;
  if (result.analytical) {
    mvpWeights = result.g.map((gi, k) => gi + result.h[k] * mvpMu);
  } else {
    // Find the MVP point in the sweep data
    let best = result.frontier[0];
    for (const fp of result.frontier) { if (fp.sigma < best.sigma) best = fp; }
    mvpWeights = best.weights;
  }
  let mvpHtml = `
    <div class="metric">
      <div class="metric-label">Min Variance Portfolio</div>
      <div class="metric-value">E[R] = ${(mvpMu * 100).toFixed(2)}% &nbsp; σ = ${(mvpSigma * 100).toFixed(2)}%</div>
    </div>
    <div style="margin-top:0.5rem">
      <strong>MVP Weights:</strong>
      ${mvpWeights.map((w, i) => `<span class="ef-weight">${names[i]}: ${(w * 100).toFixed(1)}%</span>`).join(' &nbsp; ')}
    </div>`;
  document.getElementById('ef-mvp-info').innerHTML = mvpHtml;
}
