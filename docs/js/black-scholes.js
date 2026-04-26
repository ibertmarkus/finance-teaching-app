/* ===== Black-Scholes Option Pricing (Introductory) ===== */

let bsValueChart = null;
let bsPayoffChart = null;

function bsClamp(value, min, max, fallback) {
  if (Number.isNaN(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

function bsFormatInputNumber(value, digits) {
  return value.toFixed(digits).replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1');
}

function bsFormatPercent(value) {
  return `${value.toFixed(2)}%`;
}

function bsReadInputs() {
  const sInput = document.getElementById('bs-s');
  const kInput = document.getElementById('bs-k');
  const tInput = document.getElementById('bs-t');
  const rInput = document.getElementById('bs-r');
  const sigmaInput = document.getElementById('bs-sigma');

  const S = bsClamp(parseFloat(sInput.value), 1, 100000, 100);
  const K = bsClamp(parseFloat(kInput.value), 1, 100000, 100);
  const T = bsClamp(parseFloat(tInput.value), 0, 10, 1);
  const r = bsClamp(parseFloat(rInput.value), -5, 25, 4);
  const sigma = bsClamp(parseFloat(sigmaInput.value), 0, 250, 25);

  sInput.value = bsFormatInputNumber(S, 2);
  kInput.value = bsFormatInputNumber(K, 2);
  tInput.value = bsFormatInputNumber(T, 2);
  rInput.value = bsFormatInputNumber(r, 2);
  sigmaInput.value = bsFormatInputNumber(sigma, 2);

  return { S, K, T, r, sigma };
}

function bsErf(x) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * absX);
  const poly = (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t;
  return sign * (1 - poly * Math.exp(-absX * absX));
}

function bsNormCdf(x) {
  return 0.5 * (1 + bsErf(x / Math.SQRT2));
}

function bsPricePair(S, K, rPct, sigmaPct, T) {
  const r = rPct / 100;
  const sigma = sigmaPct / 100;

  if (T <= 1e-8) {
    return {
      call: Math.max(S - K, 0),
      put: Math.max(K - S, 0),
      d1: null,
      d2: null
    };
  }

  if (sigma <= 1e-8) {
    const discountedStrike = K * Math.exp(-r * T);
    return {
      call: Math.max(S - discountedStrike, 0),
      put: Math.max(discountedStrike - S, 0),
      d1: null,
      d2: null
    };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const discount = Math.exp(-r * T);
  const call = S * bsNormCdf(d1) - K * discount * bsNormCdf(d2);
  const put = K * discount * bsNormCdf(-d2) - S * bsNormCdf(-d1);

  return { call, put, d1, d2 };
}

function bsApplyPreset(name) {
  const presets = {
    atm:        { S: 100, K: 100, T: 1.00, r: 4.00, sigma: 25.00 },
    itmCall:    { S: 125, K: 100, T: 1.00, r: 4.00, sigma: 20.00 },
    highVol:    { S: 100, K: 100, T: 1.00, r: 4.00, sigma: 60.00 },
    nearExpiry: { S: 100, K: 100, T: 0.10, r: 4.00, sigma: 25.00 }
  };

  const preset = presets[name];
  if (!preset) return;

  document.getElementById('bs-s').value = preset.S;
  document.getElementById('bs-k').value = preset.K;
  document.getElementById('bs-t').value = preset.T;
  document.getElementById('bs-r').value = preset.r;
  document.getElementById('bs-sigma').value = preset.sigma;

  bsUpdate();
}

function bsDescribeMoneyness(S, K) {
  const gapPct = ((S / K) - 1) * 100;
  if (Math.abs(gapPct) <= 2) return 'roughly at the money';
  if (gapPct > 0) return `${gapPct.toFixed(1)}% above the strike`;
  return `${Math.abs(gapPct).toFixed(1)}% below the strike`;
}

function bsBuildSeries(inputs) {
  const anchor = Math.max(inputs.S, inputs.K);
  const minPrice = Math.max(5, anchor * 0.35);
  const maxPrice = Math.max(anchor * 1.65, inputs.S * 1.35, inputs.K * 1.35);
  const steps = 70;
  const series = [];

  for (let i = 0; i <= steps; i++) {
    const stock = minPrice + (maxPrice - minPrice) * (i / steps);
    const prices = bsPricePair(stock, inputs.K, inputs.r, inputs.sigma, inputs.T);
    series.push({
      stock,
      callValue: prices.call,
      putValue: prices.put,
      callIntrinsic: Math.max(stock - inputs.K, 0),
      putIntrinsic: Math.max(inputs.K - stock, 0),
      callPayoff: Math.max(stock - inputs.K, 0),
      putPayoff: Math.max(inputs.K - stock, 0)
    });
  }

  return series;
}

function bsBuildAnnotations(inputs) {
  const annotations = {
    strikeLine: {
      type: 'line',
      xMin: inputs.K,
      xMax: inputs.K,
      borderColor: '#202124',
      borderDash: [6, 6],
      borderWidth: 2
    }
  };

  if (Math.abs(inputs.S - inputs.K) / inputs.K > 0.03) {
    annotations.currentLine = {
      type: 'line',
      xMin: inputs.S,
      xMax: inputs.S,
      borderColor: '#adb5bd',
      borderWidth: 2
    };
  }

  return annotations;
}

function bsBuildValueChart(inputs, prices, series) {
  const ctx = document.getElementById('bs-value-chart')?.getContext('2d');
  if (!ctx) return;

  if (bsValueChart) bsValueChart.destroy();

  bsValueChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Call value today',
          data: series.map(point => ({ x: point.stock, y: point.callValue })),
          borderColor: COLORS.blue,
          backgroundColor: 'rgba(31,119,180,0.08)',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.08
        },
        {
          label: 'Put value today',
          data: series.map(point => ({ x: point.stock, y: point.putValue })),
          borderColor: COLORS.red,
          backgroundColor: 'rgba(214,39,40,0.08)',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.08
        },
        {
          label: 'Call intrinsic value',
          data: series.map(point => ({ x: point.stock, y: point.callIntrinsic })),
          borderColor: COLORS.blue,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0
        },
        {
          label: 'Put intrinsic value',
          data: series.map(point => ({ x: point.stock, y: point.putIntrinsic })),
          borderColor: COLORS.red,
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0
        },
        {
          label: 'Current call',
          data: [{ x: inputs.S, y: prices.call }],
          pointBackgroundColor: COLORS.blue,
          pointBorderColor: COLORS.blue,
          pointRadius: 5,
          pointHoverRadius: 6,
          showLine: false
        },
        {
          label: 'Current put',
          data: [{ x: inputs.S, y: prices.put }],
          pointBackgroundColor: COLORS.red,
          pointBorderColor: COLORS.red,
          pointRadius: 5,
          pointHoverRadius: 6,
          showLine: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: 'Option Value Today Versus Stock Price',
          font: { size: 18, weight: 'bold' }
        },
        legend: {
          labels: {
            filter: item => !item.text.startsWith('Current ')
          }
        },
        tooltip: {
          callbacks: {
            title: items => items.length ? `Stock price = ${formatCurrency(items[0].parsed.x)}` : '',
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        },
        annotation: {
          annotations: bsBuildAnnotations(inputs)
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Current stock price S',
            font: { size: 15, weight: 'bold' }
          },
          ticks: {
            callback: value => '$' + Number(value).toFixed(0)
          }
        },
        y: {
          title: {
            display: true,
            text: 'Option value',
            font: { size: 15, weight: 'bold' }
          },
          ticks: {
            callback: value => '$' + Number(value).toFixed(0)
          }
        }
      }
    }
  });
}

function bsBuildPayoffChart(inputs, series) {
  const ctx = document.getElementById('bs-payoff-chart')?.getContext('2d');
  if (!ctx) return;

  if (bsPayoffChart) bsPayoffChart.destroy();

  bsPayoffChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'Call payoff at expiration',
          data: series.map(point => ({ x: point.stock, y: point.callPayoff })),
          borderColor: COLORS.blue,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0
        },
        {
          label: 'Put payoff at expiration',
          data: series.map(point => ({ x: point.stock, y: point.putPayoff })),
          borderColor: COLORS.red,
          borderWidth: 3,
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: {
          display: true,
          text: 'Payoff at Expiration',
          font: { size: 18, weight: 'bold' }
        },
        tooltip: {
          callbacks: {
            title: items => items.length ? `Final stock price = ${formatCurrency(items[0].parsed.x)}` : '',
            label: ctx => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
          }
        },
        annotation: {
          annotations: bsBuildAnnotations(inputs)
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'Stock price at expiration S_T',
            font: { size: 15, weight: 'bold' }
          },
          ticks: {
            callback: value => '$' + Number(value).toFixed(0)
          }
        },
        y: {
          title: {
            display: true,
            text: 'Payoff',
            font: { size: 15, weight: 'bold' }
          },
          ticks: {
            callback: value => '$' + Number(value).toFixed(0)
          }
        }
      }
    }
  });
}

function bsUpdateInsights(inputs, prices) {
  const stockUp = inputs.S * 1.1;
  const higherVol = Math.min(inputs.sigma + 20, 150);
  const shorterTime = Math.max(0.05, inputs.T * 0.25);

  const stockScenario = bsPricePair(stockUp, inputs.K, inputs.r, inputs.sigma, inputs.T);
  const volScenario = bsPricePair(inputs.S, inputs.K, inputs.r, higherVol, inputs.T);
  const timeScenario = bsPricePair(inputs.S, inputs.K, inputs.r, inputs.sigma, shorterTime);

  document.getElementById('bs-insight-stock').textContent =
    `Raise the stock from ${formatCurrency(inputs.S)} to ${formatCurrency(stockUp)}. The call rises from ${formatCurrency(prices.call)} to ${formatCurrency(stockScenario.call)}, while the put falls from ${formatCurrency(prices.put)} to ${formatCurrency(stockScenario.put)}.`;

  document.getElementById('bs-insight-vol').textContent =
    `Raise volatility from ${bsFormatPercent(inputs.sigma)} to ${bsFormatPercent(higherVol)}. The call moves to ${formatCurrency(volScenario.call)} and the put to ${formatCurrency(volScenario.put)} because more uncertainty helps convex payoffs.`;

  document.getElementById('bs-insight-time').textContent =
    `Cut maturity from ${inputs.T.toFixed(2)} years to ${shorterTime.toFixed(2)} years. The call shifts to ${formatCurrency(timeScenario.call)} and the put to ${formatCurrency(timeScenario.put)}, showing how time value disappears as expiration approaches.`;
}

function bsUpdateFootnote(prices) {
  const target = document.getElementById('bs-footnote-current');
  if (!target) return;

  if (prices.d1 === null || prices.d2 === null) {
    target.textContent = 'For the current inputs, the option is effectively at maturity or zero volatility, so the model collapses toward discounted intrinsic value.';
    return;
  }

  target.textContent = `For the current inputs, d1 = ${prices.d1.toFixed(3)} and d2 = ${prices.d2.toFixed(3)}.`;
}

function bsUpdate() {
  const inputs = bsReadInputs();
  const prices = bsPricePair(inputs.S, inputs.K, inputs.r, inputs.sigma, inputs.T);
  const series = bsBuildSeries(inputs);

  const callIntrinsic = Math.max(inputs.S - inputs.K, 0);
  const putIntrinsic = Math.max(inputs.K - inputs.S, 0);
  const callTimeValue = Math.max(prices.call - callIntrinsic, 0);

  document.getElementById('bs-call-result').textContent = formatCurrency(prices.call);
  document.getElementById('bs-put-result').textContent = formatCurrency(prices.put);
  document.getElementById('bs-call-intrinsic-result').textContent = formatCurrency(callIntrinsic);
  document.getElementById('bs-put-intrinsic-result').textContent = formatCurrency(putIntrinsic);

  document.getElementById('bs-summary-text').textContent =
    `The stock is ${bsDescribeMoneyness(inputs.S, inputs.K)}. The call's intrinsic value is ${formatCurrency(callIntrinsic)}, but the Black-Scholes price is ${formatCurrency(prices.call)}, so the remaining gap is time value. The same idea appears in the dashed-versus-solid lines for the put.`;

  bsBuildValueChart(inputs, prices, series);
  bsBuildPayoffChart(inputs, series);
  bsUpdateInsights(inputs, prices);
  bsUpdateFootnote(prices);
}
