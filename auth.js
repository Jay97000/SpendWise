// auth.js - Centralized Authentication & User Data Isolation Manager

const USERS_KEY = "spendwiseUsers";
const SESSION_KEY = "spendwiseActiveUserId";

// Helper: Hash password using SHA-256 via Web Crypto API
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_spendwise_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Helper: Get all registered users from storage
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

// Helper: Save users to storage
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Get Active User ID
function getActiveUserId() {
  return localStorage.getItem(SESSION_KEY);
}

// Get Currently Authenticated User Object
function getCurrentUser() {
  const activeId = getActiveUserId();
  if (!activeId) return null;
  const users = getUsers();
  return users.find(u => u.id === activeId) || null;
}

// Require Sign-In Helper
function requireAuth() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Sign in required", "error");
    if (typeof openAuthModal === "function") {
      openAuthModal("signin");
    }
    throw new Error("Sign in required");
  }
  return user;
}

// Register a New User
async function registerUser(userData) {
  const { fullName, email, password, phone, income, budget, currency, goal } = userData;

  const users = getUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    throw new Error("An account with this email already exists. Please sign in instead.");
  }

  const passwordHash = await hashPassword(password);
  const newUser = {
    id: "usr_" + Date.now(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: passwordHash,
    phone: phone ? phone.trim() : "",
    income: Number(income) || 0,
    budget: Number(budget) || 0,
    currency: currency || "INR",
    goal: goal || "Save Money",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);

  // Auto sign in user after registration
  localStorage.setItem(SESSION_KEY, newUser.id);

  // Migrate any existing unassigned localStorage transactions to this new user
  const legacyStorageKey = "expenseTransactions";
  const legacyBudgetKey = "expenseMonthlyBudget";
  const legacyTxs = JSON.parse(localStorage.getItem(legacyStorageKey));
  const legacyBudget = Number(localStorage.getItem(legacyBudgetKey));

  if (legacyTxs && Array.isArray(legacyTxs) && legacyTxs.length > 0) {
    localStorage.setItem(`spendwise_tx_${newUser.id}`, JSON.stringify(legacyTxs));
    localStorage.removeItem(legacyStorageKey);
  }

  if (legacyBudget > 0 && !newUser.budget) {
    newUser.budget = legacyBudget;
    saveUsers(users);
    localStorage.removeItem(legacyBudgetKey);
  }

  window.dispatchEvent(new Event("authChanged"));
  return newUser;
}

// Login User
async function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error("Incorrect email or password.");
  }

  const hash = await hashPassword(password);
  if (user.passwordHash !== hash) {
    throw new Error("Incorrect email or password.");
  }

  localStorage.setItem(SESSION_KEY, user.id);
  window.dispatchEvent(new Event("authChanged"));
  return user;
}

// Logout User
function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("authChanged"));
}

// Update Active User Profile
function updateUserProfile(updates) {
  requireAuth();
  const activeId = getActiveUserId();

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === activeId);
  if (userIndex === -1) throw new Error("User not found.");

  const user = users[userIndex];
  if (updates.fullName) user.fullName = updates.fullName.trim();
  if (updates.phone !== undefined) user.phone = updates.phone.trim();
  if (updates.income !== undefined) user.income = Number(updates.income) || 0;
  if (updates.budget !== undefined) user.budget = Number(updates.budget) || 0;
  if (updates.currency) user.currency = updates.currency;
  if (updates.goal) user.goal = updates.goal;
  user.updatedAt = new Date().toISOString();

  users[userIndex] = user;
  saveUsers(users);

  window.dispatchEvent(new Event("authChanged"));
  window.dispatchEvent(new Event("expensesUpdated"));
  return user;
}

// User Scoped Storage Keys
function getUserTransactionsKey() {
  const activeId = getActiveUserId();
  return activeId ? `spendwise_tx_${activeId}` : "expenseTransactions";
}

function getUserBudgetKey() {
  const activeId = getActiveUserId();
  return activeId ? `spendwise_budget_${activeId}` : "expenseMonthlyBudget";
}

function getUserTransactions() {
  const key = getUserTransactionsKey();
  return JSON.parse(localStorage.getItem(key)) || [];
}

function saveUserTransactions(transactions) {
  requireAuth();
  const key = getUserTransactionsKey();
  localStorage.setItem(key, JSON.stringify(transactions));
  window.dispatchEvent(new Event("expensesUpdated"));
}

function getUserBudget() {
  const user = getCurrentUser();
  if (user && user.budget !== undefined) {
    return user.budget;
  }
  const key = getUserBudgetKey();
  return Number(localStorage.getItem(key)) || 0;
}

function saveUserBudget(amount) {
  requireAuth();
  const user = getCurrentUser();
  if (user) {
    updateUserProfile({ budget: Number(amount) });
  } else {
    const key = getUserBudgetKey();
    localStorage.setItem(key, amount);
    window.dispatchEvent(new Event("expensesUpdated"));
  }
}

// Currency Symbol Map
const CURRENCY_SYMBOLS = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£"
};

function getUserCurrencySymbol() {
  const user = getCurrentUser();
  const code = user && user.currency ? user.currency : "INR";
  return CURRENCY_SYMBOLS[code] || "₹";
}

function formatUserCurrency(amount) {
  const user = getCurrentUser();
  const code = user && user.currency ? user.currency : "INR";
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(num);
  } catch (e) {
    return `${CURRENCY_SYMBOLS[code] || "₹"}${num.toFixed(2)}`;
  }
}

// Helper: Show Toast Message
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toastContainer";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `<span>${type === "error" ? "⚠️" : "✓"}</span> ${escapeHTML(message)}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHTML(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
