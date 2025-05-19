// === 初期データと変数 ===
let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let regularExpenses = JSON.parse(localStorage.getItem("regularExpenses")) || [];
let categoryChart;
let calendar;

const form = document.getElementById("expense-form");
const tableBody = document.querySelector("#expense-table tbody");
const yearSelect = document.getElementById("year-select");
const monthSelect = document.getElementById("month-select");
const calendarEl = document.getElementById("calendar");

document.getElementById("date").valueAsDate = new Date();

// === 年月セレクターを作成 ===
function setupDateSelectors() {
  const now = new Date();
  const thisYear = now.getFullYear();
  for (let y = thisYear - 1; y <= thisYear + 1; y++) {
    const option = document.createElement("option");
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
  }
  for (let m = 1; m <= 12; m++) {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    monthSelect.appendChild(option);
  }
  yearSelect.value = thisYear;
  monthSelect.value = now.getMonth() + 1;
}
setupDateSelectors();

function getMonthRangeText(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  return `${month}/${first.getDate()}〜${month}/${last.getDate()}`;
}

// === グラフ更新 ===
function updateCategoryChart(data) {
  const ctx = document.getElementById("category-chart").getContext("2d");
  const totalsByCategory = {};
  data.forEach(exp => {
    if (!totalsByCategory[exp.category]) totalsByCategory[exp.category] = 0;
    totalsByCategory[exp.category] += Number(exp.amount);
  });

  const labels = Object.keys(totalsByCategory);
  const values = Object.values(totalsByCategory);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: false }
      }
    }
  });
}

// === カレンダー表示 ===
function updateCalendar(events) {
  if (calendar) calendar.destroy();
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'ja',
    events,
    height: 500
  });
  calendar.render();
}

// === 定期支出反映 ===
function applyRegularExpenses(year, month) {
  const datePrefix = `${year}-${String(month).padStart(2, '0')}`;
  regularExpenses.forEach(item => {
    const fullDate = `${datePrefix}-${String(item.day).padStart(2, '0')}`;
    const alreadyExists = expenses.some(exp => exp.date === fullDate && exp.memo === item.memo);
    if (!alreadyExists) {
      expenses.push({
        date: fullDate,
        amount: item.amount,
        category: item.category,
        memo: item.memo,
        isExpense: item.isExpense
      });
    }
  });
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

// === 表と合計の更新 ===
function updateTableAndTotals() {
  const selectedYear = parseInt(yearSelect.value);
  const selectedMonth = parseInt(monthSelect.value);
  applyRegularExpenses(selectedYear, selectedMonth);

  tableBody.innerHTML = "";
  const keyword = document.getElementById("search-keyword").value.toLowerCase();
  const filterCategory = document.getElementById("filter-category").value;
  const filterExpense = document.getElementById("filter-expense").value;

  let monthlyTotal = 0, yearlyTotal = 0, monthlyExpense = 0, yearlyExpense = 0;
  const monthlyExpenses = [], calendarEvents = [];

  expenses.forEach((exp, index) => {
    const d = new Date(exp.date);
    const amount = Number(exp.amount);
    const isExpense = exp.isExpense;
    const isThisYear = d.getFullYear() === selectedYear;
    const isThisMonth = d.getMonth() + 1 === selectedMonth;

    if (isThisYear) {
      yearlyTotal += amount;
      if (isExpense) yearlyExpense += amount;
    }
    if (!isThisYear || !isThisMonth) return;

    const matchKeyword = keyword === "" ||
      exp.date.includes(keyword) ||
      exp.amount.toString().includes(keyword) ||
      exp.category.toLowerCase().includes(keyword) ||
      exp.memo.toLowerCase().includes(keyword);

    const matchCategory = filterCategory === "" || exp.category === filterCategory;
    const matchExpense = filterExpense === "" ||
      (filterExpense === "business" && isExpense) ||
      (filterExpense === "private" && !isExpense);

    if (matchKeyword && matchCategory && matchExpense) {
      monthlyTotal += amount;
      if (isExpense) monthlyExpense += amount;
      monthlyExpenses.push(exp);
      calendarEvents.push({ title: `${exp.category}: ¥${exp.amount}`, date: exp.date });
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${exp.date}</td>
        <td>${exp.amount}</td>
        <td>${exp.category}</td>
        <td>${exp.memo}</td>
        <td>${isExpense ? "✔" : ""}</td>
        <td><button onclick="deleteExpense(${index})"><i class='fas fa-trash'></i></button></td>
      `;
      tableBody.appendChild(row);
    }
  });

  document.getElementById("monthly-summary").textContent =
    `月合計：${monthlyTotal}円（${getMonthRangeText(selectedYear, selectedMonth)}）　内、経費：${monthlyExpense}円`;
  document.getElementById("yearly-summary").textContent =
    `年合計：${yearlyTotal}円　内、経費：${yearlyExpense}円`;

  updateCategoryChart(monthlyExpenses);
  updateCalendar(calendarEvents);
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

// === 支出追加 ===
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const selectedType = document.querySelector('input[name="expenseType"]:checked').value;
  const isExpense = selectedType === 'business';
  const newExpense = {
    date: document.getElementById("date").value,
    amount: document.getElementById("amount").value,
    category: document.getElementById("category").value,
    memo: document.getElementById("memo").value,
    isExpense
  };
  expenses.push(newExpense);
  form.reset();
  document.getElementById("date").valueAsDate = new Date();
  updateTableAndTotals();
});

// === 削除機能 ===
function deleteExpense(index) {
  expenses.splice(index, 1);
  updateTableAndTotals();
}

// === フィルターイベント ===
document.getElementById("search-keyword").addEventListener("input", updateTableAndTotals);
document.getElementById("filter-category").addEventListener("change", updateTableAndTotals);
document.getElementById("filter-expense").addEventListener("change", updateTableAndTotals);
yearSelect.addEventListener("change", updateTableAndTotals);
monthSelect.addEventListener("change", updateTableAndTotals);

// === CSV出力 ===
document.getElementById("export-csv").addEventListener("click", () => {
  const year = parseInt(yearSelect.value);
  const month = parseInt(monthSelect.value);
  const filtered = expenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  if (filtered.length === 0) return alert("この月には記録がありません。");

  let csv = "日付,金額,カテゴリ,メモ,経費\n";
  filtered.forEach(exp => {
    csv += `${exp.date},${exp.amount},${exp.category},"${exp.memo}",${exp.isExpense ? "Yes" : "No"}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `家計簿_${year}_${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// === 定期支出 UI ===
function saveRegularExpenses() {
  localStorage.setItem("regularExpenses", JSON.stringify(regularExpenses));
}

function renderRegularExpenseUI() {
  const container = document.getElementById("regular-expense-list");
  container.innerHTML = "";
  regularExpenses.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "regular-item";
    div.innerHTML = `
      <span>${item.day}日 / ¥${item.amount} / ${item.category} / ${item.memo} / ${item.isExpense ? "経費" : "プライベート"}</span>
      <button onclick="removeRegularExpense(${index})">削除</button>
    `;
    container.appendChild(div);
  });
}

function removeRegularExpense(index) {
  regularExpenses.splice(index, 1);
  saveRegularExpenses();
  renderRegularExpenseUI();
}

document.getElementById("add-regular-btn").addEventListener("click", () => {
  const day = parseInt(document.getElementById("regular-day").value);
  const amount = Number(document.getElementById("regular-amount").value);
  const category = document.getElementById("regular-category").value;
  const memo = document.getElementById("regular-memo").value;
  const isExpense = document.querySelector('input[name="regular-expense-type"]:checked').value === "business";

  if (!day || !amount || !category) {
    alert("すべての必須項目を入力してください。");
    return;
  }

  regularExpenses.push({ day, amount, category, memo, isExpense });
  saveRegularExpenses();
  renderRegularExpenseUI();
  document.getElementById("regular-form").reset();
});

// === 初期実行
window.addEventListener("DOMContentLoaded", () => {
  updateTableAndTotals();
  renderRegularExpenseUI();
});
// JavaScriptコードはここに貼ってください（長いため別途）
