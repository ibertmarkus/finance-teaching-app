/* ===== Shared utilities for all calculators ===== */

/** Format a number as currency: $1,234.56 */
function formatCurrency(value) {
  return '$' + value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** Chart color palette */
const COLORS = {
  blue:   '#1f77b4',
  orange: '#ff7f0e',
  green:  '#2ca02c',
  red:    '#d62728',
  purple: '#9467bd'
};

/** Standard chart defaults */
function baseChartOptions(title, xLabel, yLabel) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: { size: 20, weight: 'bold' }
      },
      legend: {
        labels: { font: { size: 14 } }
      },
      tooltip: {
        callbacks: {
          label: function(ctx) {
            return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y);
          }
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, font: { size: 16, weight: 'bold' } },
        ticks: { font: { size: 14 } }
      },
      y: {
        title: { display: true, text: yLabel, font: { size: 16, weight: 'bold' } },
        ticks: {
          font: { size: 14 },
          callback: function(value) { return '$' + value.toLocaleString(); }
        }
      }
    }
  };
}

/* ===== Tab switching ===== */
function initTabs() {
  const buttons = document.querySelectorAll('.tab-nav button[data-tab]');
  const panels  = document.querySelectorAll('.tab-panel');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Update button states
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update panel states
      panels.forEach(p => {
        p.classList.toggle('active', p.id === target);
      });

      // Update URL hash without scrolling
      history.replaceState(null, '', '#' + target);

      // Trigger resize so Chart.js redraws correctly
      window.dispatchEvent(new Event('resize'));
    });
  });

  // Activate tab from URL hash, or default to first
  const hash = location.hash.replace('#', '');
  const target = document.getElementById(hash) ? hash : buttons[0]?.dataset.tab;
  if (target) {
    document.querySelector(`button[data-tab="${target}"]`)?.click();
  }
}

/* ===== Embed mode ===== */
function checkEmbed() {
  if (new URLSearchParams(location.search).has('embed')) {
    document.body.classList.add('embed');
  }
}

/* ===== Build an HTML table from column definitions and row data ===== */
function buildTable(columns, rows) {
  let html = '<table class="data-table"><thead><tr>';
  columns.forEach(col => { html += `<th>${col.label}</th>`; });
  html += '</tr></thead><tbody>';
  rows.forEach(row => {
    html += '<tr>';
    columns.forEach(col => {
      const cls = col.align === 'right' ? ' class="number"' : '';
      html += `<td${cls}>${row[col.key]}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  return html;
}

/* ===== Init on load ===== */
document.addEventListener('DOMContentLoaded', () => {
  checkEmbed();
  initTabs();
});
