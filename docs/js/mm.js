/* ===== Modigliani-Miller Propositions I & II ===== */

let mmChart = null;

function mmFormatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function mmClamp(value, min, max, fallback) {
  if (Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function mmReadInputs() {
  const raInput = document.getElementById('mm-ra');
  const rdInput = document.getElementById('mm-rd');
  const taxInput = document.getElementById('mm-tax');
  const deInput = document.getElementById('mm-de');
  const maxDeInput = document.getElementById('mm-max-de');
  const vuInput = document.getElementById('mm-vu');

  const ra = mmClamp(parseFloat(raInput.value), 0, 50, 12.5);
  const rd = mmClamp(parseFloat(rdInput.value), 0, 50, 10);
  const taxPct = mmClamp(parseFloat(taxInput.value), 0, 100, 21);
  const maxDe = mmClamp(parseFloat(maxDeInput.value), 0.2, 4, 1);
  const de = mmClamp(parseFloat(deInput.value), 0, maxDe, 0.86);
  const vu = mmClamp(parseFloat(vuInput.value), 1, 1000000, 100);

  raInput.value = ra;
  rdInput.value = rd;
  taxInput.value = taxPct;
  maxDeInput.value = maxDe;
  deInput.max = maxDe;
  deInput.value = de.toFixed(2).replace(/\.00$/, '');
  vuInput.value = vu;

  return {
    ra,
    rd,
    taxPct,
    taxRate: taxPct / 100,
    de,
    maxDe,
    vu
  };
}

function mmComputePoint(ra, rd, taxRate, de, vu) {
  const spread = ra - rd;
  const equityReturn = ra + de * (1 - taxRate) * spread;
  const afterTaxDebt = rd * (1 - taxRate);
  const debtWeight = de / (1 + de);
  const equityWeight = 1 / (1 + de);
  const wacc = equityWeight * equityReturn + debtWeight * afterTaxDebt;

  const equityValue = vu / (1 + de * (1 - taxRate));
  const debtValue = de * equityValue;
  const leveredValue = equityValue + debtValue;
  const taxShieldPV = leveredValue - vu;

  return {
    spread,
    equityReturn,
    afterTaxDebt,
    debtWeight,
    equityWeight,
    wacc,
    equityValue,
    debtValue,
    leveredValue,
    taxShieldPV
  };
}

function mmBuildSeries(inputs) {
  const points = [];
  const steps = 60;

  for (let i = 0; i <= steps; i++) {
    const de = inputs.maxDe * (i / steps);
    const point = mmComputePoint(inputs.ra, inputs.rd, inputs.taxRate, de, inputs.vu);
    points.push({
      de,
      ra: inputs.ra,
      rd: inputs.rd,
      afterTaxDebt: point.afterTaxDebt,
      equityReturn: point.equityReturn,
      wacc: point.wacc
    });
  }

  return points;
}

function mmUpdateSummary(inputs, point) {
  const reEl = document.getElementById('mm-re-result');
  const waccEl = document.getElementById('mm-wacc-result');
  const vlEl = document.getElementById('mm-vl-result');
  const shieldEl = document.getElementById('mm-tax-shield-result');
  const summaryEl = document.getElementById('mm-summary-text');
  const resultsEl = document.getElementById('mm-results-table');

  reEl.textContent = mmFormatPercent(point.equityReturn);
  waccEl.textContent = mmFormatPercent(point.wacc);
  vlEl.textContent = formatCurrency(point.leveredValue);
  shieldEl.textContent = formatCurrency(point.taxShieldPV);

  const taxPct = inputs.taxPct.toFixed(0);
  summaryEl.textContent = inputs.taxRate === 0
    ? 'Taxes are switched off, so the classic MM case applies: firm value stays at VU, WACC stays flat at rA, and only the cost of equity rises with leverage.'
    : `With a ${taxPct}% tax rate, leverage creates a tax shield. That pushes firm value above VU and pulls the WACC below rA as debt financing increases.`;

  const rows = [
    {
      item: 'Selected D/E',
      value: inputs.de.toFixed(2)
    },
    {
      item: 'Equity Weight E/V',
      value: point.equityWeight.toFixed(3)
    },
    {
      item: 'Debt Weight D/V',
      value: point.debtWeight.toFixed(3)
    },
    {
      item: 'Equity Value E',
      value: formatCurrency(point.equityValue)
    },
    {
      item: 'Debt Value D',
      value: formatCurrency(point.debtValue)
    },
    {
      item: 'After-Tax Debt Return',
      value: mmFormatPercent(point.afterTaxDebt)
    }
  ];

  resultsEl.innerHTML = buildTable(
    [
      { label: 'Quantity', key: 'item' },
      { label: 'Value', key: 'value', align: 'right' }
    ],
    rows
  );
}

function mmRenderCurrentFormula(inputs, point) {
  const target = document.getElementById('mm-formula-current');
  if (!target || typeof katex === 'undefined') return;

  const taxRate = inputs.taxRate;
  const de = inputs.de;
  const valueFormula = inputs.taxRate === 0
    ? `V_L = V_U = ${inputs.vu.toFixed(2)}`
    : `V_L = V_U + T_C D = ${inputs.vu.toFixed(2)} + ${(taxRate).toFixed(2)} \\times ${point.debtValue.toFixed(2)} = ${point.leveredValue.toFixed(2)}`;

  const equityFormula = inputs.taxRate === 0
    ? `r_E = r_A + \\frac{D}{E}(r_A-r_D) = ${inputs.ra.toFixed(2)} + ${de.toFixed(2)} \\times (${inputs.ra.toFixed(2)}-${inputs.rd.toFixed(2)}) = ${point.equityReturn.toFixed(2)}\\%`
    : `r_E = r_A + \\frac{D}{E}(1-T_C)(r_A-r_D) = ${inputs.ra.toFixed(2)} + ${de.toFixed(2)} \\times (1-${taxRate.toFixed(2)}) \\times (${inputs.ra.toFixed(2)}-${inputs.rd.toFixed(2)}) = ${point.equityReturn.toFixed(2)}\\%`;

  const waccFormula = `\\mathrm{WACC} = ${point.equityWeight.toFixed(3)} \\times ${point.equityReturn.toFixed(2)}\\% + ${point.debtWeight.toFixed(3)} \\times ${inputs.rd.toFixed(2)}\\% \\times (1-${taxRate.toFixed(2)}) = ${point.wacc.toFixed(2)}\\%`;

  katex.render(
    `\\begin{aligned}${valueFormula}\\\\[4pt]${equityFormula}\\\\[4pt]${waccFormula}\\end{aligned}`,
    target,
    { displayMode: true }
  );
}

function mmBuildChart(inputs, point, series) {
  const chartEl = document.getElementById('mm-chart');
  if (!chartEl) return;

  const ctx = chartEl.getContext('2d');
  const values = [];
  series.forEach(item => {
    values.push(item.ra, item.rd, item.afterTaxDebt, item.equityReturn, item.wacc);
  });

  const yMin = Math.max(0, Math.floor((Math.min(...values) - 1) * 2) / 2);
  const yMax = Math.ceil((Math.max(...values) + 1.5) * 2) / 2;

  const datasets = [
    {
      label: 'rA (asset return)',
      data: series.map(item => ({ x: item.de, y: item.ra })),
      borderColor: '#6c757d',
      borderDash: [8, 6],
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      tension: 0
    },
    {
      label: 'rE (equity return)',
      data: series.map(item => ({ x: item.de, y: item.equityReturn })),
      borderColor: '#11824a',
      borderWidth: 4,
      pointRadius: 0,
      showLine: true,
      tension: 0
    },
    {
      label: 'WACC',
      data: series.map(item => ({ x: item.de, y: item.wacc })),
      borderColor: '#e76f00',
      borderWidth: 4,
      pointRadius: 0,
      showLine: true,
      tension: 0
    },
    {
      label: 'rD before tax',
      data: series.map(item => ({ x: item.de, y: item.rd })),
      borderColor: '#202124',
      borderWidth: 2,
      pointRadius: 0,
      showLine: true,
      tension: 0
    },
    {
      label: '(1 - TC) rD',
      data: series.map(item => ({ x: item.de, y: item.afterTaxDebt })),
      borderColor: COLORS.blue,
      borderWidth: 3,
      pointRadius: 0,
      showLine: true,
      tension: 0
    },
    {
      label: 'Selected rE',
      data: [{ x: inputs.de, y: point.equityReturn }],
      pointBackgroundColor: '#11824a',
      pointBorderColor: '#11824a',
      pointRadius: 5,
      pointHoverRadius: 6,
      showLine: false,
      skipLegend: true
    },
    {
      label: 'Selected WACC',
      data: [{ x: inputs.de, y: point.wacc }],
      pointBackgroundColor: '#e76f00',
      pointBorderColor: '#e76f00',
      pointRadius: 5,
      pointHoverRadius: 6,
      showLine: false,
      skipLegend: true
    },
    {
      label: 'Selected rD',
      data: [{ x: inputs.de, y: inputs.rd }],
      pointBackgroundColor: '#202124',
      pointBorderColor: '#202124',
      pointRadius: 5,
      pointHoverRadius: 6,
      showLine: false,
      skipLegend: true
    },
    {
      label: 'Selected after-tax rD',
      data: [{ x: inputs.de, y: point.afterTaxDebt }],
      pointBackgroundColor: COLORS.blue,
      pointBorderColor: COLORS.blue,
      pointRadius: 5,
      pointHoverRadius: 6,
      showLine: false,
      skipLegend: true
    }
  ];

  if (mmChart) mmChart.destroy();

  mmChart = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        title: {
          display: true,
          text: 'MM Proposition II with Optional Corporate Taxes',
          font: { size: 20, weight: 'bold' }
        },
        legend: {
          labels: {
            font: { size: 13 },
            filter: function(item, data) {
              return !data.datasets[item.datasetIndex].skipLegend;
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              const label = ctx.dataset.label || '';
              return `${label}: D/E=${ctx.parsed.x.toFixed(2)}, rate=${ctx.parsed.y.toFixed(2)}%`;
            }
          }
        },
        annotation: {
          annotations: {
            selectedLeverage: {
              type: 'line',
              xMin: inputs.de,
              xMax: inputs.de,
              yMin,
              yMax,
              borderColor: '#7a7a7a',
              borderWidth: 1.5,
              borderDash: [8, 6],
              label: {
                display: true,
                content: `D/E = ${inputs.de.toFixed(2)}`,
                position: 'start',
                backgroundColor: 'rgba(255,255,255,0.92)',
                color: '#495057',
                font: { size: 11, weight: '600' },
                padding: 4
              }
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: inputs.maxDe,
          title: {
            display: true,
            text: 'Debt-equity ratio, D/E',
            font: { size: 16, weight: 'bold' }
          },
          ticks: {
            font: { size: 13 }
          }
        },
        y: {
          min: yMin,
          max: yMax,
          title: {
            display: true,
            text: 'Rates of return (%)',
            font: { size: 16, weight: 'bold' }
          },
          ticks: {
            font: { size: 13 },
            callback: function(value) {
              return `${value.toFixed(1)}%`;
            }
          }
        }
      }
    }
  });
}

function mmUpdate() {
  if (!document.getElementById('mm-chart')) return;

  const inputs = mmReadInputs();
  const point = mmComputePoint(inputs.ra, inputs.rd, inputs.taxRate, inputs.de, inputs.vu);
  const series = mmBuildSeries(inputs);

  mmUpdateSummary(inputs, point);
  mmRenderCurrentFormula(inputs, point);
  mmBuildChart(inputs, point, series);
}
