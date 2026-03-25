import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_CONFIG = {
  appName: "Swing Trade Tracker",
  currency: "USD",
  authMode: "supabase",
  demoAuth: {
    username: "trader",
    password: "change-me",
  },
  supabase: {
    url: "",
    anonKey: "",
    table: "trades",
  },
};

const APP_CONFIG = {
  ...DEFAULT_CONFIG,
  ...(window.APP_CONFIG || {}),
  demoAuth: {
    ...DEFAULT_CONFIG.demoAuth,
    ...((window.APP_CONFIG && window.APP_CONFIG.demoAuth) || {}),
  },
  supabase: {
    ...DEFAULT_CONFIG.supabase,
    ...((window.APP_CONFIG && window.APP_CONFIG.supabase) || {}),
  },
};

document.title = APP_CONFIG.appName;

const authShell = document.getElementById("auth-shell");
const authForm = document.getElementById("auth-form");
const authMessage = document.getElementById("auth-message");
const appShell = document.getElementById("app-shell");

const tradeForm = document.getElementById("trade-form");
const openTradesContainer = document.getElementById("open-trades");
const closedTradesContainer = document.getElementById("closed-trades");
const statsGrid = document.getElementById("stats-grid");
const insightsContainer = document.getElementById("insights");
const exitDialog = document.getElementById("exit-dialog");
const exitForm = document.getElementById("exit-form");
const exitTitle = document.getElementById("exit-title");
const tradeCardTemplate = document.getElementById("trade-card-template");
const storageBadge = document.getElementById("storage-badge");

const focusEntryButton = document.getElementById("focus-entry");
const seedDemoButton = document.getElementById("seed-demo");
const exportJsonButton = document.getElementById("export-json");
const exportCsvButton = document.getElementById("export-csv");
const resetButton = document.getElementById("reset-data");
const logoutButton = document.getElementById("logout-button");
const closeDialogButton = document.getElementById("close-dialog");
const cancelExitButton = document.getElementById("cancel-exit");

const SESSION_KEY = "swing-trade-session";
const DEMO_STORAGE_KEY = "swing-trade-demo-data";
const today = new Date().toISOString().split("T")[0];

document.getElementById("entryDate").value = today;
document.getElementById("exitDate").value = today;

let supabase = null;
let activeUser = null;
let trades = [];
let tradeToExit = null;

if (APP_CONFIG.authMode === "supabase") {
  const { url, anonKey } = APP_CONFIG.supabase;
  if (url && anonKey) {
    supabase = createClient(url, anonKey);
  } else {
    authMessage.textContent = "Supabase is not configured yet. Update config.js.";
  }
}

function setStorageBadge(message, error = false) {
  storageBadge.textContent = message;
  storageBadge.classList.toggle("badge-error", error);
}

function setAuthMessage(message, error = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("auth-error", error);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: APP_CONFIG.currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function calculateOpenRisk(trade) {
  if (!trade.stopLoss) return null;
  const riskPerShare = Number(trade.entryPrice) - Number(trade.stopLoss);
  return riskPerShare > 0 ? riskPerShare * Number(trade.quantity) : null;
}

function calculateNetPnL(trade) {
  if (!trade.exitPrice) return 0;
  const gross = (Number(trade.exitPrice) - Number(trade.entryPrice)) * Number(trade.quantity);
  return gross - Number(trade.entryFees || 0) - Number(trade.exitFees || 0);
}

function calculateReturnPercent(trade) {
  if (!trade.exitPrice) return 0;
  const costBasis = Number(trade.entryPrice) * Number(trade.quantity);
  return costBasis ? (calculateNetPnL(trade) / costBasis) * 100 : 0;
}

function calculateHoldingDays(trade) {
  if (!trade.exitDate) return null;
  const entry = new Date(trade.entryDate);
  const exit = new Date(trade.exitDate);
  const difference = exit.getTime() - entry.getTime();
  return Math.max(1, Math.round(difference / (1000 * 60 * 60 * 24)));
}

function buildMetric(label, value, className = "") {
  return `
    <div class="metric-chip">
      <span class="metric-label">${label}</span>
      <span class="metric-value ${className}">${value}</span>
    </div>
  `;
}

function getClosedTrades() {
  return trades.filter((trade) => trade.status === "closed");
}

function getOpenTrades() {
  return trades.filter((trade) => trade.status === "open");
}

function calculateStats() {
  const closedTrades = getClosedTrades();
  const openTrades = getOpenTrades();
  const totalNet = closedTrades.reduce((sum, trade) => sum + calculateNetPnL(trade), 0);
  const totalFees = trades.reduce((sum, trade) => sum + Number(trade.entryFees || 0) + Number(trade.exitFees || 0), 0);
  const winners = closedTrades.filter((trade) => calculateNetPnL(trade) > 0);
  const losers = closedTrades.filter((trade) => calculateNetPnL(trade) <= 0);
  const grossWins = winners.reduce((sum, trade) => sum + calculateNetPnL(trade), 0);
  const grossLosses = losers.reduce((sum, trade) => sum + calculateNetPnL(trade), 0);
  const avgWin = winners.length ? grossWins / winners.length : 0;
  const avgLoss = losers.length ? grossLosses / losers.length : 0;
  const profitFactor = Math.abs(grossLosses) > 0 ? grossWins / Math.abs(grossLosses) : grossWins;
  const winRate = closedTrades.length ? (winners.length / closedTrades.length) * 100 : 0;
  const averageHold = closedTrades.length
    ? closedTrades.reduce((sum, trade) => sum + calculateHoldingDays(trade), 0) / closedTrades.length
    : 0;

  return {
    totalNet,
    totalFees,
    openCount: openTrades.length,
    closedCount: closedTrades.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    averageHold,
  };
}

function renderStats() {
  const stats = calculateStats();
  const cards = [
    {
      title: "Net Realized P&L",
      value: formatCurrency(stats.totalNet),
      note: `${stats.closedCount} closed trades reviewed`,
      className: stats.totalNet >= 0 ? "profit" : "loss",
    },
    {
      title: "Win Rate",
      value: formatPercent(stats.winRate),
      note: `${stats.openCount} trades currently open`,
      className: stats.winRate >= 50 ? "profit" : "",
    },
    {
      title: "Average Win / Loss",
      value: `${formatCurrency(stats.avgWin)} / ${formatCurrency(stats.avgLoss)}`,
      note: "Measures payoff quality",
      className: "",
    },
    {
      title: "Profit Factor",
      value: Number(stats.profitFactor || 0).toFixed(2),
      note: "Gross wins divided by gross losses",
      className: stats.profitFactor >= 1.5 ? "profit" : "",
    },
    {
      title: "Total Fees",
      value: formatCurrency(stats.totalFees),
      note: "Entry plus exit costs",
      className: "",
    },
    {
      title: "Average Hold Time",
      value: `${Number(stats.averageHold || 0).toFixed(1)} days`,
      note: "Shows how long your swing trades last",
      className: "",
    },
  ];

  statsGrid.innerHTML = cards.map((card) => `
    <article class="stat-card">
      <h3>${card.title}</h3>
      <div class="stat-value ${card.className}">${card.value}</div>
      <div class="stat-note">${card.note}</div>
    </article>
  `).join("");
}

function createTradeCard(trade) {
  const fragment = tradeCardTemplate.content.cloneNode(true);
  const symbol = fragment.querySelector(".trade-symbol");
  const meta = fragment.querySelector(".trade-meta");
  const pill = fragment.querySelector(".trade-pill");
  const metrics = fragment.querySelector(".trade-metrics");
  const notes = fragment.querySelector(".trade-notes");
  const actions = fragment.querySelector(".trade-actions");

  symbol.textContent = trade.symbol;
  meta.textContent = `${trade.platform} | Entered ${trade.entryDate} | Qty ${trade.quantity} @ ${formatCurrency(trade.entryPrice)}`;
  notes.textContent = trade.status === "closed"
    ? trade.exitNotes || trade.notes || "No notes captured for this trade."
    : trade.notes || "No thesis or notes recorded yet.";

  if (trade.status === "open") {
    pill.textContent = "Open";
    const risk = calculateOpenRisk(trade);
    metrics.innerHTML = [
      buildMetric("Entry fees", formatCurrency(trade.entryFees)),
      buildMetric("Position size", formatCurrency(Number(trade.entryPrice) * Number(trade.quantity))),
      buildMetric("Target", trade.targetPrice ? formatCurrency(trade.targetPrice) : "Not set"),
      buildMetric("Risk to stop", risk ? formatCurrency(risk) : "Not set"),
    ].join("");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button compact";
    button.textContent = "Exit Trade";
    button.addEventListener("click", () => openExitDialog(trade.id));
    actions.append(button);
  } else {
    const pnl = calculateNetPnL(trade);
    pill.textContent = trade.outcomeTag || "Closed";
    pill.classList.toggle("profit", pnl > 0);
    pill.classList.toggle("loss", pnl <= 0);
    metrics.innerHTML = [
      buildMetric("Net P&L", formatCurrency(pnl), pnl >= 0 ? "profit" : "loss"),
      buildMetric("Return", formatPercent(calculateReturnPercent(trade)), pnl >= 0 ? "profit" : "loss"),
      buildMetric("Holding period", `${calculateHoldingDays(trade)} days`),
      buildMetric("Total fees", formatCurrency(Number(trade.entryFees || 0) + Number(trade.exitFees || 0))),
    ].join("");
  }

  return fragment;
}

function renderTradeLists() {
  const openTrades = getOpenTrades();
  const closedTrades = getClosedTrades().sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate));

  openTradesContainer.classList.toggle("empty-state", openTrades.length === 0);
  closedTradesContainer.classList.toggle("empty-state", closedTrades.length === 0);

  if (!openTrades.length) {
    openTradesContainer.innerHTML = `<div class="empty-message">No open trades yet. Add a position to start tracking your swing ideas.</div>`;
  } else {
    openTradesContainer.innerHTML = "";
    openTrades
      .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
      .forEach((trade) => openTradesContainer.append(createTradeCard(trade)));
  }

  if (!closedTrades.length) {
    closedTradesContainer.innerHTML = `<div class="empty-message">Closed trades will appear here with realized P&amp;L, return, and holding period.</div>`;
  } else {
    closedTradesContainer.innerHTML = "";
    closedTrades.forEach((trade) => closedTradesContainer.append(createTradeCard(trade)));
  }
}

function renderInsights() {
  const closedTrades = getClosedTrades();
  const stats = calculateStats();
  const bestTrade = [...closedTrades].sort((a, b) => calculateNetPnL(b) - calculateNetPnL(a))[0];
  const worstTrade = [...closedTrades].sort((a, b) => calculateNetPnL(a) - calculateNetPnL(b))[0];
  const setups = closedTrades.reduce((accumulator, trade) => {
    if (!trade.setup) return accumulator;
    accumulator[trade.setup] = (accumulator[trade.setup] || 0) + calculateNetPnL(trade);
    return accumulator;
  }, {});
  const bestSetup = Object.entries(setups).sort((a, b) => b[1] - a[1])[0];

  const insightCards = [
    {
      title: "Best performer",
      body: bestTrade
        ? `${bestTrade.symbol} delivered ${formatCurrency(calculateNetPnL(bestTrade))} with a ${formatPercent(calculateReturnPercent(bestTrade))} return.`
        : "Close a few trades to see which ideas are producing your best outcomes.",
    },
    {
      title: "Risk discipline",
      body: stats.totalFees > Math.abs(stats.totalNet) && closedTrades.length
        ? "Fees are taking a big share of results. Review position sizing and overtrading."
        : "Use the stop-loss and target fields before every entry so each trade has a plan before money is at risk.",
    },
    {
      title: "Improvement prompt",
      body: worstTrade
        ? `${worstTrade.symbol} was your toughest trade at ${formatCurrency(calculateNetPnL(worstTrade))}. Re-read the notes and check whether the loss came from setup quality, execution, or discipline.`
        : "Capture thesis and exit notes consistently. Journaling is often where edge compounds.",
    },
    {
      title: "Setup edge",
      body: bestSetup
        ? `${bestSetup[0]} is your strongest recorded setup so far, contributing ${formatCurrency(bestSetup[1])}.`
        : "Tag each trade with a setup type so you can compare what actually works for you.",
    },
    {
      title: "Payoff quality",
      body: closedTrades.length
        ? `Your average winner is ${formatCurrency(stats.avgWin)} and average loser is ${formatCurrency(stats.avgLoss)}. Strong traders protect this spread relentlessly.`
        : "Once trades are closed, this section will compare your average win and average loss.",
    },
    {
      title: "Process focus",
      body: "Aim for planned entries, predefined exits, disciplined sizing, and a weekly review of your journal. The best systems reward consistency more than prediction.",
    },
  ];

  insightsContainer.innerHTML = insightCards.map((item) => `
    <article class="insight-card">
      <h3>${item.title}</h3>
      <p>${item.body}</p>
    </article>
  `).join("");
}

function renderApp() {
  renderStats();
  renderTradeLists();
  renderInsights();
}

function escapeCsv(value) {
  const safe = value === null || value === undefined ? "" : String(value);
  return `"${safe.replace(/"/g, "\"\"")}"`;
}

function buildCsv() {
  const headers = [
    "id",
    "status",
    "symbol",
    "entryPrice",
    "quantity",
    "platform",
    "entryFees",
    "entryDate",
    "stopLoss",
    "targetPrice",
    "setup",
    "conviction",
    "notes",
    "exitPrice",
    "exitFees",
    "exitDate",
    "outcomeTag",
    "exitNotes",
  ];

  const rows = trades.map((trade) => headers.map((header) => escapeCsv(trade[header])));
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function downloadTextFile(fileName, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadTrades() {
  if (APP_CONFIG.authMode === "supabase") {
    const { data, error } = await supabase
      .from(APP_CONFIG.supabase.table)
      .select("*")
      .order("entry_date", { ascending: false });

    if (error) throw error;

    trades = data.map(mapTradeFromDb);
    setStorageBadge("Synced with Supabase");
    renderApp();
    return;
  }

  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  trades = raw ? JSON.parse(raw) : [];
  setStorageBadge("Saved in this browser only", true);
  renderApp();
}

async function saveTrades() {
  if (APP_CONFIG.authMode === "supabase") {
    const { error: deleteError } = await supabase
      .from(APP_CONFIG.supabase.table)
      .delete()
      .eq("user_id", activeUser.id);

    if (deleteError) throw deleteError;

    if (!trades.length) {
      setStorageBadge("Synced with Supabase");
      return;
    }

    const payload = trades.map(mapTradeToDb);
    const { error } = await supabase
      .from(APP_CONFIG.supabase.table)
      .insert(payload);

    if (error) throw error;

    setStorageBadge("Synced with Supabase");
    return;
  }

  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(trades));
  setStorageBadge("Saved in this browser only", true);
}

function mapTradeFromDb(row) {
  return {
    id: row.id,
    status: row.status,
    symbol: row.symbol,
    entryPrice: row.entry_price,
    quantity: row.quantity,
    platform: row.platform,
    entryFees: row.entry_fees,
    entryDate: row.entry_date,
    stopLoss: row.stop_loss,
    targetPrice: row.target_price,
    setup: row.setup,
    conviction: row.conviction,
    notes: row.notes,
    exitPrice: row.exit_price,
    exitFees: row.exit_fees,
    exitDate: row.exit_date,
    exitNotes: row.exit_notes,
    outcomeTag: row.outcome_tag,
  };
}

function mapTradeToDb(trade) {
  return {
    id: trade.id,
    user_id: activeUser.id,
    status: trade.status,
    symbol: trade.symbol,
    entry_price: trade.entryPrice,
    quantity: trade.quantity,
    platform: trade.platform,
    entry_fees: trade.entryFees,
    entry_date: trade.entryDate,
    stop_loss: trade.stopLoss,
    target_price: trade.targetPrice,
    setup: trade.setup,
    conviction: trade.conviction,
    notes: trade.notes,
    exit_price: trade.exitPrice,
    exit_fees: trade.exitFees,
    exit_date: trade.exitDate,
    exit_notes: trade.exitNotes,
    outcome_tag: trade.outcomeTag,
  };
}

function resetExitForm() {
  tradeToExit = null;
  exitForm.reset();
  document.getElementById("exitDate").value = today;
}

function openExitDialog(tradeId) {
  const trade = trades.find((item) => item.id === tradeId);
  if (!trade) return;

  tradeToExit = tradeId;
  exitTitle.textContent = `Close ${trade.symbol}`;
  document.getElementById("exitPrice").value = "";
  document.getElementById("exitFees").value = "0";
  document.getElementById("exitDate").value = today;
  document.getElementById("exitNotes").value = "";
  document.getElementById("outcomeTag").value = "Manual exit";
  exitDialog.showModal();
}

async function persistAndRender() {
  setStorageBadge("Saving...");
  await saveTrades();
  renderApp();
}

function showApp() {
  authShell.hidden = true;
  appShell.hidden = false;
}

function showAuth() {
  authShell.hidden = false;
  appShell.hidden = true;
}

async function loginWithSupabase(email, password) {
  if (!supabase) {
    throw new Error("Supabase is not configured. Update config.js first.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  activeUser = data.user;
  sessionStorage.setItem(SESSION_KEY, "supabase");
}

function loginWithDemo(username, password) {
  if (username !== APP_CONFIG.demoAuth.username || password !== APP_CONFIG.demoAuth.password) {
    throw new Error("Invalid demo username or password.");
  }

  activeUser = { id: "demo-user" };
  sessionStorage.setItem(SESSION_KEY, "demo");
}

async function restoreSession() {
  if (APP_CONFIG.authMode === "supabase") {
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      activeUser = data.session.user;
      return true;
    }

    return false;
  }

  if (sessionStorage.getItem(SESSION_KEY) === "demo") {
    activeUser = { id: "demo-user" };
    return true;
  }

  return false;
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(authForm);
  const email = formData.get("email").toString().trim();
  const password = formData.get("password").toString();

  setAuthMessage("Signing in...");

  try {
    if (APP_CONFIG.authMode === "supabase") {
      await loginWithSupabase(email, password);
    } else {
      loginWithDemo(email, password);
    }

    await loadTrades();
    showApp();
    setAuthMessage("");
  } catch (error) {
    setAuthMessage(error.message || "Unable to sign in.", true);
  }
});

tradeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(tradeForm);

  const trade = {
    id: crypto.randomUUID(),
    status: "open",
    symbol: formData.get("symbol").toString().trim().toUpperCase(),
    entryPrice: Number(formData.get("entryPrice")),
    quantity: Number(formData.get("quantity")),
    platform: formData.get("platform").toString().trim(),
    entryFees: Number(formData.get("entryFees")),
    entryDate: formData.get("entryDate"),
    stopLoss: formData.get("stopLoss") ? Number(formData.get("stopLoss")) : null,
    targetPrice: formData.get("targetPrice") ? Number(formData.get("targetPrice")) : null,
    setup: formData.get("setup").toString().trim(),
    conviction: formData.get("conviction") ? Number(formData.get("conviction")) : null,
    notes: formData.get("notes").toString().trim(),
    exitPrice: null,
    exitFees: 0,
    exitDate: null,
    exitNotes: "",
    outcomeTag: "",
  };

  trades.unshift(trade);
  tradeForm.reset();
  document.getElementById("entryDate").value = today;

  try {
    await persistAndRender();
  } catch (error) {
    setStorageBadge(error.message || "Save failed", true);
  }
});

exitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!tradeToExit) return;

  const formData = new FormData(exitForm);
  trades = trades.map((trade) => {
    if (trade.id !== tradeToExit) return trade;
    return {
      ...trade,
      status: "closed",
      exitPrice: Number(formData.get("exitPrice")),
      exitFees: Number(formData.get("exitFees")),
      exitDate: formData.get("exitDate"),
      exitNotes: formData.get("exitNotes").toString().trim(),
      outcomeTag: formData.get("outcomeTag").toString(),
    };
  });

  exitDialog.close();
  resetExitForm();

  try {
    await persistAndRender();
  } catch (error) {
    setStorageBadge(error.message || "Save failed", true);
  }
});

focusEntryButton.addEventListener("click", () => {
  document.getElementById("symbol").focus();
  document.getElementById("symbol").scrollIntoView({ behavior: "smooth", block: "center" });
});

seedDemoButton.addEventListener("click", async () => {
  if (trades.length) return;

  trades = [
    {
      id: crypto.randomUUID(),
      status: "open",
      symbol: "NVDA",
      entryPrice: 905,
      quantity: 8,
      platform: "IBKR",
      entryFees: 4.5,
      entryDate: today,
      stopLoss: 872,
      targetPrice: 975,
      setup: "Momentum breakout",
      conviction: 4,
      notes: "Strong earnings continuation with volume expansion.",
      exitPrice: null,
      exitFees: 0,
      exitDate: null,
      exitNotes: "",
      outcomeTag: "",
    },
    {
      id: crypto.randomUUID(),
      status: "closed",
      symbol: "MSFT",
      entryPrice: 412,
      quantity: 15,
      platform: "Zerodha",
      entryFees: 3.5,
      entryDate: "2026-03-10",
      stopLoss: 398,
      targetPrice: 438,
      setup: "Pullback to support",
      conviction: 5,
      notes: "Weekly uptrend intact and price reclaimed 20 EMA.",
      exitPrice: 437,
      exitFees: 3.5,
      exitDate: "2026-03-17",
      exitNotes: "Exited into planned target zone.",
      outcomeTag: "Target hit",
    },
    {
      id: crypto.randomUUID(),
      status: "closed",
      symbol: "TSLA",
      entryPrice: 188,
      quantity: 20,
      platform: "Robinhood",
      entryFees: 1,
      entryDate: "2026-03-02",
      stopLoss: 179,
      targetPrice: 205,
      setup: "Base breakout",
      conviction: 3,
      notes: "Took early breakout before follow-through confirmed.",
      exitPrice: 180,
      exitFees: 1,
      exitDate: "2026-03-05",
      exitNotes: "Stopped out after support failed.",
      outcomeTag: "Stopped out",
    },
  ];

  try {
    await persistAndRender();
  } catch (error) {
    setStorageBadge(error.message || "Save failed", true);
  }
});

exportJsonButton.addEventListener("click", () => {
  downloadTextFile("swing-trades.json", "application/json", JSON.stringify({ trades }, null, 2));
});

exportCsvButton.addEventListener("click", () => {
  downloadTextFile("swing-trades.csv", "text/csv;charset=utf-8", buildCsv());
});

resetButton.addEventListener("click", async () => {
  const shouldReset = window.confirm("Delete all saved trades?");
  if (!shouldReset) return;

  trades = [];

  try {
    await persistAndRender();
  } catch (error) {
    setStorageBadge(error.message || "Reset failed", true);
  }
});

logoutButton.addEventListener("click", async () => {
  if (APP_CONFIG.authMode === "supabase" && supabase) {
    await supabase.auth.signOut();
  }

  sessionStorage.removeItem(SESSION_KEY);
  activeUser = null;
  trades = [];
  showAuth();
  setAuthMessage("");
});

closeDialogButton.addEventListener("click", () => {
  exitDialog.close();
  resetExitForm();
});

cancelExitButton.addEventListener("click", () => {
  exitDialog.close();
  resetExitForm();
});

exitDialog.addEventListener("close", resetExitForm);

async function init() {
  const restored = await restoreSession();

  if (restored) {
    try {
      await loadTrades();
      showApp();
      return;
    } catch (error) {
      setAuthMessage(error.message || "Unable to load trades.", true);
    }
  }

  showAuth();

  if (APP_CONFIG.authMode === "demo") {
    setAuthMessage("Demo mode is active. This is not secure for real private data.");
  } else {
    setAuthMessage("Use your Supabase email and password.");
  }
}

init();
