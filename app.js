const STORAGE_KEY = "fittrack-data-v1";

const defaultState = {
  goals: {
    stepsPerDay: 8000,
    workoutsPerWeek: 4,
    waterOzPerDay: 80,
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
  if (!raw) {
    return structuredClone(defaultState);
  }

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
    stepsPerDay: Number(document.getElementById("goalSteps").value),
    workoutsPerWeek: Number(document.getElementById("goalWorkouts").value),
    waterOzPerDay: Number(document.getElementById("goalWater").value),
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
    steps: Number(document.getElementById("logSteps").value),
    workoutCompleted: document.getElementById("logWorkout").value === "yes",
    waterOz: Number(document.getElementById("logWater").value),
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
  document.getElementById("goalSteps").value = state.goals.stepsPerDay;
  document.getElementById("goalWorkouts").value = state.goals.workoutsPerWeek;
  document.getElementById("goalWater").value = state.goals.waterOzPerDay;
}

function hydrateTodayLogInputs() {
  const todayId = getDateId(new Date());
  const todayLog = state.logs.find((log) => log.dateId === todayId);

  if (!todayLog) return;
  document.getElementById("logSteps").value = todayLog.steps;
  document.getElementById("logWorkout").value = todayLog.workoutCompleted ? "yes" : "no";
  document.getElementById("logWater").value = todayLog.waterOz;
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
  const workoutsThisWeek = getWorkoutsThisWeek();

  todayCardEl.innerHTML = `
    <strong>${new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    })}</strong>
    <div>Week workouts: ${workoutsThisWeek}/${state.goals.workoutsPerWeek}</div>
    <div>Today's log: ${todayLog ? "Saved" : "Not yet"}</div>
  `;
}

function renderMetrics() {
  const todayId = getDateId(new Date());
  const todayLog = state.logs.find((log) => log.dateId === todayId);
  const workoutsThisWeek = getWorkoutsThisWeek();

  const stepPct = progressPercent(todayLog?.steps ?? 0, state.goals.stepsPerDay);
  const waterPct = progressPercent(todayLog?.waterOz ?? 0, state.goals.waterOzPerDay);
  const workoutPct = progressPercent(workoutsThisWeek, state.goals.workoutsPerWeek);

  metricsEl.innerHTML = [
    metricCard("Daily Steps", `${todayLog?.steps ?? 0} / ${state.goals.stepsPerDay}`, stepPct),
    metricCard("Daily Water", `${todayLog?.waterOz ?? 0} oz / ${state.goals.waterOzPerDay} oz`, waterPct),
    metricCard("Weekly Workouts", `${workoutsThisWeek} / ${state.goals.workoutsPerWeek}`, workoutPct),
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
      <div>Steps: ${log.steps}</div>
      <div>Workout: ${log.workoutCompleted ? "Yes" : "No"}</div>
      <div>Water: ${log.waterOz} oz</div>
      ${log.notes ? `<div class="log-notes">${escapeHtml(log.notes)}</div>` : ""}
    </article>
  `).join("");
}

function getWorkoutsThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - day);
  sunday.setHours(0, 0, 0, 0);

  return state.logs.filter((log) => {
    if (!log.workoutCompleted) return false;
    const d = new Date(log.dateId);
    return d >= sunday && d <= now;
  }).length;
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
