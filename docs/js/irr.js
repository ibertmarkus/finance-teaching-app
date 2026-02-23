/* ===== IRR Calculator ===== */

let irrChart = null;

/** Calculate NPV given a rate and array of cash flows */
function calcNPV(rate, cashFlows) {
  let npv = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return npv;
}

/** NPV derivative with respect to rate (for Newton-Raphson) */
function calcNPVDerivative(rate, cashFlows) {
  let d = 0;
  for (let t = 1; t < cashFlows.length; t++) {
    d += -t * cashFlows[t] / Math.pow(1 + rate, t + 1);
  }
  return d;
}

/** Find IRR using Newton-Raphson from a given initial guess */
function newtonIRR(cashFlows, guess, maxIter, tol) {
  let r = guess;
  for (let i = 0; i < maxIter; i++) {
    const f  = calcNPV(r, cashFlows);
    const fp = calcNPVDerivative(r, cashFlows);
    if (Math.abs(fp) < 1e-12) return null; // derivative too small
    const rNew = r - f / fp;
    if (Math.abs(rNew - r) < tol && Math.abs(calcNPV(rNew, cashFlows)) < 0.01) {
      return rNew;
    }
    r = rNew;
    // Guard against divergence
    if (r < -0.99 || r > 100) return null;
  }
  // Check if final value is close enough
  if (Math.abs(calcNPV(r, cashFlows)) < 0.01) return r;
  return null;
}

/** Find all distinct IRRs by trying multiple guesses */
function findIRRs(cashFlows) {
  const guesses = [0.1, 0.5, 1.0, -0.5, 0.01, 0.25, 2.0, -0.3];
  const solutions = [];

  for (const g of guesses) {
    const irr = newtonIRR(cashFlows, g, 200, 1e-9);
    if (irr !== null) {
      // Check for duplicate
      const isDup = solutions.some(s => Math.abs(s - irr) < 0.001);
      if (!isDup) solutions.push(irr);
    }
  }

  solutions.sort((a, b) => a - b);
  return solutions;
}

/** Build the cash flow input rows */
function irrBuildInputs() {
  const n = parseInt(document.getElementById('irr-num-periods').value) || 5;
  const container = document.getElementById('irr-cf-inputs');

  // Preserve existing values
  const existing = [];
  container.querySelectorAll('input[type="number"]').forEach(inp => {
    existing.push(parseFloat(inp.value));
  });

  let html = '';
  for (let i = 0; i < n; i++) {
    const label = i === 0 ? `Period ${i} (Initial)` : `Period ${i}`;
    let defaultVal;
    if (i < existing.length) {
      defaultVal = existing[i];
    } else if (i === 0) {
      defaultVal = -100;
    } else {
      defaultVal = 30;
    }
    html += `<div class="cf-row">
      <label>${label}</label>
      <input type="number" id="irr-cf-${i}" value="${defaultVal}" step="10" oninput="irrUpdate()">
    </div>`;
  }
  container.innerHTML = html;
  irrUpdate();
}

function irrUpdate() {
  const n = parseInt(document.getElementById('irr-num-periods').value) || 5;
  const cashFlows = [];
  for (let i = 0; i < n; i++) {
    const el = document.getElementById(`irr-cf-${i}`);
    cashFlows.push(el ? parseFloat(el.value) || 0 : 0);
  }

  // Find IRRs
  const irrs = findIRRs(cashFlows);

  // Display results
  const resultsDiv = document.getElementById('irr-results');
  if (irrs.length > 0) {
    let html = '';
    irrs.forEach((irr, idx) => {
      const label = irrs.length > 1 ? `IRR ${idx + 1}` : 'IRR';
      html += `<div class="metric">
        <div class="metric-label">${label}</div>
        <div class="metric-value">${(irr * 100).toFixed(2)}%</div>
      </div>`;
    });
    resultsDiv.innerHTML = html;
  } else {
    resultsDiv.innerHTML = `<div class="warning-box">No IRR found. The cash flows may not have a solution.</div>`;
  }

  // NPV curve chart
  const rateMin = 0;
  const rateMax = 0.35;
  const nPoints = 300;
  const rates = [];
  const npvs  = [];
  for (let i = 0; i < nPoints; i++) {
    const r = rateMin + (rateMax - rateMin) * i / (nPoints - 1);
    rates.push(r);
    npvs.push(calcNPV(r, cashFlows));
  }

  const ctx = document.getElementById('irr-chart').getContext('2d');
  if (irrChart) irrChart.destroy();

  const opts = baseChartOptions('NPV as a Function of Discount Rate', 'Discount Rate (%)', 'Net Present Value ($)');
  opts.scales.x.type = 'linear';
  opts.scales.x.min = 0;
  opts.scales.x.max = 35;
  opts.scales.x.ticks = {
    ...opts.scales.x.ticks,
    callback: function(value) { return value + '%'; }
  };

  // Zero line annotation
  opts.plugins.annotation = {
    annotations: {
      zeroLine: {
        type: 'line',
        yMin: 0,
        yMax: 0,
        borderColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderDash: [4, 4]
      }
    }
  };

  const datasets = [{
    label: 'NPV',
    data: rates.map((r, i) => ({x: r * 100, y: npvs[i]})),
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blue,
    pointRadius: 0,
    showLine: true,
    borderWidth: 2,
    tension: 0.1
  }];

  // IRR points
  if (irrs.length > 0) {
    const irrPoints = irrs
      .filter(irr => irr >= 0 && irr <= 0.35)
      .map(irr => ({x: irr * 100, y: 0}));

    if (irrPoints.length > 0) {
      datasets.push({
        label: irrs.length === 1
          ? `IRR = ${(irrs[0] * 100).toFixed(2)}%`
          : 'IRR Points',
        data: irrPoints,
        borderColor: 'red',
        backgroundColor: 'red',
        pointRadius: 8,
        pointStyle: 'circle',
        showLine: false
      });
    }
  }

  irrChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: opts
  });
}

/** Change number of periods (add/remove fields) */
function irrChangePeriods(delta) {
  const input = document.getElementById('irr-num-periods');
  let n = parseInt(input.value) || 5;
  n = Math.max(2, Math.min(20, n + delta));
  input.value = n;
  irrBuildInputs();
}
