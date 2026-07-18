// ===================== Sales Reports Logic =====================

const dailyDateInput = document.getElementById('dailyDate');
const monthlyMonthInput = document.getElementById('monthlyMonth');
const dailyCount = document.getElementById('dailyCount');
const dailyRevenue = document.getElementById('dailyRevenue');
const dailyTableBody = document.getElementById('dailyTableBody');
const monthlyCount = document.getElementById('monthlyCount');
const monthlyRevenue = document.getElementById('monthlyRevenue');
const monthlyTableBody = document.getElementById('monthlyTableBody');
const downloadDailyCsvBtn = document.getElementById('downloadDailyCsvBtn');
const downloadMonthlyCsvBtn = document.getElementById('downloadMonthlyCsvBtn');

let monthlyChartInstance = null;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadShopName() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    document.getElementById('shopNameHeader').textContent = data.shopName;
  } catch (err) { /* ignore */ }
}

// ---------------- Daily report ----------------
async function loadDailyReport() {
  const date = dailyDateInput.value || todayStr();
  const res = await fetch(`/api/reports/daily?date=${date}`);
  const data = await res.json();

  dailyCount.textContent = data.count;
  dailyRevenue.textContent = `₹${data.totalRevenue.toFixed(2)}`;

  if (data.bills.length === 0) {
    dailyTableBody.innerHTML = '<tr><td colspan="5" class="text-muted" style="text-align:center; padding:20px;">No bills for this date.</td></tr>';
    return;
  }

  dailyTableBody.innerHTML = data.bills.map(b => {
    const time = new Date(b.bill_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const itemsSummary = b.items.map(i => `${i.name} (${i.variant}) x${i.qty}`).join(', ');
    return `
      <tr>
        <td>${time}</td>
        <td>${b.bill_no}</td>
        <td style="max-width:280px; white-space:normal;">${escapeHtml(itemsSummary)}</td>
        <td>${b.payment_mode}</td>
        <td>₹${b.total.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

downloadDailyCsvBtn.addEventListener('click', () => {
  const date = dailyDateInput.value || todayStr();
  window.location.href = `/api/reports/daily/csv?date=${date}`;
});

// ---------------- Monthly report ----------------
async function loadMonthlyReport() {
  const month = monthlyMonthInput.value || currentMonthStr();
  const res = await fetch(`/api/reports/monthly?month=${month}`);
  const data = await res.json();

  monthlyCount.textContent = data.count;
  monthlyRevenue.textContent = `₹${data.totalRevenue.toFixed(2)}`;

  if (data.dailyBreakdown.length === 0) {
    monthlyTableBody.innerHTML = '<tr><td colspan="3" class="text-muted" style="text-align:center; padding:20px;">No sales recorded for this month.</td></tr>';
  } else {
    monthlyTableBody.innerHTML = data.dailyBreakdown.map(d => `
      <tr>
        <td>${d.date}</td>
        <td>${d.count}</td>
        <td>₹${d.total.toFixed(2)}</td>
      </tr>
    `).join('');
  }

  renderChart(data.dailyBreakdown);
}

function renderChart(dailyBreakdown) {
  const ctx = document.getElementById('monthlyChart');
  if (!ctx || typeof Chart === 'undefined') return;

  const labels = dailyBreakdown.map(d => d.date.slice(8, 10)); // just the day number
  const values = dailyBreakdown.map(d => d.total);

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: values,
        backgroundColor: '#0E7C86',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

downloadMonthlyCsvBtn.addEventListener('click', () => {
  const month = monthlyMonthInput.value || currentMonthStr();
  window.location.href = `/api/reports/monthly/csv?month=${month}`;
});

// ---------------- Init ----------------
dailyDateInput.value = todayStr();
monthlyMonthInput.value = currentMonthStr();
dailyDateInput.addEventListener('change', loadDailyReport);
monthlyMonthInput.addEventListener('change', loadMonthlyReport);

loadShopName();
loadDailyReport();
loadMonthlyReport();
