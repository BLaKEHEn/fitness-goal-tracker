const STORAGE_KEY = "fittrack-data-v2";

const defaultState = {
  goals: {
    runMilesPerWeek: 10,
    runDaysPerWeek: 3,
    workoutSessionsPerWeek: 4,
    workoutMinutesPerWeek: 180,
  },
  logs: [],
};

const goalForm = document.getElementById("goalForm");
const logForm = document.getElementById("logForm");
const metricsEl = document.getElementById("metrics");
const historyEl = document.getElementById("history");
const todayCardEl = document.getElementById("todayCard");

let state = loadState();
init();

function init() {
  hydrateGoalInputs();
  hydrateTodayLogInputs();
  goalForm.addEventListener("submit", onSaveGoals);
  logForm.addEventListener("submit", onSaveLog);
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      goals: { ...defaultState.goals, ...parsed.goals },
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function onSaveGoals(event) {
  event.preventDefault();
  state.goals = {
    runMilesPerWeek: Number(document.getElementById("goalRunMiles").value),
    runDaysPerWeek: Number(document.getElementById("goalRunDays").value),
    workoutSessionsPerWeek: Number(document.getElementById("goalWorkoutSessions").value),
    workoutMinutesPerWeek: Number(document.getElementById("goalWorkoutMinutes").value),
  };
  persist();
  render();
}

function onSaveLog(event) {
  event.preventDefault();
  const todayId = getDateId(new Date());
  const logEntry = {
    dateId: todayId,
    displayDate: new Date().toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    runMiles: Number(document.getElementById("logRunMiles").value),
    runDone: document.getElementById("logRunDone").value === "yes",
    workoutDone: document.getElementById("logWorkoutDone").value === "yes",
    workoutMinutes: Number(document.getElementById("logWorkoutMinutes").value),
    notes: document.getElementById("logNotes").value.trim(),
  };

  const existingIndex = state.logs.findIndex((log) => log.dateId === todayId);
  if (existingIndex >= 0) {
    state.logs[existingIndex] = logEntry;
  } else {
    state.logs.unshift(logEntry);
  }

  state.logs.sort((a, b) => (a.dateId < b.dateId ? 1 : -1));
  persist();
  render();
}

function hydrateGoalInputs() {
  document.getElementById("goalRunMiles").value = state.goals.runMilesPerWeek;
  document.getElementById("goalRunDays").value = state.goals.runDaysPerWeek;
  document.getElementById("goalWorkoutSessions").value = state.goals.workoutSessionsPerWeek;
  document.getElementById("goalWorkoutMinutes").value = state.goals.workoutMinutesPerWeek;
}

function hydrateTodayLogInputs() {
  const todayId = getDateId(new Date());
  const todayLog = state.logs.find((log) => log.dateId === todayId);
  if (!todayLog) return;

  document.getElementById("logRunMiles").value = todayLog.runMiles;
  document.getElementById("logRunDone").value = todayLog.runDone ? "yes" : "no";
  document.getElementById("logWorkoutDone").value = todayLog.workoutDone ? "yes" : "no";
  document.getElementById("logWorkoutMinutes").value = todayLog.workoutMinutes;
  document.getElementById("logNotes").value = todayLog.notes || "";
}

function render() {
  renderTodayCard();
  renderMetrics();
  renderHistory();
}

function renderTodayCard() {
  const todayId = getDateId(new Date());
  const todayLog = state.logs.find((log) => log.dateId === todayId);
  const weekTotals = getWeekTotals();

  todayCardEl.innerHTML = `
    <strong>${new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}</strong>
    <div>Running: ${weekTotals.runDays}/${state.goals.runDaysPerWeek} days</div>
    <div>Workout: ${weekTotals.workoutSessions}/${state.goals.workoutSessionsPerWeek} sessions</div>
    <div>Today's log: ${todayLog ? "Saved" : "Not yet"}</div>
  `;
}

function renderMetrics() {
  const weekTotals = getWeekTotals();

  const runMilesPct = progressPercent(weekTotals.runMiles, state.goals.runMilesPerWeek);
  const runDaysPct = progressPercent(weekTotals.runDays, state.goals.runDaysPerWeek);
  const workoutSessionsPct = progressPercent(weekTotals.workoutSessions, state.goals.workoutSessionsPerWeek);
  const workoutMinutesPct = progressPercent(weekTotals.workoutMinutes, state.goals.workoutMinutesPerWeek);

  metricsEl.innerHTML = [
    metricCard("Running: Miles This Week", `${weekTotals.runMiles.toFixed(1)} / ${state.goals.runMilesPerWeek}`, runMilesPct),
    metricCard("Running: Days This Week", `${weekTotals.runDays} / ${state.goals.runDaysPerWeek}`, runDaysPct),
    metricCard("Workout: Sessions This Week", `${weekTotals.workoutSessions} / ${state.goals.workoutSessionsPerWeek}`, workoutSessionsPct),
    metricCard("Workout: Minutes This Week", `${weekTotals.workoutMinutes} / ${state.goals.workoutMinutesPerWeek}`, workoutMinutesPct),
  ].join("");
}

function metricCard(label, value, pct) {
  return `
    <article class="metric">
      <div class="metric-head">
        <span>${label}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      <div>${value}</div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
    </article>
  `;
}

function renderHistory() {
  if (!state.logs.length) {
    historyEl.innerHTML = "<p>No logs yet. Save your first day to start tracking.</p>";
    return;
  }

  historyEl.innerHTML = state.logs.slice(0, 14).map((log) => `
    <article class="log-card">
      <div class="log-date">${log.displayDate}</div>
      <div>Running: ${log.runDone ? "Done" : "No run"} (${log.runMiles.toFixed(1)} mi)</div>
      <div>Workout: ${log.workoutDone ? "Done" : "No workout"} (${log.workoutMinutes} min)</div>
      ${log.notes ? `<div class="log-notes">${escapeHtml(log.notes)}</div>` : ""}
    </article>
  `).join("");
}

function getWeekTotals() {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  return state.logs.reduce((totals, log) => {
    const d = new Date(log.dateId);
    if (d < sunday || d > now) return totals;

    totals.runMiles += Number(log.runMiles || 0);
    if (log.runDone) totals.runDays += 1;
    if (log.workoutDone) totals.workoutSessions += 1;
    totals.workoutMinutes += Number(log.workoutMinutes || 0);
    return totals;
  }, {
    runMiles: 0,
    runDays: 0,
    workoutSessions: 0,
    workoutMinutes: 0,
  });
}

function progressPercent(current, target) {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function getDateId(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
