const STORAGE_KEY = "fittrack-data-v3";

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const SPLIT_PLAN = [
  ["LEGS", "CHEST", "BACK", "SHOULDERS", "ABS", "ARMS", "X"],
  ["X", "LEGS", "CHEST", "BACK + SHOULDERS", "ABS", "ARMS", "X"],
  ["X", "X", "LEGS + ABS", "CHEST", "BACK + SHOULDERS", "ARMS", "X"],
  ["X", "X", "X", "LEGS", "PUSH", "PULL", "X"],
  ["X", "X", "X", "X", "LOWER BODY", "UPPER BODY", "X"],
  ["X", "X", "X", "X", "X", "FULL BODY", "X"],
];

const defaultState = {
  programStartDate: getDateId(new Date()),
  goals: {
    runDailyMiles: 2,
    runDailyMinutes: 18,
    runWeeklyMiles: 14,
    runMonthlyMiles: 60,
    workoutDaysPerWeek: 6,
    workoutSessionsPerMonth: 24,
    foodCalories: 2400,
    foodProtein: 180,
    foodWater: 100,
  },
  dailyLogs: [],
  bodyLogs: [],
};

const goalForm = document.getElementById("goalForm");
const dailyLogForm = document.getElementById("dailyLogForm");
const bodyForm = document.getElementById("bodyForm");
const todayCardEl = document.getElementById("todayCard");
const metricsEl = document.getElementById("metrics");
const historyEl = document.getElementById("history");
const bodyHistoryEl = document.getElementById("bodyHistory");
const planTableEl = document.getElementById("planTable");
const planMetaEl = document.getElementById("planMeta");
const exerciseProgressEl = document.getElementById("exerciseProgress");
const addExerciseBtn = document.getElementById("addExerciseBtn");
const exerciseRowsEl = document.getElementById("exerciseRows");

let state = loadState();

init();

function init() {
  setTodayDefaults();
  hydrateGoalInputs();
  hydrateDailyLogInputs();
  hydrateBodyInputs();

  addExerciseBtn.addEventListener("click", () => addExerciseRow());
  goalForm.addEventListener("submit", onSaveGoals);
  dailyLogForm.addEventListener("submit", onSaveDailyLog);
  bodyForm.addEventListener("submit", onSaveBodyLog);
  document.getElementById("logDate").addEventListener("change", hydrateDailyLogInputs);
  document.getElementById("bodyDate").addEventListener("change", hydrateBodyInputs);

  if (!exerciseRowsEl.children.length) addExerciseRow();
  render();
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      programStartDate: parsed.programStartDate || defaultState.programStartDate,
      goals: { ...defaultState.goals, ...(parsed.goals || {}) },
      dailyLogs: Array.isArray(parsed.dailyLogs) ? parsed.dailyLogs : [],
      bodyLogs: Array.isArray(parsed.bodyLogs) ? parsed.bodyLogs : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setTodayDefaults() {
  const todayId = getDateId(new Date());
  document.getElementById("logDate").value = todayId;
  document.getElementById("bodyDate").value = todayId;
}

function onSaveGoals(event) {
  event.preventDefault();
  state.goals = {
    runDailyMiles: Number(document.getElementById("goalRunDailyMiles").value),
    runDailyMinutes: Number(document.getElementById("goalRunDailyMinutes").value),
    runWeeklyMiles: Number(document.getElementById("goalRunWeeklyMiles").value),
    runMonthlyMiles: Number(document.getElementById("goalRunMonthlyMiles").value),
    workoutDaysPerWeek: Number(document.getElementById("goalWorkoutDaysPerWeek").value),
    workoutSessionsPerMonth: Number(document.getElementById("goalWorkoutSessionsPerMonth").value),
    foodCalories: Number(document.getElementById("goalFoodCalories").value),
    foodProtein: Number(document.getElementById("goalFoodProtein").value),
    foodWater: Number(document.getElementById("goalFoodWater").value),
  };
  persist();
  render();
}

function onSaveDailyLog(event) {
  event.preventDefault();
  const dateId = document.getElementById("logDate").value;
  const exercises = collectExerciseRows();

  const entry = {
    dateId,
    displayDate: formatDate(dateId),
    runMiles: Number(document.getElementById("logRunMiles").value),
    runMinutes: Number(document.getElementById("logRunMinutes").value),
    plannedFocus: document.getElementById("logPlannedFocus").value,
    workoutDone: document.getElementById("logWorkoutDone").value === "yes",
    exercises,
    foodCalories: Number(document.getElementById("logFoodCalories").value),
    foodProtein: Number(document.getElementById("logFoodProtein").value),
    foodWater: Number(document.getElementById("logFoodWater").value),
    notes: document.getElementById("logNotes").value.trim(),
  };

  upsertByDate(state.dailyLogs, entry);
  sortByDateDesc(state.dailyLogs);
  persist();
  render();
}

function onSaveBodyLog(event) {
  event.preventDefault();

  const dateId = document.getElementById("bodyDate").value;
  const photoInput = document.getElementById("bodyPhoto");
  const file = photoInput.files?.[0];

  const bodyEntryBase = {
    dateId,
    displayDate: formatDate(dateId),
    weight: Number(document.getElementById("bodyWeight").value),
    waist: Number(document.getElementById("bodyWaist").value || 0),
    chest: Number(document.getElementById("bodyChest").value || 0),
    arms: Number(document.getElementById("bodyArms").value || 0),
    legs: Number(document.getElementById("bodyLegs").value || 0),
  };

  if (!file) {
    upsertBodyEntry(bodyEntryBase);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    upsertBodyEntry({ ...bodyEntryBase, photoDataUrl: String(reader.result || "") });
    photoInput.value = "";
  };
  reader.readAsDataURL(file);
}

function upsertBodyEntry(entry) {
  const existing = state.bodyLogs.find((item) => item.dateId === entry.dateId);
  if (existing && existing.photoDataUrl && !entry.photoDataUrl) {
    entry.photoDataUrl = existing.photoDataUrl;
  }

  upsertByDate(state.bodyLogs, entry);
  sortByDateDesc(state.bodyLogs);
  persist();
  hydrateBodyInputs();
  render();
}

function hydrateGoalInputs() {
  document.getElementById("goalRunDailyMiles").value = state.goals.runDailyMiles;
  document.getElementById("goalRunDailyMinutes").value = state.goals.runDailyMinutes;
  document.getElementById("goalRunWeeklyMiles").value = state.goals.runWeeklyMiles;
  document.getElementById("goalRunMonthlyMiles").value = state.goals.runMonthlyMiles;
  document.getElementById("goalWorkoutDaysPerWeek").value = state.goals.workoutDaysPerWeek;
  document.getElementById("goalWorkoutSessionsPerMonth").value = state.goals.workoutSessionsPerMonth;
  document.getElementById("goalFoodCalories").value = state.goals.foodCalories;
  document.getElementById("goalFoodProtein").value = state.goals.foodProtein;
  document.getElementById("goalFoodWater").value = state.goals.foodWater;
}

function hydrateDailyLogInputs() {
  const dateId = document.getElementById("logDate").value;
  const existing = state.dailyLogs.find((log) => log.dateId === dateId);
  const plannedFocus = getPlannedFocusForDate(dateId);
  document.getElementById("logPlannedFocus").value = plannedFocus;

  clearExerciseRows();

  if (!existing) {
    document.getElementById("logRunMiles").value = "";
    document.getElementById("logRunMinutes").value = "";
    document.getElementById("logWorkoutDone").value = "no";
    document.getElementById("logFoodCalories").value = "";
    document.getElementById("logFoodProtein").value = "";
    document.getElementById("logFoodWater").value = "";
    document.getElementById("logNotes").value = "";
    addExerciseRow();
    return;
  }

  document.getElementById("logRunMiles").value = existing.runMiles;
  document.getElementById("logRunMinutes").value = existing.runMinutes;
  document.getElementById("logWorkoutDone").value = existing.workoutDone ? "yes" : "no";
  document.getElementById("logFoodCalories").value = existing.foodCalories;
  document.getElementById("logFoodProtein").value = existing.foodProtein;
  document.getElementById("logFoodWater").value = existing.foodWater;
  document.getElementById("logNotes").value = existing.notes || "";

  if (existing.exercises?.length) {
    existing.exercises.forEach((exercise) => addExerciseRow(exercise));
  } else {
    addExerciseRow();
  }
}

function hydrateBodyInputs() {
  const dateId = document.getElementById("bodyDate").value;
  const existing = state.bodyLogs.find((entry) => entry.dateId === dateId);
  if (!existing) {
    document.getElementById("bodyWeight").value = "";
    document.getElementById("bodyWaist").value = "";
    document.getElementById("bodyChest").value = "";
    document.getElementById("bodyArms").value = "";
    document.getElementById("bodyLegs").value = "";
    return;
  }

  document.getElementById("bodyWeight").value = existing.weight;
  document.getElementById("bodyWaist").value = existing.waist || "";
  document.getElementById("bodyChest").value = existing.chest || "";
  document.getElementById("bodyArms").value = existing.arms || "";
  document.getElementById("bodyLegs").value = existing.legs || "";
}

function addExerciseRow(data = {}) {
  const template = document.getElementById("exerciseRowTemplate");
  const row = template.content.firstElementChild.cloneNode(true);

  row.querySelector(".exercise-name").value = data.name || "";
  row.querySelector(".exercise-muscle").value = data.muscle || "legs";
  row.querySelector(".exercise-weight").value = data.weight ?? "";
  row.querySelector(".exercise-reps").value = data.reps ?? "";
  row.querySelector(".exercise-sets").value = data.sets ?? "";

  row.querySelector(".remove-exercise").addEventListener("click", () => {
    row.remove();
    if (!exerciseRowsEl.children.length) addExerciseRow();
  });

  exerciseRowsEl.appendChild(row);
}

function clearExerciseRows() {
  exerciseRowsEl.innerHTML = "";
}

function collectExerciseRows() {
  return Array.from(exerciseRowsEl.querySelectorAll(".exercise-row"))
    .map((row) => ({
      name: row.querySelector(".exercise-name").value.trim(),
      muscle: row.querySelector(".exercise-muscle").value,
      weight: Number(row.querySelector(".exercise-weight").value),
      reps: Number(row.querySelector(".exercise-reps").value),
      sets: Number(row.querySelector(".exercise-sets").value),
    }))
    .filter((item) => item.name && item.weight > 0 && item.reps > 0 && item.sets > 0);
}

function render() {
  renderTodayCard();
  renderMetrics();
  renderPlan();
  renderDailyHistory();
  renderBodyHistory();
  renderExerciseProgress();
}

function renderTodayCard() {
  const todayId = getDateId(new Date());
  const todayLog = state.dailyLogs.find((log) => log.dateId === todayId);
  const focus = getPlannedFocusForDate(todayId);

  todayCardEl.innerHTML = `
    <strong>${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</strong>
    <div>Planned focus: ${focus}</div>
    <div>Run goal: ${state.goals.runDailyMiles} miles</div>
    <div>Log status: ${todayLog ? "Saved" : "Pending"}</div>
  `;
}

function renderMetrics() {
  const todayId = getDateId(new Date());
  const todayLog = state.dailyLogs.find((log) => log.dateId === todayId);

  const weekStats = getPeriodStats("week");
  const monthStats = getPeriodStats("month");

  const cards = [
    metricCard(
      "Running Day Goal",
      `${todayLog?.runMiles || 0} / ${state.goals.runDailyMiles} miles`,
      progressPercent(todayLog?.runMiles || 0, state.goals.runDailyMiles),
      `${todayLog?.runMinutes || 0} min / ${state.goals.runDailyMinutes} min`
    ),
    metricCard(
      "Running Week Goal",
      `${weekStats.runMiles.toFixed(1)} / ${state.goals.runWeeklyMiles} miles`,
      progressPercent(weekStats.runMiles, state.goals.runWeeklyMiles),
      `${weekStats.runDays} run days`
    ),
    metricCard(
      "Running Month Goal",
      `${monthStats.runMiles.toFixed(1)} / ${state.goals.runMonthlyMiles} miles`,
      progressPercent(monthStats.runMiles, state.goals.runMonthlyMiles),
      `${monthStats.runDays} run days`
    ),
    metricCard(
      "Workout Week Goal",
      `${weekStats.workoutDays} / ${state.goals.workoutDaysPerWeek} days`,
      progressPercent(weekStats.workoutDays, state.goals.workoutDaysPerWeek),
      `${weekStats.exerciseCount} exercise entries`
    ),
    metricCard(
      "Workout Month Goal",
      `${monthStats.workoutDays} / ${state.goals.workoutSessionsPerMonth} sessions`,
      progressPercent(monthStats.workoutDays, state.goals.workoutSessionsPerMonth),
      `${monthStats.exerciseCount} exercise entries`
    ),
    metricCard(
      "Food Day Goal",
      `${todayLog?.foodCalories || 0}/${state.goals.foodCalories} cal`,
      progressPercent(todayLog?.foodCalories || 0, state.goals.foodCalories),
      `Protein: ${todayLog?.foodProtein || 0}/${state.goals.foodProtein}g | Water: ${todayLog?.foodWater || 0}/${state.goals.foodWater}oz`
    ),
  ];

  metricsEl.innerHTML = cards.join("");
}

function metricCard(label, value, pct, subtext) {
  return `
    <article class="metric">
      <div class="metric-head">
        <span>${escapeHtml(label)}</span>
        <span>${Math.round(pct)}%</span>
      </div>
      <div>${escapeHtml(value)}</div>
      <div class="metric-sub">${escapeHtml(subtext)}</div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
    </article>
  `;
}

function renderPlan() {
  const now = new Date();
  const currentWeek = getProgramWeekIndex(getDateId(now));
  const currentDayIndex = getWeekDayIndexMonday(now);

  planMetaEl.textContent = `Current cycle week: ${currentWeek + 1} of ${SPLIT_PLAN.length}. Today is ${WEEK_DAYS[currentDayIndex]}.`;

  const header = `<thead><tr><th>Cycle Week</th>${WEEK_DAYS.map((day) => `<th>${day}</th>`).join("")}</tr></thead>`;
  const bodyRows = SPLIT_PLAN.map((row, rowIndex) => {
    const cells = row
      .map((item, dayIndex) => {
        const cellClass = dayIndex === currentDayIndex ? "today-cell" : "";
        return `<td class="${cellClass}">${escapeHtml(item)}</td>`;
      })
      .join("");

    const rowClass = rowIndex === currentWeek ? "current-week-row" : "";
    return `<tr class="${rowClass}"><td>Week ${rowIndex + 1}</td>${cells}</tr>`;
  }).join("");

  planTableEl.innerHTML = `${header}<tbody>${bodyRows}</tbody>`;
}

function renderDailyHistory() {
  if (!state.dailyLogs.length) {
    historyEl.innerHTML = "<p>No logs yet. Save your first day.</p>";
    return;
  }

  historyEl.innerHTML = state.dailyLogs.slice(0, 21).map((log) => {
    const exerciseSummary = log.exercises?.length
      ? log.exercises.map((ex) => `${escapeHtml(ex.name)} ${ex.weight}x${ex.reps} (${ex.sets} sets)`).join(" | ")
      : "No exercises logged";

    return `
      <article class="log-card">
        <div class="log-date">${escapeHtml(log.displayDate)}</div>
        <div>Running: ${log.runMiles} mi in ${log.runMinutes} min</div>
        <div>Workout: ${log.workoutDone ? "Done" : "Missed"} | Focus: ${escapeHtml(log.plannedFocus || "N/A")}</div>
        <div>Food: ${log.foodCalories} cal, ${log.foodProtein}g protein, ${log.foodWater}oz water</div>
        <div class="small">Exercises: ${exerciseSummary}</div>
        ${log.notes ? `<div class="small">Notes: ${escapeHtml(log.notes)}</div>` : ""}
      </article>
    `;
  }).join("");
}

function renderBodyHistory() {
  if (!state.bodyLogs.length) {
    bodyHistoryEl.innerHTML = "<p>No body entries yet.</p>";
    return;
  }

  const cards = state.bodyLogs.slice(0, 14).map((entry) => `
    <article class="log-card">
      <div class="log-date">${escapeHtml(entry.displayDate)}</div>
      <div>Weight: ${entry.weight} lb</div>
      <div class="small">Waist: ${entry.waist || 0} in | Chest: ${entry.chest || 0} in | Arms: ${entry.arms || 0} in | Legs: ${entry.legs || 0} in</div>
    </article>
  `).join("");

  const photos = state.bodyLogs
    .filter((entry) => entry.photoDataUrl)
    .slice(0, 20)
    .map((entry) => `<figure><img src="${entry.photoDataUrl}" alt="Progress photo ${escapeHtml(entry.displayDate)}" /><figcaption class="small">${escapeHtml(entry.displayDate)}</figcaption></figure>`)
    .join("");

  bodyHistoryEl.innerHTML = `${cards}${photos ? `<div class="photo-grid">${photos}</div>` : ""}`;
}

function renderExerciseProgress() {
  const map = buildExerciseProgressMap();
  const names = Object.keys(map).sort((a, b) => a.localeCompare(b));

  if (!names.length) {
    exerciseProgressEl.innerHTML = "<p>Add exercise logs to see baseline vs latest progress.</p>";
    return;
  }

  exerciseProgressEl.innerHTML = names.map((name) => {
    const item = map[name];
    const weightDelta = item.latest.weight - item.baseline.weight;
    const repsDelta = item.latest.reps - item.baseline.reps;

    return `
      <article class="log-card">
        <div class="log-date">${escapeHtml(name)} (${escapeHtml(item.latest.muscle)})</div>
        <div>Baseline: ${item.baseline.weight} lb x ${item.baseline.reps} reps</div>
        <div>Latest: ${item.latest.weight} lb x ${item.latest.reps} reps</div>
        <div class="small">Change: ${formatDelta(weightDelta)} lb, ${formatDelta(repsDelta)} reps</div>
      </article>
    `;
  }).join("");
}

function buildExerciseProgressMap() {
  const progress = {};
  const logsAsc = [...state.dailyLogs].sort((a, b) => (a.dateId > b.dateId ? 1 : -1));

  logsAsc.forEach((log) => {
    (log.exercises || []).forEach((ex) => {
      const key = ex.name.trim().toLowerCase();
      if (!key) return;
      if (!progress[key]) {
        progress[key] = { displayName: ex.name, baseline: ex, latest: ex };
      } else {
        progress[key].latest = ex;
      }
      progress[key].displayName = ex.name;
    });
  });

  const normalized = {};
  Object.values(progress).forEach((item) => {
    normalized[item.displayName] = item;
  });

  return normalized;
}

function getPeriodStats(period) {
  const now = new Date();
  const bounds = period === "week" ? getWeekBoundsMonday(now) : getMonthBounds(now);

  return state.dailyLogs.reduce((stats, log) => {
    const logDate = new Date(log.dateId + "T00:00:00");
    if (logDate < bounds.start || logDate > bounds.end) return stats;

    stats.runMiles += Number(log.runMiles || 0);
    if ((log.runMiles || 0) > 0) stats.runDays += 1;
    if (log.workoutDone) stats.workoutDays += 1;
    stats.exerciseCount += (log.exercises || []).length;
    return stats;
  }, {
    runMiles: 0,
    runDays: 0,
    workoutDays: 0,
    exerciseCount: 0,
  });
}

function getPlannedFocusForDate(dateId) {
  const weekIndex = getProgramWeekIndex(dateId);
  const dayIndex = getWeekDayIndexMonday(new Date(dateId + "T00:00:00"));
  return SPLIT_PLAN[weekIndex][dayIndex];
}

function getProgramWeekIndex(dateId) {
  const start = new Date(state.programStartDate + "T00:00:00");
  const date = new Date(dateId + "T00:00:00");
  const diffDays = Math.floor((date - start) / 86400000);
  if (diffDays <= 0) return 0;
  return Math.floor(diffDays / 7) % SPLIT_PLAN.length;
}

function getWeekDayIndexMonday(date) {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getWeekBoundsMonday(date) {
  const d = new Date(date);
  const day = getWeekDayIndexMonday(d);
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getMonthBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function progressPercent(current, target) {
  if (target <= 0) return 0;
  return Math.min(100, (current / target) * 100);
}

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function upsertByDate(arr, entry) {
  const index = arr.findIndex((item) => item.dateId === entry.dateId);
  if (index >= 0) {
    arr[index] = { ...arr[index], ...entry };
  } else {
    arr.push(entry);
  }
}

function sortByDateDesc(arr) {
  arr.sort((a, b) => (a.dateId < b.dateId ? 1 : -1));
}

function getDateId(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(dateId) {
  return new Date(dateId + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
