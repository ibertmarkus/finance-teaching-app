/* ===== Future Value Calculator ===== */

let fvChart = null;

function fvUpdate() {
  const pv1 = parseFloat(document.getElementById('fv-pv1').value) || 0;
  const r1  = (parseFloat(document.getElementById('fv-r1').value) || 0) / 100;
  const t1  = parseInt(document.getElementById('fv-t1').value) || 1;

  const pv2 = parseFloat(document.getElementById('fv-pv2').value) || 0;
  const r2  = (parseFloat(document.getElementById('fv-r2').value) || 0) / 100;
  const t2  = parseInt(document.getElementById('fv-t2').value) || 1;

  const pv3 = parseFloat(document.getElementById('fv-pv3').value) || 0;
  const r3  = (parseFloat(document.getElementById('fv-r3').value) || 0) / 100;
  const t3  = parseInt(document.getElementById('fv-t3').value) || 1;

  // Compute final values
  const final1 = pv1 * Math.pow(1 + r1, t1);
  const final2 = pv2 > 0 ? pv2 * Math.pow(1 + r2, t2) : 0;
  const final3 = pv3 > 0 ? pv3 * Math.pow(1 + r3, t3) : 0;

  // Display metrics
  document.getElementById('fv-result1').textContent = formatCurrency(final1);
  const m2 = document.getElementById('fv-metric2');
  const m3 = document.getElementById('fv-metric3');
  if (pv2 > 0) {
    document.getElementById('fv-result2').textContent = formatCurrency(final2);
    m2.classList.remove('inactive');
  } else {
    document.getElementById('fv-result2').textContent = '—';
    m2.classList.add('inactive');
  }
  if (pv3 > 0) {
    document.getElementById('fv-result3').textContent = formatCurrency(final3);
    m3.classList.remove('inactive');
  } else {
    document.getElementById('fv-result3').textContent = '—';
    m3.classList.add('inactive');
  }

  // Build datasets
  const maxTime = Math.max(t1, pv2 > 0 ? t2 : 0, pv3 > 0 ? t3 : 0);
  const datasets = [];

  // Scenario 1
  const labels1 = Array.from({length: t1 + 1}, (_, i) => i);
  const data1   = labels1.map(y => pv1 * Math.pow(1 + r1, y));
  datasets.push({
    label: `Scenario 1: $${pv1.toLocaleString()} @ ${(r1*100).toFixed(1)}%`,
    data: labels1.map((y, i) => ({x: y, y: data1[i]})),
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blue,
    pointRadius: 3,
    borderWidth: 2,
    tension: 0
  });

  if (pv2 > 0) {
    const labels2 = Array.from({length: t2 + 1}, (_, i) => i);
    const data2   = labels2.map(y => pv2 * Math.pow(1 + r2, y));
    datasets.push({
      label: `Scenario 2: $${pv2.toLocaleString()} @ ${(r2*100).toFixed(1)}%`,
      data: labels2.map((y, i) => ({x: y, y: data2[i]})),
      borderColor: COLORS.orange,
      backgroundColor: COLORS.orange,
      pointRadius: 3,
      borderWidth: 2,
      tension: 0
    });
  }

  if (pv3 > 0) {
    const labels3 = Array.from({length: t3 + 1}, (_, i) => i);
    const data3   = labels3.map(y => pv3 * Math.pow(1 + r3, y));
    datasets.push({
      label: `Scenario 3: $${pv3.toLocaleString()} @ ${(r3*100).toFixed(1)}%`,
      data: labels3.map((y, i) => ({x: y, y: data3[i]})),
      borderColor: COLORS.green,
      backgroundColor: COLORS.green,
      pointRadius: 3,
      borderWidth: 2,
      tension: 0
    });
  }

  // Chart
  const ctx = document.getElementById('fv-chart').getContext('2d');
  if (fvChart) fvChart.destroy();

  const opts = baseChartOptions('Future Value Growth Comparison', 'Time (years)', 'Future Value ($)');
  opts.scales.x.type = 'linear';
  opts.scales.x.min = 0;
  opts.scales.x.max = maxTime;
  opts.scales.x.ticks = { ...opts.scales.x.ticks, stepSize: maxTime <= 20 ? 1 : Math.ceil(maxTime / 15) };

  fvChart = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: opts
  });

  // Table (Scenario 1 only)
  const cols = [
    { key: 'year',    label: 'Year' },
    { key: 'fv',      label: 'Future Value',               align: 'right' },
    { key: 'growth',  label: 'Growth from Previous Year',   align: 'right' },
    { key: 'simple',  label: 'Simple Interest',             align: 'right' },
    { key: 'compound',label: 'Interest on Previous Interest',align: 'right' }
  ];

  const simpleAmt = pv1 * r1;
  const rows = labels1.map((y, i) => {
    const fv = data1[i];
    const growth   = i === 0 ? 0 : data1[i] - data1[i-1];
    const simple   = i === 0 ? 0 : simpleAmt;
    const compound = growth - simple;
    return {
      year:     y,
      fv:       formatCurrency(fv),
      growth:   formatCurrency(growth),
      simple:   formatCurrency(simple),
      compound: formatCurrency(compound)
    };
  });

  document.getElementById('fv-table-body').innerHTML = buildTable(cols, rows);
}
