/* ===== Perpetuity Calculator ===== */

let perpChart = null;

function perpUpdate() {
  const C = parseFloat(document.getElementById('perp-cf').value) || 0;
  const r = (parseFloat(document.getElementById('perp-r').value) || 0.01) / 100;
  const maxP = parseInt(document.getElementById('perp-max').value) || 50;

  // PV of perpetuity
  const pvPerp = C / r;
  document.getElementById('perp-result').textContent = formatCurrency(pvPerp);

  // Cumulative PV over periods
  const periods = Array.from({length: maxP}, (_, i) => i + 1);
  const pvEach  = periods.map(p => C / Math.pow(1 + r, p));
  const cumPV   = [];
  let running = 0;
  pvEach.forEach(v => { running += v; cumPV.push(running); });

  // Chart
  const ctx = document.getElementById('perp-chart').getContext('2d');
  if (perpChart) perpChart.destroy();

  const opts = baseChartOptions(
    'Cumulative PV Approaching Perpetuity Value',
    'Number of Periods', 'Cumulative Present Value ($)'
  );
  opts.scales.x.type = 'linear';
  opts.scales.x.min = 0;
  opts.scales.x.max = maxP;
  opts.scales.x.ticks = { ...opts.scales.x.ticks, stepSize: maxP <= 20 ? 1 : Math.ceil(maxP / 15) };

  // Annotation: perpetuity value line
  opts.plugins.annotation = {
    annotations: {
      perpLine: {
        type: 'line',
        yMin: pvPerp,
        yMax: pvPerp,
        borderColor: 'red',
        borderWidth: 2,
        borderDash: [6, 4],
        label: {
          display: true,
          content: `Perpetuity Value = ${formatCurrency(pvPerp)}`,
          position: 'start',
          backgroundColor: 'rgba(255,255,255,0.85)',
          color: 'red',
          font: { size: 14 }
        }
      }
    }
  };

  perpChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: periods,
      datasets: [{
        label: 'Cumulative PV',
        data: cumPV,
        borderColor: COLORS.orange,
        backgroundColor: COLORS.orange,
        pointRadius: 2,
        borderWidth: 2,
        tension: 0
      }]
    },
    options: opts
  });

  // Dynamic formulas
  const rStr = r.toFixed(4);
  katex.render(
    `PV = \\frac{${C.toFixed(2)}}{${rStr}}`,
    document.getElementById('perp-formula-dynamic'),
    { displayMode: true }
  );
  katex.render(
    `PV = \\frac{${C.toFixed(2)}}{(1+${rStr})} + \\frac{${C.toFixed(2)}}{(1+${rStr})^2} + \\frac{${C.toFixed(2)}}{(1+${rStr})^3} + \\cdots`,
    document.getElementById('perp-formula-expanded'),
    { displayMode: true }
  );
  katex.render(
    `PV = \\$${pvPerp.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
    document.getElementById('perp-formula-result'),
    { displayMode: true }
  );

  // Table (first 50 periods max)
  const displayN = Math.min(50, maxP);
  const cols = [
    { key: 'period',    label: 'Period' },
    { key: 'pvPayment', label: 'PV of This Payment', align: 'right' },
    { key: 'cumPV',     label: 'Cumulative PV',      align: 'right' },
    { key: 'remaining', label: 'Remaining PV',        align: 'right' },
    { key: 'pct',       label: '% of Perpetuity',     align: 'right' }
  ];
  const rows = [];
  for (let i = 0; i < displayN; i++) {
    const rem = pvPerp - cumPV[i];
    const pct = (cumPV[i] / pvPerp) * 100;
    rows.push({
      period:    periods[i],
      pvPayment: formatCurrency(pvEach[i]),
      cumPV:     formatCurrency(cumPV[i]),
      remaining: formatCurrency(rem),
      pct:       pct.toFixed(2) + '%'
    });
  }
  let tableHTML = buildTable(cols, rows);
  if (maxP > displayN) {
    tableHTML += `<p style="font-size:0.85rem;color:#868e96;margin-top:0.5rem"><em>Showing first ${displayN} periods only</em></p>`;
  }
  document.getElementById('perp-table-body').innerHTML = tableHTML;
}
