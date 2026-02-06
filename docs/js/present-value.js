/* ===== Present Value Calculator ===== */

let pvChart = null;

function pvUpdate() {
  const fv1 = parseFloat(document.getElementById('pv-fv1').value) || 0;
  const r1  = (parseFloat(document.getElementById('pv-r1').value) || 0) / 100;
  const t1  = parseInt(document.getElementById('pv-t1').value) || 1;

  const fv2 = parseFloat(document.getElementById('pv-fv2').value) || 0;
  const r2  = (parseFloat(document.getElementById('pv-r2').value) || 0) / 100;
  const t2  = parseInt(document.getElementById('pv-t2').value) || 1;

  const fv3 = parseFloat(document.getElementById('pv-fv3').value) || 0;
  const r3  = (parseFloat(document.getElementById('pv-r3').value) || 0) / 100;
  const t3  = parseInt(document.getElementById('pv-t3').value) || 1;

  // Compute present values
  const pval1 = fv1 / Math.pow(1 + r1, t1);
  const pval2 = fv2 > 0 ? fv2 / Math.pow(1 + r2, t2) : 0;
  const pval3 = fv3 > 0 ? fv3 / Math.pow(1 + r3, t3) : 0;

  // Display metrics
  document.getElementById('pv-result1').textContent = formatCurrency(pval1);
  const m2 = document.getElementById('pv-metric2');
  const m3 = document.getElementById('pv-metric3');
  if (fv2 > 0) {
    document.getElementById('pv-result2').textContent = formatCurrency(pval2);
    m2.classList.remove('inactive');
  } else {
    document.getElementById('pv-result2').textContent = '—';
    m2.classList.add('inactive');
  }
  if (fv3 > 0) {
    document.getElementById('pv-result3').textContent = formatCurrency(pval3);
    m3.classList.remove('inactive');
  } else {
    document.getElementById('pv-result3').textContent = '—';
    m3.classList.add('inactive');
  }

  // Build datasets — PV as function of years (discounting from year 0)
  const maxTime = Math.max(t1, fv2 > 0 ? t2 : 0, fv3 > 0 ? t3 : 0);
  const datasets = [];

  const labels1 = Array.from({length: t1 + 1}, (_, i) => i);
  const data1   = labels1.map(y => fv1 / Math.pow(1 + r1, y));
  datasets.push({
    label: `Scenario 1: $${fv1.toLocaleString()} @ ${(r1*100).toFixed(1)}%`,
    data: labels1.map((y, i) => ({x: y, y: data1[i]})),
    borderColor: COLORS.red,
    backgroundColor: COLORS.red,
    pointRadius: 3,
    borderWidth: 2,
    tension: 0
  });

  if (fv2 > 0) {
    const labels2 = Array.from({length: t2 + 1}, (_, i) => i);
    const data2   = labels2.map(y => fv2 / Math.pow(1 + r2, y));
    datasets.push({
      label: `Scenario 2: $${fv2.toLocaleString()} @ ${(r2*100).toFixed(1)}%`,
      data: labels2.map((y, i) => ({x: y, y: data2[i]})),
      borderColor: COLORS.orange,
      backgroundColor: COLORS.orange,
      pointRadius: 3,
      borderWidth: 2,
      tension: 0
    });
  }

  if (fv3 > 0) {
    const labels3 = Array.from({length: t3 + 1}, (_, i) => i);
    const data3   = labels3.map(y => fv3 / Math.pow(1 + r3, y));
    datasets.push({
      label: `Scenario 3: $${fv3.toLocaleString()} @ ${(r3*100).toFixed(1)}%`,
      data: labels3.map((y, i) => ({x: y, y: data3[i]})),
      borderColor: COLORS.green,
      backgroundColor: COLORS.green,
      pointRadius: 3,
      borderWidth: 2,
      tension: 0
    });
  }

  // Chart
  const ctx = document.getElementById('pv-chart').getContext('2d');
  if (pvChart) pvChart.destroy();

  const opts = baseChartOptions('Present Value Comparison', 'Time (years)', 'Present Value ($)');
  opts.scales.x.type = 'linear';
  opts.scales.x.min = 0;
  opts.scales.x.max = maxTime;
  opts.scales.x.ticks = { ...opts.scales.x.ticks, stepSize: maxTime <= 20 ? 1 : Math.ceil(maxTime / 15) };

  pvChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: opts
  });

  // Table — Growth from PV to FV (Scenario 1 only)
  const growthValues = labels1.map(y => pval1 * Math.pow(1 + r1, y));
  const simpleAmt = pval1 * r1;

  const cols = [
    { key: 'year',    label: 'Year' },
    { key: 'value',   label: 'Value',                      align: 'right' },
    { key: 'growth',  label: 'Growth from Previous Year',   align: 'right' },
    { key: 'simple',  label: 'Simple Interest',             align: 'right' },
    { key: 'compound',label: 'Interest on Previous Interest',align: 'right' }
  ];

  const rows = labels1.map((y, i) => {
    const val    = growthValues[i];
    const growth   = i === 0 ? 0 : growthValues[i] - growthValues[i-1];
    const simple   = i === 0 ? 0 : simpleAmt;
    const compound = growth - simple;
    return {
      year:     y,
      value:    formatCurrency(val),
      growth:   formatCurrency(growth),
      simple:   formatCurrency(simple),
      compound: formatCurrency(compound)
    };
  });

  document.getElementById('pv-table-body').innerHTML = buildTable(cols, rows);
}
