// expense-tracker app.js
const STORAGE_KEY = "expenseTransactions";
const BUDGET_KEY = "expenseMonthlyBudget";

let transactions = getUserTransactions();
let budget = getUserBudget();

function loadUserData() {
  transactions = getUserTransactions();
  budget = getUserBudget();
}

function formatCurrency(amount) {
  return formatUserCurrency(amount);
}

function saveTransactions() {
  saveUserTransactions(transactions);
}

function saveBudget() {
  saveUserBudget(budget);
}

function getTotals() {
  const income = transactions
    .filter(t => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const expenses = transactions
    .filter(t => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return { income, expenses, balance: income - expenses };
}

function formatDate(dateString) {
  if (!dateString) return "-";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTimeString(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":");
  if (h === undefined || m === undefined) return time24;
  const dateObj = new Date();
  dateObj.setHours(parseInt(h, 10), parseInt(m, 10));
  return dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatDateTime(dateString, timeString) {
  if (!dateString) return "-";
  const dateFormatted = formatDate(dateString);
  if (timeString) {
    return `${dateFormatted}, ${timeString}`;
  }
  return dateFormatted;
}

function categoryInitial(cat) {
  return cat ? cat.charAt(0).toUpperCase() : "?";
}

function escapeHTML(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ----------------- DASHBOARD RENDER ----------------- */
function createTransactionHTML(tx) {
  const amountClass = tx.type === "income" ? "income-text" : "expense-text";

  return `
    <div class="transaction-item">
      <div class="transaction-main">
        <div class="category-dot">${categoryInitial(tx.category)}</div>
        <div>
          <div class="transaction-title">${escapeHTML(tx.title)}</div>
          <div class="transaction-meta">${escapeHTML(tx.category)} · ${formatDateTime(tx.date, tx.time)}</div>
        </div>
      </div>
      <div class="transaction-amount ${amountClass}">${formatCurrency(tx.amount)}</div>
    </div>
  `;
}

function renderDashboard() {
  const totals = getTotals();

  const welcomeEl = document.getElementById("welcomeHeading");
  if (welcomeEl) {
    const todayDay = new Date().getDate();
    if (todayDay === 1) {
      welcomeEl.innerHTML = `Last month reports are saved in <a href="monthly-reports.html" class="text-link" style="font-size:inherit;text-decoration:underline;">Monthly Reports</a>`;
    } else {
      welcomeEl.textContent = "Welcome back!";
    }
  }

  const balanceEl = document.getElementById("balanceAmount");
  const incomeEl = document.getElementById("incomeAmount");
  const expenseEl = document.getElementById("expenseAmount");
  const todayEl = document.getElementById("todayDate");

  if (balanceEl) balanceEl.textContent = formatCurrency(totals.balance);
  if (incomeEl) incomeEl.textContent = formatCurrency(totals.income);
  if (expenseEl) expenseEl.textContent = formatCurrency(totals.expenses);
  if (todayEl) todayEl.textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  const recentContainer = document.getElementById("recentTransactions");
  const recent = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (!recent.length && recentContainer) {
    recentContainer.innerHTML = `
      <div class="empty-state">
        <div>▣</div>
        <h3>No transactions yet</h3>
        <p>Add your first transaction using the form.</p>
      </div>
    `;
  } else if (recentContainer) {
    recentContainer.innerHTML = recent.map(createTransactionHTML).join("");
  }

  // budget info
  const budgetSpentEl = document.getElementById("budgetSpent");
  const budgetLimitEl = document.getElementById("budgetLimit");
  const progressEl = document.getElementById("budgetProgress");
  const budgetMessageEl = document.getElementById("budgetMessage");
  const editBudgetBtn = document.getElementById("editBudgetBtn");

  if (editBudgetBtn) {
    if (!budget || budget === 0) {
      editBudgetBtn.textContent = "Set budget";
      editBudgetBtn.classList.add("highlight-pulse");
    } else {
      editBudgetBtn.textContent = "Update budget";
      editBudgetBtn.classList.remove("highlight-pulse");
    }
  }

  if (budgetSpentEl) budgetSpentEl.textContent = formatCurrency(totals.expenses);
  if (budgetLimitEl) budgetLimitEl.textContent = budget > 0 ? formatCurrency(budget) : "Not set";

  const percentage = budget > 0 ? (totals.expenses / budget) * 100 : 0;
  if (progressEl) {
    progressEl.style.width = `${Math.min(percentage, 100)}%`;
    if (percentage < 50) {
      progressEl.style.background = "linear-gradient(90deg, #00875a, #10b981)";
    } else if (percentage < 80) {
      progressEl.style.background = "linear-gradient(90deg, #f59e0b, #eab308)";
    } else if (percentage < 100) {
      progressEl.style.background = "linear-gradient(90deg, #f97316, #ef4444)";
    } else {
      progressEl.style.background = "linear-gradient(90deg, #dc2626, #b91c1c)";
    }
  }

  if (budgetMessageEl) {
    if (!budget) {
      budgetMessageEl.textContent = "Set a monthly budget to monitor your spending.";
      budgetMessageEl.style.color = "";
    } else if (totals.expenses > budget) {
      budgetMessageEl.textContent = `You are ${formatCurrency(totals.expenses - budget)} over your budget.`;
      budgetMessageEl.style.color = "var(--red)";
    } else {
      budgetMessageEl.textContent = `${formatCurrency(budget - totals.expenses)} remaining in your budget.`;
      budgetMessageEl.style.color = "var(--green)";
    }
  }
}

/* ----------------- HISTORY RENDER ----------------- */
function renderHistory() {
  const searchEl = document.getElementById("historySearch");
  const dateEl = document.getElementById("historyDateFilter");
  const typeEl = document.getElementById("historyTypeFilter");
  const catEl = document.getElementById("historyCategoryFilter");
  const tbody = document.getElementById("historyTableBody");
  const empty = document.getElementById("historyEmpty");

  const search = searchEl ? searchEl.value.toLowerCase() : "";
  const filterDate = dateEl ? dateEl.value : "";
  const type = typeEl ? typeEl.value : "all";
  const category = catEl ? catEl.value : "all";

  const filtered = [...transactions].filter(tx => {
    const matchesSearch =
      tx.title.toLowerCase().includes(search) ||
      tx.category.toLowerCase().includes(search) ||
      (tx.note || "").toLowerCase().includes(search);

    const matchesDate = !filterDate || tx.date === filterDate;
    const matchesType = type === "all" || tx.type === type;
    const matchesCategory = category === "all" || tx.category === category;

    return matchesSearch && matchesDate && matchesType && matchesCategory;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!filtered.length) {
    if (tbody) tbody.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
  } else {
    if (empty) empty.classList.add("hidden");
    if (tbody) {
      tbody.innerHTML = filtered.map(tx => {
        const sign = tx.type === "income" ? "+" : "-";
        const amountClass = tx.type === "income" ? "income-text" : "expense-text";
        return `
          <tr>
            <td>
              <div class="table-title">${escapeHTML(tx.title)}</div>
              ${tx.note ? `<div class="table-note">${escapeHTML(tx.note)}</div>` : ""}
            </td>
            <td>${escapeHTML(tx.category)}</td>
            <td>${formatDateTime(tx.date, tx.time)}</td>
            <td><span class="type-badge ${tx.type}">${tx.type}</span></td>
            <td class="${amountClass}"><strong>${sign}${formatCurrency(tx.amount)}</strong></td>
            <td>
              <div class="table-actions">
                <button onclick="openEditModal('${tx.id}')">Edit</button>
                <button class="delete-btn" onclick="deleteTransaction('${tx.id}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  // summary values
  const totals = getTotals();
  const historyCount = document.getElementById("historyCount");
  const historyIncome = document.getElementById("historyIncome");
  const historyExpenses = document.getElementById("historyExpenses");

  if (historyCount) historyCount.textContent = transactions.length;
  if (historyIncome) historyIncome.textContent = formatCurrency(totals.income);
  if (historyExpenses) historyExpenses.textContent = formatCurrency(totals.expenses);
}

/* ----------------- ANALYTICS RENDER ----------------- */
let categoryChart = null;
let cashflowChart = null;

function destroyCharts() {
  if (categoryChart) {
    try { categoryChart.destroy(); } catch (e) { }
    categoryChart = null;
  }
  if (cashflowChart) {
    try { cashflowChart.destroy(); } catch (e) { }
    cashflowChart = null;
  }
}

function renderAnalytics() {
  const totals = getTotals();

  const analyticsBalance = document.getElementById("analyticsBalance");
  const analyticsIncome = document.getElementById("analyticsIncome");
  const analyticsExpenses = document.getElementById("analyticsExpenses");

  if (analyticsBalance) analyticsBalance.textContent = formatCurrency(totals.balance);
  if (analyticsIncome) analyticsIncome.textContent = formatCurrency(totals.income);
  if (analyticsExpenses) analyticsExpenses.textContent = formatCurrency(totals.expenses);

  // compute category totals for expenses
  const expenseTx = transactions.filter(t => t.type === "expense");
  const categoryTotals = {};
  expenseTx.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount);
  });

  const categories = Object.keys(categoryTotals);
  const values = Object.values(categoryTotals);

  destroyCharts();

  const categoryCtx = document.getElementById("categoryChart");
  const cashflowCtx = document.getElementById("cashflowChart");

  if (categoryCtx) {
    categoryChart = new Chart(categoryCtx, {
      type: "doughnut",
      data: {
        labels: categories.length ? categories : ["No expenses"],
        datasets: [{
          data: values.length ? values : [1],
          backgroundColor: [
            "#635bff", "#13a673", "#f5a623", "#e05260", "#42a5f5", "#9c6ade", "#20b7a5", "#ef7d4d", "#8b93a8"
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } }
      }
    });
  }

  if (cashflowCtx) {
    cashflowChart = new Chart(cashflowCtx, {
      type: "bar",
      data: {
        labels: ["Income", "Expenses"],
        datasets: [{ data: [totals.income, totals.expenses], backgroundColor: ["#13a673", "#e05260"], borderRadius: 8, barThickness: 55 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { callback: v => `₹${v}` } } },
        plugins: { legend: { display: false } }
      }
    });
  }

  const topCategory = categories.length ? categories.reduce((a, b) => categoryTotals[a] > categoryTotals[b] ? a : b) : null;
  const topCategoryText = document.getElementById("topCategoryText");
  if (topCategoryText) topCategoryText.textContent = topCategory
    ? `Your highest spending category is ${topCategory} at ${formatCurrency(categoryTotals[topCategory])}.`
    : "Add expenses to see your top category.";

  const cashflowText = document.getElementById("cashflowText");
  if (cashflowText) cashflowText.textContent = totals.income >= totals.expenses
    ? "Your income currently covers your recorded expenses."
    : "Your recorded expenses are higher than your income.";

  renderInsights(totals, categoryTotals, topCategory);
}

function renderInsights(totals, categoryTotals, topCategory) {
  const insightsGrid = document.getElementById("insightsGrid");
  if (!insightsGrid) return;

  const savingsRate = totals.income > 0 ? Math.round(((totals.income - totals.expenses) / totals.income) * 100) : 0;
  const txCount = transactions.length;

  insightsGrid.innerHTML = `
    <div class="insight-card">
      <span>◎</span>
      <strong>Saving rate</strong>
      <p>${totals.income > 0 ? `You retain approximately ${savingsRate}% of your income.` : "Add income to calculate your saving rate."}</p>
    </div>

    <div class="insight-card">
      <span>◈</span>
      <strong>Top category</strong>
      <p>${topCategory ? `${topCategory} is your biggest expense category.` : "Add expenses to identify your top category."}</p>
    </div>

    <div class="insight-card">
      <span>⌁</span>
      <strong>Activity level</strong>
      <p>You have recorded ${txCount} transaction${txCount === 1 ? "" : "s"} so far.</p>
    </div>
  `;
}

/* ----------------- CRUD helpers ----------------- */
function openEditModal(id) {
  if (!getCurrentUser()) {
    showToast("Sign in required", "error");
    openAuthModal("signin");
    return;
  }
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  document.getElementById("editId").value = tx.id;
  document.getElementById("editTitle").value = tx.title;
  document.getElementById("editAmount").value = tx.amount;
  document.getElementById("editType").value = tx.type;
  document.getElementById("editCategory").value = tx.category;
  document.getElementById("editDate").value = tx.date;
  const editTimeEl = document.getElementById("editTime");
  if (editTimeEl) {
    editTimeEl.value = tx.timeRaw || "12:00";
  }
  document.getElementById("editNote").value = tx.note || "";

  document.getElementById("editModal").classList.remove("hidden");
}

function deleteTransaction(id) {
  if (!getCurrentUser()) {
    showToast("Sign in required", "error");
    openAuthModal("signin");
    return;
  }
  if (!confirm("Are you sure you want to delete this transaction?")) return;
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  // Re-render depending on page
  if (document.body.dataset.page === "history") renderHistory();
  if (document.body.dataset.page === "dashboard") renderDashboard();
  if (document.body.dataset.page === "analytics") renderAnalytics();
}

/* ----------------- SETUP PER PAGE ----------------- */
function setupDashboard() {
  renderDashboard();

  // default date & time for form
  const dateInput = document.getElementById("transactionDate");
  const timeInput = document.getElementById("transactionTime");

  const resetFormDateTime = () => {
    const now = new Date();
    if (dateInput) dateInput.value = now.toISOString().split("T")[0];
    if (timeInput) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      timeInput.value = `${hours}:${minutes}`;
    }
  };

  resetFormDateTime();

  const form = document.getElementById("transactionForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (!getCurrentUser()) {
        showToast("Sign in required", "error");
        openAuthModal("signin");
        return;
      }

      const oldTotals = getTotals();

      const rawTime = timeInput ? timeInput.value : "";
      const formattedTime = rawTime ? formatTimeString(rawTime) : new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

      const newTx = {
        id: Date.now().toString(),
        title: document.getElementById("transactionTitle").value.trim(),
        amount: Number(document.getElementById("transactionAmount").value),
        type: document.getElementById("transactionType").value,
        category: document.getElementById("transactionCategory").value,
        date: document.getElementById("transactionDate").value,
        time: formattedTime,
        timeRaw: rawTime,
        note: document.getElementById("transactionNote").value.trim()
      };
      transactions.push(newTx);
      saveTransactions();

      form.reset();
      resetFormDateTime();
      renderDashboard();

      // Trigger visual deduction / addition animation
      animateTransactionValue(newTx.type, newTx.amount, oldTotals);
    });
  }

  // clear form button
  const clearBtn = document.getElementById("clearFormBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (form) form.reset();
      resetFormDateTime();
    });
  }

  // budget modal behavior
  const budgetModal = document.getElementById("budgetModal");
  const editBudgetBtn = document.getElementById("editBudgetBtn");
  const closeBudgetBtn = document.getElementById("closeBudgetBtn");
  const budgetForm = document.getElementById("budgetForm");

  if (editBudgetBtn) editBudgetBtn.addEventListener("click", () => {
    if (!getCurrentUser()) {
      showToast("Sign in required", "error");
      openAuthModal("signin");
      return;
    }
    document.getElementById("budgetInput").value = budget || "";
    if (budgetModal) budgetModal.classList.remove("hidden");
  });

  if (closeBudgetBtn) closeBudgetBtn.addEventListener("click", () => {
    if (budgetModal) budgetModal.classList.add("hidden");
  });

  if (budgetForm) {
    budgetForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!getCurrentUser()) {
        showToast("Sign in required", "error");
        openAuthModal("signin");
        return;
      }
      budget = Number(document.getElementById("budgetInput").value);
      saveBudget();
      if (budgetModal) budgetModal.classList.add("hidden");
      renderDashboard();
    });
  }
}

function setupHistory() {
  renderHistory();

  ["historySearch", "historyDateFilter", "historyTypeFilter", "historyCategoryFilter"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", renderHistory);
      el.addEventListener("change", renderHistory);
    }
  });

  const closeEditBtn = document.getElementById("closeEditBtn");
  if (closeEditBtn) closeEditBtn.addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
  });

  const editForm = document.getElementById("editForm");
  if (editForm) {
    editForm.addEventListener("submit", e => {
      e.preventDefault();
      if (!getCurrentUser()) {
        showToast("Sign in required", "error");
        openAuthModal("signin");
        return;
      }
      const id = document.getElementById("editId").value;
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      const editTimeEl = document.getElementById("editTime");
      const rawTime = editTimeEl ? editTimeEl.value : "";
      const formattedTime = rawTime ? formatTimeString(rawTime) : (tx.time || "");

      tx.title = document.getElementById("editTitle").value.trim();
      tx.amount = Number(document.getElementById("editAmount").value);
      tx.type = document.getElementById("editType").value;
      tx.category = document.getElementById("editCategory").value;
      tx.date = document.getElementById("editDate").value;
      if (formattedTime) tx.time = formattedTime;
      if (rawTime) tx.timeRaw = rawTime;
      tx.note = document.getElementById("editNote").value.trim();

      saveTransactions();
      document.getElementById("editModal").classList.add("hidden");
      renderHistory();
      renderDashboard();
      renderAnalytics();
    });
  }
}

function setupAnalytics() {
  renderAnalytics();
}

/* ----------------- AUTH & TOPBAR UI CONTROLLER ----------------- */
function getInitials(name = "") {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderTopbarAuthArea() {
  const container = document.getElementById("topbarAuthArea");
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <button class="topbar-auth-btn" type="button" onclick="openAuthModal('signin')">Sign In</button>
    `;
  } else {
    container.innerHTML = `
      <div class="user-menu-container">
        <button class="user-profile-pill" id="userMenuToggle" type="button">
          <span class="user-avatar-small">${getInitials(user.fullName)}</span>
          <span>${escapeHTML(user.fullName)}</span>
          <span style="font-size: 10px;">▼</span>
        </button>

        <div class="profile-dropdown-menu hidden" id="userDropdownMenu">
          <a href="profile.html" class="dropdown-item">
            <span>👤</span> Profile
          </a>
          <a href="javascript:void(0)" onclick="openEditProfileModal()" class="dropdown-item">
            <span>✏️</span> Edit Profile
          </a>
          <div class="dropdown-divider"></div>
          <a href="javascript:void(0)" onclick="handleLogout()" class="dropdown-item logout-item">
            <span>🚪</span> Logout
          </a>
        </div>
      </div>
    `;

    const toggleBtn = document.getElementById("userMenuToggle");
    const menu = document.getElementById("userDropdownMenu");
    if (toggleBtn && menu) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("hidden");
      });

      document.addEventListener("click", () => {
        menu.classList.add("hidden");
      });
    }
  }
}

function handleLogout() {
  logoutUser();
  showToast("Logged out successfully.", "success");
  if (document.body.dataset.page === "profile") {
    window.location.href = "index.html";
  }
}

/* ----------------- AUTH MODAL CONTROLLER ----------------- */
function initAuthModalHTML() {
  const container = document.getElementById("authModalContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="modal hidden" id="authModal">
      <div class="modal-box" style="max-width: 500px;">
        <button class="close-button" id="closeAuthModalBtn">×</button>
        
        <div class="auth-tabs">
          <button class="auth-tab active" id="tabSigninBtn" type="button" onclick="switchAuthTab('signin')">Sign In</button>
          <button class="auth-tab" id="tabRegisterBtn" type="button" onclick="switchAuthTab('register')">Create Account</button>
        </div>

        <div id="authErrorBadge" class="form-error-badge hidden"></div>

        <!-- SIGN IN FORM -->
        <form id="signinForm">
          <div class="form-group">
            <label for="signinEmail">Email Address</label>
            <input type="email" id="signinEmail" required placeholder="name@example.com">
          </div>

          <div class="form-group">
            <label for="signinPassword">Password</label>
            <input type="password" id="signinPassword" required placeholder="••••••••">
          </div>

          <button class="primary-button" type="submit" style="margin-top: 10px;">Sign In</button>

          <p class="auth-switch-prompt">
            Don't have an account? <button type="button" onclick="switchAuthTab('register')">Create Account</button>
          </p>
        </form>

        <!-- REGISTER FORM -->
        <form id="registerForm" class="hidden">
          <div class="form-group">
            <label for="regFullName">Full Name *</label>
            <input type="text" id="regFullName" required placeholder="e.g. Jayaprakash L">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="regEmail">Email Address *</label>
              <input type="email" id="regEmail" required placeholder="name@example.com">
            </div>

            <div class="form-group">
              <label for="regPhone">Phone Number</label>
              <input type="tel" id="regPhone" placeholder="+91 XXXXX XXXXX">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="regPassword">Password *</label>
              <input type="password" id="regPassword" required placeholder="Min 6 characters">
            </div>

            <div class="form-group">
              <label for="regConfirmPassword">Confirm Password *</label>
              <input type="password" id="regConfirmPassword" required placeholder="Repeat password">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="regIncome">Monthly Income</label>
              <input type="number" id="regIncome" min="0" step="0.01" placeholder="e.g. 50000">
            </div>

            <div class="form-group">
              <label for="regBudget">Monthly Budget</label>
              <input type="number" id="regBudget" min="0" step="0.01" placeholder="e.g. 30000">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="regCurrency">Preferred Currency</label>
              <select id="regCurrency">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="regGoal">Financial Goal</label>
              <select id="regGoal">
                <option value="Save Money">Save Money</option>
                <option value="Control Spending">Control Spending</option>
                <option value="Build Emergency Fund">Build Emergency Fund</option>
                <option value="Pay Off Debt">Pay Off Debt</option>
                <option value="Track Expenses">Track Expenses</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <button class="primary-button" type="submit" style="margin-top: 10px;">Create Account</button>

          <p class="auth-switch-prompt">
            Already have an account? <button type="button" onclick="switchAuthTab('signin')">Sign In</button>
          </p>
        </form>
      </div>
    </div>
  `;

  // Bind Close Button
  const closeBtn = document.getElementById("closeAuthModalBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("authModal").classList.add("hidden");
    });
  }

  // Bind Form Submits
  const signinForm = document.getElementById("signinForm");
  if (signinForm) {
    signinForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthError();
      const email = document.getElementById("signinEmail").value;
      const password = document.getElementById("signinPassword").value;

      try {
        await loginUser(email, password);
        document.getElementById("authModal").classList.add("hidden");
        showToast("Signed in successfully!", "success");
        refreshAppView();
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAuthError();

      const fullName = document.getElementById("regFullName").value;
      const email = document.getElementById("regEmail").value;
      const phone = document.getElementById("regPhone").value;
      const password = document.getElementById("regPassword").value;
      const confirmPassword = document.getElementById("regConfirmPassword").value;
      const income = document.getElementById("regIncome").value;
      const budget = document.getElementById("regBudget").value;
      const currency = document.getElementById("regCurrency").value;
      const goal = document.getElementById("regGoal").value;

      // Validations
      if (!fullName.trim()) return showAuthError("Please enter your full name.");
      if (!email.trim() || !email.includes("@")) return showAuthError("Please enter a valid email address.");
      if (password.length < 6) return showAuthError("Password must be at least 6 characters long.");
      if (password !== confirmPassword) return showAuthError("Passwords do not match.");

      try {
        await registerUser({
          fullName, email, password, phone, income, budget, currency, goal
        });
        document.getElementById("authModal").classList.add("hidden");
        showToast("Account created successfully! Welcome to SpendWise.", "success");
        refreshAppView();
      } catch (err) {
        showAuthError(err.message);
      }
    });
  }
}

function openAuthModal(mode = "signin") {
  initAuthModalHTML();
  const modal = document.getElementById("authModal");
  if (modal) {
    switchAuthTab(mode);
    clearAuthError();
    modal.classList.remove("hidden");
  }
}

function switchAuthTab(mode) {
  const tabSignin = document.getElementById("tabSigninBtn");
  const tabRegister = document.getElementById("tabRegisterBtn");
  const formSignin = document.getElementById("signinForm");
  const formRegister = document.getElementById("registerForm");

  clearAuthError();

  if (mode === "signin") {
    if (tabSignin) tabSignin.classList.add("active");
    if (tabRegister) tabRegister.classList.remove("active");
    if (formSignin) formSignin.classList.remove("hidden");
    if (formRegister) formRegister.classList.add("hidden");
  } else {
    if (tabSignin) tabSignin.classList.remove("active");
    if (tabRegister) tabRegister.classList.add("active");
    if (formSignin) formSignin.classList.add("hidden");
    if (formRegister) formRegister.classList.remove("hidden");
  }
}

function showAuthError(msg) {
  const badge = document.getElementById("authErrorBadge");
  if (badge) {
    badge.textContent = msg;
    badge.classList.remove("hidden");
  }
}

function clearAuthError() {
  const badge = document.getElementById("authErrorBadge");
  if (badge) {
    badge.textContent = "";
    badge.classList.add("hidden");
  }
}

/* ----------------- PROFILE PAGE CONTROLLER ----------------- */
function renderProfilePage() {
  const user = getCurrentUser();
  if (!user) {
    // Protected route fallback
    openAuthModal("signin");
    showAuthError("Please sign in to access your profile.");
    return;
  }

  const nameEl = document.getElementById("profileHeaderName");
  const emailEl = document.getElementById("profileHeaderEmail");
  const avatarEl = document.getElementById("profileInitialsAvatar");
  const badgeEl = document.getElementById("profileMemberBadge");
  const fullNameEl = document.getElementById("profileFullName");
  const infoEmailEl = document.getElementById("profileEmail");
  const phoneEl = document.getElementById("profilePhone");
  const incomeEl = document.getElementById("profileIncome");
  const budgetEl = document.getElementById("profileBudget");
  const currencyEl = document.getElementById("profileCurrency");
  const goalEl = document.getElementById("profileGoal");

  if (nameEl) nameEl.textContent = user.fullName;
  if (emailEl) emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = getInitials(user.fullName);
  if (badgeEl) badgeEl.textContent = `Member since ${new Date(user.createdAt).getFullYear()}`;

  if (fullNameEl) fullNameEl.textContent = user.fullName;
  if (infoEmailEl) infoEmailEl.textContent = user.email;
  if (phoneEl) phoneEl.textContent = user.phone || "Not specified";

  if (incomeEl) incomeEl.textContent = formatUserCurrency(user.income);
  if (budgetEl) budgetEl.textContent = formatUserCurrency(user.budget);
  if (currencyEl) currencyEl.textContent = `${user.currency} (${getUserCurrencySymbol()})`;
  if (goalEl) goalEl.textContent = user.goal;
}

function openEditProfileModal() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Sign in required", "error");
    return openAuthModal("signin");
  }

  const modal = document.getElementById("editProfileModal");
  if (!modal) return;

  document.getElementById("editFullName").value = user.fullName;
  document.getElementById("editPhone").value = user.phone || "";
  document.getElementById("editIncome").value = user.income || "";
  document.getElementById("editBudget").value = user.budget || "";
  document.getElementById("editCurrency").value = user.currency || "INR";
  document.getElementById("editGoal").value = user.goal || "Save Money";

  modal.classList.remove("hidden");
}

function setupProfilePage() {
  renderProfilePage();

  const openBtn = document.getElementById("openEditProfileBtn");
  if (openBtn) {
    openBtn.addEventListener("click", openEditProfileModal);
  }

  const closeBtn = document.getElementById("closeEditProfileBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("editProfileModal").classList.add("hidden");
    });
  }

  const editForm = document.getElementById("editProfileForm");
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!getCurrentUser()) {
        showToast("Sign in required", "error");
        openAuthModal("signin");
        return;
      }
      const fullName = document.getElementById("editFullName").value;
      const phone = document.getElementById("editPhone").value;
      const income = document.getElementById("editIncome").value;
      const budgetVal = document.getElementById("editBudget").value;
      const currency = document.getElementById("editCurrency").value;
      const goal = document.getElementById("editGoal").value;

      if (!fullName.trim()) return alert("Full Name cannot be empty.");

      updateUserProfile({
        fullName, phone, income, budget: budgetVal, currency, goal
      });

      document.getElementById("editProfileModal").classList.add("hidden");
      showToast("Profile updated successfully.", "success");
      refreshAppView();
    });
  }
}

function refreshAppView() {
  loadUserData();
  checkMonthlyReset();
  renderTopbarAuthArea();
  if (currentPage === "dashboard") renderDashboard();
  if (currentPage === "history") renderHistory();
  if (currentPage === "analytics") renderAnalytics();
  if (currentPage === "profile") renderProfilePage();
  if (currentPage === "monthly-reports") renderMonthlyReportsPage();
}

/* ----------------- THEME TOGGLE ----------------- */
const THEME_KEY = "spendwiseTheme";

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY) || "light";
  setTheme(savedTheme);

  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
      localStorage.setItem(THEME_KEY, nextTheme);
    });
  }
}

function setTheme(theme) {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  updateThemeButton(theme);
}

function updateThemeButton(theme) {
  const toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.innerHTML = theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
  }
}

// Initialize theme & auth on script load
initTheme();
initAuthModalHTML();
initPdfModalHTML();
renderTopbarAuthArea();
checkAndRunAutomatedMonthlyReport();

/* ----------------- ANIMATION HELPERS ----------------- */
function animateTransactionValue(type, amount, oldTotals) {
  const newTotals = getTotals();

  if (type === "expense") {
    // 1. Animate Total Balance (decreases - red pulse)
    const balanceCard = document.querySelector(".balance-card");
    const balanceEl = document.getElementById("balanceAmount");
    if (balanceCard) {
      balanceCard.classList.remove("card-anim-pulse-red");
      void balanceCard.offsetWidth; // trigger reflow
      balanceCard.classList.add("card-anim-pulse-red");
      setTimeout(() => balanceCard.classList.remove("card-anim-pulse-red"), 850);
    }
    if (balanceEl) {
      animateCounter(balanceEl, oldTotals.balance, newTotals.balance);
    }

    // 2. Animate Total Expenses (increases - red pulse)
    const expenseCard = document.querySelector(".expense-card");
    const expenseEl = document.getElementById("expenseAmount");
    if (expenseCard) {
      expenseCard.classList.remove("card-anim-pulse-red");
      void expenseCard.offsetWidth; // trigger reflow
      expenseCard.classList.add("card-anim-pulse-red");
      setTimeout(() => expenseCard.classList.remove("card-anim-pulse-red"), 850);
    }
    if (expenseEl) {
      animateCounter(expenseEl, oldTotals.expenses, newTotals.expenses);
    }
  } else if (type === "income") {
    // 1. Animate Total Income (increases - green pulse)
    const incomeCard = document.querySelector(".income-card");
    const incomeEl = document.getElementById("incomeAmount");
    if (incomeCard) {
      incomeCard.classList.remove("card-anim-pulse-green");
      void incomeCard.offsetWidth; // trigger reflow
      incomeCard.classList.add("card-anim-pulse-green");
      setTimeout(() => incomeCard.classList.remove("card-anim-pulse-green"), 850);
    }
    if (incomeEl) {
      animateCounter(incomeEl, oldTotals.income, newTotals.income);
    }

    // 2. Animate Total Balance (increases - green pulse)
    const balanceCard = document.querySelector(".balance-card");
    const balanceEl = document.getElementById("balanceAmount");
    if (balanceCard) {
      balanceCard.classList.remove("card-anim-pulse-green");
      void balanceCard.offsetWidth; // trigger reflow
      balanceCard.classList.add("card-anim-pulse-green");
      setTimeout(() => balanceCard.classList.remove("card-anim-pulse-green"), 850);
    }
    if (balanceEl) {
      animateCounter(balanceEl, oldTotals.balance, newTotals.balance);
    }
  }
}

function animateCounter(element, startVal, endVal, duration = 600) {
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const currentVal = startVal + (endVal - startVal) * progress;
    element.textContent = formatCurrency(currentVal);
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = formatCurrency(endVal);
    }
  }
  requestAnimationFrame(update);
}

/* ----------------- AUTOMATED MONTHLY DISPATCH ----------------- */
function checkAndRunAutomatedMonthlyReport() {
  const user = getCurrentUser();
  if (!user || !user.phone) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const isLastDay = now.getDate() === lastDay;
  const isAtOrAfter9PM = now.getHours() >= 21; // 9:00 PM

  if (isLastDay && isAtOrAfter9PM) {
    const storageKey = `spendwise_auto_report_${user.id}_${year}_${month}`;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, "sent");
      showToast("Automated monthly financial report dispatching via WhatsApp (9:00 PM)...", "success");
      setTimeout(() => {
        generateAndSendPDFReport(user.phone, month, year, true);
      }, 1200);
    }
  }
}

/* ----------------- PDF EXPORT MODAL CONTROLLER ----------------- */
function initPdfModalHTML() {
  let modalContainer = document.getElementById("pdfModalContainer");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "pdfModalContainer";
    document.body.appendChild(modalContainer);
  }

  modalContainer.innerHTML = `
    <div class="modal hidden" id="pdfModal">
      <div class="modal-box" style="max-width: 500px;">
        <button class="close-button" id="closePdfModalBtn" type="button">×</button>
        <p class="eyebrow">WHATSAPP REPORT</p>
        <h2>Get reports to whatsapp</h2>
        <p style="color: var(--muted); font-size: 13px; margin-bottom: 16px;">
          Send your complete financial insights & transaction history PDF directly to WhatsApp.
        </p>

        <form id="pdfExportForm">
          <div class="form-group" style="margin-bottom: 14px;">
            <label for="pdfUserPhone">WhatsApp Phone Number *</label>
            <input type="tel" id="pdfUserPhone" required placeholder="+91 XXXXX XXXXX">
          </div>

          <div class="form-row" style="margin-bottom: 18px;">
            <div class="form-group">
              <label for="pdfSelectMonth">Month</label>
              <select id="pdfSelectMonth">
                <option value="all">All Months</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7" selected>August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
              </select>
            </div>

            <div class="form-group">
              <label for="pdfSelectYear">Year</label>
              <select id="pdfSelectYear">
                <option value="2026" selected>2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="all">All Years</option>
              </select>
            </div>
          </div>

          <button class="primary-button" type="submit" style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <span>💬</span> Get reports to whatsapp
          </button>
        </form>
      </div>
    </div>
  `;

  const closeBtn = document.getElementById("closePdfModalBtn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("pdfModal").classList.add("hidden");
    });
  }

  const pdfForm = document.getElementById("pdfExportForm");
  if (pdfForm) {
    pdfForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = document.getElementById("pdfUserPhone").value.trim();
      const month = document.getElementById("pdfSelectMonth").value;
      const year = document.getElementById("pdfSelectYear").value;

      if (!phone) return alert("Please enter phone number.");

      generateAndSendPDFReport(phone, month, year);
      document.getElementById("pdfModal").classList.add("hidden");
    });
  }
}

function openPdfModal() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Sign in required", "error");
    return openAuthModal("signin");
  }

  showToast("Generating PDF report...", "success");

  // Directly display all native sharing options without asking anything
  const phone = user.phone || "";
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  generateAndSendPDFReport(phone, currentMonth, currentYear);
}

function generateAndSendPDFReport(phone, selectedMonth, selectedYear, isAutomated = false) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Sign in required", "error");
    return openAuthModal("signin");
  }

  const allTxs = getUserTransactions();
  const totals = getTotals();

  // Filter transactions by Month and Year if chosen
  const filteredTxs = allTxs.filter(t => {
    if (!t.date) return true;
    const d = new Date(`${t.date}T00:00:00`);
    const matchesMonth = selectedMonth === "all" || d.getMonth() === Number(selectedMonth);
    const matchesYear = selectedYear === "all" || d.getFullYear() === Number(selectedYear);
    return matchesMonth && matchesYear;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Determine Month Name
  const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  let periodText = "COMPLETE FINANCIAL RECORD";
  if (selectedMonth !== "all" && selectedYear !== "all") {
    periodText = `${monthsNames[Number(selectedMonth)]} ${selectedYear}`;
  } else if (selectedYear !== "all") {
    periodText = `YEAR ${selectedYear}`;
  } else if (selectedMonth !== "all") {
    periodText = `MONTH OF ${monthsNames[Number(selectedMonth)]}`;
  }

  // Create temporary container for PDF HTML
  const pdfElem = document.createElement("div");
  pdfElem.className = "pdf-render-container";
  pdfElem.innerHTML = `
    <div class="pdf-header">
      <div class="pdf-logo">
        <span style="color:#0b192c;font-weight:700;">Spend</span><span style="color:#00875a;font-weight:700;">Wise</span>
      </div>
      <div style="font-size:12px;color:#5a6a7e;text-align:right;">
        <div>Official Financial Statement</div>
        <div>Generated: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
      </div>
    </div>

    <div class="pdf-period-badge">
      📌 REPORT PERIOD: <span style="text-decoration:underline;">${periodText}</span>
    </div>

    <div class="pdf-user-card">
      <div>
        <p>Account Holder</p>
        <strong>${escapeHTML(user.fullName)}</strong>
      </div>
      <div>
        <p>WhatsApp Phone</p>
        <strong>${escapeHTML(phone)}</strong>
      </div>
      <div>
        <p>Email Address</p>
        <strong>${escapeHTML(user.email)}</strong>
      </div>
      <div>
        <p>Currency & Goal</p>
        <strong>${user.currency} (${getUserCurrencySymbol()}) · ${escapeHTML(user.goal)}</strong>
      </div>
    </div>

    <h3 style="font-size:16px;margin-bottom:12px;color:#0b192c;border-left:4px solid #00875a;padding-left:8px;">Financial Insights Summary</h3>
    
    <div class="pdf-summary-grid">
      <div class="pdf-summary-card">
        <span>Total Balance</span>
        <strong>${formatCurrency(totals.balance)}</strong>
      </div>
      <div class="pdf-summary-card">
        <span>Total Income</span>
        <strong style="color:#00875a;">${formatCurrency(totals.income)}</strong>
      </div>
      <div class="pdf-summary-card">
        <span>Total Expenses</span>
        <strong style="color:#e05260;">${formatCurrency(totals.expenses)}</strong>
      </div>
    </div>

    <h3 style="font-size:16px;margin-bottom:12px;color:#0b192c;border-left:4px solid #00875a;padding-left:8px;">Complete Transaction History (${filteredTxs.length} records)</h3>

    <table class="pdf-table">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Title</th>
          <th>Category</th>
          <th>Type</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${filteredTxs.length ? filteredTxs.map(t => `
          <tr>
            <td>${formatDateTime(t.date, t.time)}</td>
            <td><strong>${escapeHTML(t.title)}</strong>${t.note ? `<br><small style="color:#64748b">${escapeHTML(t.note)}</small>` : ""}</td>
            <td>${escapeHTML(t.category)}</td>
            <td><span style="font-weight:700;color:${t.type === 'income' ? '#00875a' : '#e05260'}">${t.type.toUpperCase()}</span></td>
            <td><strong style="color:${t.type === 'income' ? '#00875a' : '#e05260'}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</strong></td>
          </tr>
        `).join("") : `<tr><td colspan="5" style="text-align:center;padding:20px;color:#64748b;">No transactions recorded for this period.</td></tr>`}
      </tbody>
    </table>

    <div class="pdf-footer">
      <p>SpendWise Personal Finance Tracker — Confidential Document sent via WhatsApp to ${escapeHTML(phone)}</p>
    </div>
  `;

  document.body.appendChild(pdfElem);

  const fileName = `SpendWise_Report_${periodText.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waMsg = `📊 *SpendWise Financial Report (${periodText})*\n\nHi ${user.fullName},\n\nHere is your financial statement summary:\n💰 Total Balance: ${formatCurrency(totals.balance)}\n📈 Total Income: ${formatCurrency(totals.income)}\n📉 Total Expenses: ${formatCurrency(totals.expenses)}\n\n📎 Attached Document: ${fileName}`;

  const openWhatsAppLink = () => {
    if (cleanPhone) {
      const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, '_blank');
    }
  };

  if (window.html2pdf) {
    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfElem).outputPdf('blob').then(pdfBlob => {
      pdfElem.remove();

      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        navigator.share({
          files: [pdfFile],
          title: `SpendWise Report (${periodText})`,
          text: waMsg
        }).then(() => {
          showToast(`PDF Report attached & sent to WhatsApp (+${cleanPhone})!`, "success");
        }).catch(() => {
          triggerDownloadAndWhatsApp(pdfBlob, fileName, cleanPhone, waMsg);
        });
      } else {
        triggerDownloadAndWhatsApp(pdfBlob, fileName, cleanPhone, waMsg);
      }
    }).catch(err => {
      pdfElem.remove();
      openWhatsAppLink();
      showToast(`PDF Report generated & sent to WhatsApp (+${cleanPhone})!`, "success");
    });
  } else {
    pdfElem.remove();
    openWhatsAppLink();
    showToast(`PDF Report generated & sent to WhatsApp (+${cleanPhone})!`, "success");
  }
}

function triggerDownloadAndWhatsApp(pdfBlob, fileName, cleanPhone, waMsg) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(pdfBlob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (cleanPhone) {
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMsg)}`;
    window.open(waUrl, '_blank');
  }

  showToast(`PDF downloaded & attached in WhatsApp message (+${cleanPhone})!`, "success");
}

window.addEventListener("authChanged", () => {
  refreshAppView();
});

/* ----------------- MONTHLY RESET & ARCHIVE CONTROLLER ----------------- */
function getMonthlyReportsStorageKey(userId) {
  return userId ? `spendwise_monthly_reports_${userId}` : "spendwise_monthly_reports_guest";
}

function getSavedMonthlyReports() {
  const user = getCurrentUser();
  const key = getMonthlyReportsStorageKey(user ? user.id : null);
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveArchivedMonthlyReport(user, txs, monthIndex, year) {
  if (!user || !txs || !txs.length) return;
  const monthsNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = monthsNames[monthIndex];
  const reportId = `report_${year}_${monthIndex}_${Date.now()}`;

  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  const reportObj = {
    id: reportId,
    periodText: `${monthName} ${year}`,
    monthIndex: monthIndex,
    year: year,
    createdDate: new Date().toISOString(),
    totalRecords: txs.length,
    income: income,
    expenses: expenses,
    balance: income - expenses,
    transactions: txs
  };

  const reports = getSavedMonthlyReports();
  const existingIndex = reports.findIndex(r => r.periodText === reportObj.periodText);
  if (existingIndex !== -1) {
    reports[existingIndex] = reportObj;
  } else {
    reports.unshift(reportObj);
  }

  const key = getMonthlyReportsStorageKey(user.id);
  localStorage.setItem(key, JSON.stringify(reports));
}

function checkMonthlyReset() {
  const user = getCurrentUser();
  if (!user) return;

  const now = new Date();
  const currentDay = now.getDate(); // 1..31
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0..11

  const resetKey = `spendwise_last_monthly_reset_${user.id}`;
  const expectedResetId = `${currentYear}_${currentMonth}`;
  const lastReset = localStorage.getItem(resetKey);

  // On the 1st day of every month, clear previous month active data & archive it
  if (currentDay === 1 && lastReset !== expectedResetId) {
    const currentTxs = getUserTransactions();
    if (currentTxs && currentTxs.length > 0) {
      let prevMonthIndex = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonthIndex < 0) {
        prevMonthIndex = 11;
        prevYear = currentYear - 1;
      }
      saveArchivedMonthlyReport(user, currentTxs, prevMonthIndex, prevYear);
    }

    // Reset transactions for the new month so balance, income, expenses, and insights start fresh
    saveUserTransactions([]);
    localStorage.setItem(resetKey, expectedResetId);
    showToast("Welcome to a new month! Previous data saved in Monthly Reports.", "success");
  }
}

function renderMonthlyReportsPage() {
  const container = document.getElementById("monthlyReportsGrid");
  const emptyEl = document.getElementById("monthlyReportsEmpty");
  if (!container) return;

  const reports = getSavedMonthlyReports();

  if (!reports.length) {
    container.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");

  container.innerHTML = reports.map(r => `
    <div class="panel summary-card" style="flex-direction:column;align-items:flex-start;gap:12px;position:relative;">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
        <span class="type-badge income" style="font-size:12px;">📁 ${r.periodText}</span>
        <small style="color:var(--muted);font-size:11px;">${new Date(r.createdDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
      </div>

      <div style="margin:6px 0;">
        <h3 style="font-size:20px;margin-bottom:4px;">${formatCurrency(r.balance)}</h3>
        <p style="font-size:12px;color:var(--muted);">
          Income: <strong style="color:var(--green);">${formatCurrency(r.income)}</strong> · 
          Expenses: <strong style="color:var(--red);">${formatCurrency(r.expenses)}</strong>
        </p>
        <p style="font-size:11px;color:var(--muted);margin-top:2px;">${r.totalRecords} transaction record${r.totalRecords === 1 ? '' : 's'}</p>
      </div>

      <div style="display:flex;gap:8px;width:100%;margin-top:6px;">
        <button class="small-button" type="button" style="flex:1;" onclick="viewArchivedReport('${r.id}')">👁️ View PDF</button>
        <button class="small-button" type="button" style="flex:1;" onclick="downloadArchivedReport('${r.id}')">⬇️ Download</button>
        <button class="small-button" type="button" style="flex:1;" onclick="shareArchivedReport('${r.id}')">💬 Share</button>
      </div>
    </div>
  `).join("");
}

function viewArchivedReport(reportId) {
  const reports = getSavedMonthlyReports();
  const r = reports.find(item => item.id === reportId);
  if (!r) return;
  const user = getCurrentUser();
  generateAndSendPDFReport(user?.phone || '', r.monthIndex, r.year);
}

function downloadArchivedReport(reportId) {
  const reports = getSavedMonthlyReports();
  const r = reports.find(item => item.id === reportId);
  if (!r) return;
  const user = getCurrentUser();
  generateAndSendPDFReport(user?.phone || '', r.monthIndex, r.year);
}

function shareArchivedReport(reportId) {
  const reports = getSavedMonthlyReports();
  const r = reports.find(item => item.id === reportId);
  if (!r) return;
  const user = getCurrentUser();
  generateAndSendPDFReport(user?.phone || '', r.monthIndex, r.year);
}

/* ----------------- PAGE INIT ----------------- */
const currentPage = document.body.dataset.page;

if (currentPage === "dashboard") setupDashboard();
if (currentPage === "history") setupHistory();
if (currentPage === "analytics") setupAnalytics();
if (currentPage === "profile") setupProfilePage();
if (currentPage === "monthly-reports") renderMonthlyReportsPage();

/* ----------------- STORAGE SYNC ----------------- */
window.addEventListener("storage", e => {
  refreshAppView();
});

// Prevent +, -, e, E in all number inputs
document.addEventListener("keydown", e => {
  if (e.target && e.target.type === "number") {
    if (["+", "-", "e", "E"].includes(e.key)) {
      e.preventDefault();
    }
  }
});

// Also listen to the custom event we dispatch after local updates
window.addEventListener("expensesUpdated", () => {
  refreshAppView();
});

/* ----------------- SERVICE WORKER REGISTRATION (PWA) ----------------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").then(reg => {
      console.log("SpendWise Service Worker registered successfully:", reg.scope);
    }).catch(err => {
      console.log("Service Worker registration failed:", err);
    });
  });
}