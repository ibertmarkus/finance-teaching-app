/* ===== Annuity Calculator ===== */

let annuityChart = null;

function annuityUpdate() {
  const C = parseFloat(document.getElementById('ann-cf').value) || 0;
  const r = (parseFloat(document.getElementById('ann-r').value) || 0.01) / 100;
  const t = parseInt(document.getElementById('ann-t').value) || 1;

  // PV of annuity
  const pvAnnuity = C * (1/r - 1/(r * Math.pow(1 + r, t)));
  document.getElementById('ann-result').textContent = formatCurrency(pvAnnuity);

  // PV of each payment
  const periods = Array.from({length: t}, (_, i) => i + 1);
  const pvEach  = periods.map(p => C / Math.pow(1 + r, p));

  // Chart
  const ctx = document.getElementById('ann-chart').getContext('2d');
  if (annuityChart) annuityChart.destroy();

  const opts = baseChartOptions(
    `Present Value of Each ${formatCurrency(C)} Payment`,
    'Period', 'Present Value ($)'
  );
  opts.scales.x.type = 'linear';
  opts.scales.x.min = 0;
  opts.scales.x.max = t + 1;
  opts.scales.x.ticks = { ...opts.scales.x.ticks, stepSize: t <= 20 ? 1 : Math.ceil(t / 15) };

  // Add annotation for cash flow line
  opts.plugins.annotation = {
    annotations: {
      cfLine: {
        type: 'line',
        yMin: C,
        yMax: C,
        borderColor: 'red',
        borderWidth: 2,
        borderDash: [6, 4],
        label: {
          display: true,
          content: `Cash Flow = ${formatCurrency(C)}`,
          position: 'start',
          backgroundColor: 'rgba(255,255,255,0.85)',
          color: 'red',
          font: { size: 11 }
        }
      }
    }
  };

  // Set y-axis to start at 0 and go above cash flow
  opts.scales.y.min = 0;
  opts.scales.y.max = C * 1.15;

  annuityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: periods,
      datasets: [{
        label: 'PV of Payment',
        data: pvEach,
        backgroundColor: 'rgba(44, 160, 44, 0.7)',
        borderColor: '#000',
        borderWidth: 0.5
      }]
    },
    options: opts
  });

  // Dynamic formula with values
  const rStr = r.toFixed(4);
  katex.render(
    `PV = ${C.toFixed(2)} \\times \\left(\\frac{1}{${rStr}} - \\frac{1}{${rStr} \\times (1+${rStr})^{${t}}}\\right)`,
    document.getElementById('ann-formula-dynamic'),
    { displayMode: true }
  );
  katex.render(
    `PV = \\frac{${C.toFixed(2)}}{(1+${rStr})} + \\frac{${C.toFixed(2)}}{(1+${rStr})^2} + \\cdots + \\frac{${C.toFixed(2)}}{(1+${rStr})^{${t}}}`,
    document.getElementById('ann-formula-expanded'),
    { displayMode: true }
  );
  katex.render(
    `PV = \\$${pvAnnuity.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
    document.getElementById('ann-formula-result'),
    { displayMode: true }
  );

  // Table
  const cumPV = [];
  let running = 0;
  const cols = [
    { key: 'period',  label: 'Period' },
    { key: 'cf',      label: 'Cash Flow',         align: 'right' },
    { key: 'pv',      label: 'PV of This Payment', align: 'right' },
    { key: 'cumPV',   label: 'Cumulative PV',      align: 'right' }
  ];
  const rows = periods.map((p, i) => {
    running += pvEach[i];
    return {
      period: p,
      cf:     formatCurrency(C),
      pv:     formatCurrency(pvEach[i]),
      cumPV:  formatCurrency(running)
    };
  });

  document.getElementById('ann-table-body').innerHTML = buildTable(cols, rows);
}
