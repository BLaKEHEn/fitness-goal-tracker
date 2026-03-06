const STORAGE_KEY = "fittrack-data-v4";
const SIDEBAR_PREF_KEY = "fittrack-sidebar-collapsed";
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
  customExerciseGoals: {},
  dailyLogs: [],
  bodyLogs: [],
};

let state = loadState();

init();

function init() {
  initShell();
  setActiveNav();
  bindGoalForms();
  bindRunningPage();
  bindWorkoutPage();
  bindNutritionPage();
  bindBodyPage();
  renderAll();
}

function initShell() {
  const toggle = document.getElementById("sidebarToggle");
  const overlay = document.getElementById("sidebarOverlay");

  if (window.innerWidth > 1024 && localStorage.getItem(SIDEBAR_PREF_KEY) === "1") {
    document.body.classList.add("sidebar-collapsed");
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (window.innerWidth <= 1024) {
        document.body.classList.toggle("sidebar-open");
        return;
      }

      document.body.classList.toggle("sidebar-collapsed");
      const isCollapsed = document.body.classList.contains("sidebar-collapsed");
      localStorage.setItem(SIDEBAR_PREF_KEY, isCollapsed ? "1" : "0");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", () => {
      document.body.classList.remove("sidebar-open");
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1024) {
      document.body.classList.remove("sidebar-open");
    }
  });
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);

  try {
    const parsed = JSON.parse(raw);
    return {
      programStartDate: parsed.programStartDate || defaultState.programStartDate,
      goals: { ...defaultState.goals, ...(parsed.goals || {}) },
      customExerciseGoals: parsed.customExerciseGoals || {},
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

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll(".side-nav a").forEach((link) => {
    if (link.dataset.page === page) link.classList.add("active");
  });
}

function bindGoalForms() {
  bindRunGoalForm();
  bindWorkoutGoalForm();
  bindNutritionGoalForm();
}

function bindRunGoalForm() {
  const form = document.getElementById("runGoalForm");
  if (!form) return;

  setValue("runGoalDailyMiles", state.goals.runDailyMiles);
  setValue("runGoalDailyMinutes", state.goals.runDailyMinutes);
  setValue("runGoalWeeklyMiles", state.goals.runWeeklyMiles);
  setValue("runGoalMonthlyMiles", state.goals.runMonthlyMiles);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.goals.runDailyMiles = Number(getValue("runGoalDailyMiles"));
    state.goals.runDailyMinutes = Number(getValue("runGoalDailyMinutes"));
    state.goals.runWeeklyMiles = Number(getValue("runGoalWeeklyMiles"));
    state.goals.runMonthlyMiles = Number(getValue("runGoalMonthlyMiles"));
    persist();
    renderAll();
  });
}

function bindWorkoutGoalForm() {
  const form = document.getElementById("workoutGoalForm");
  if (!form) return;

  setValue("workoutGoalDaysPerWeek", state.goals.workoutDaysPerWeek);
  setValue("workoutGoalSessionsPerMonth", state.goals.workoutSessionsPerMonth);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.goals.workoutDaysPerWeek = Number(getValue("workoutGoalDaysPerWeek"));
    state.goals.workoutSessionsPerMonth = Number(getValue("workoutGoalSessionsPerMonth"));
    persist();
    renderAll();
  });
}

function bindNutritionGoalForm() {
  const form = document.getElementById("nutritionGoalForm");
  if (!form) return;

  setValue("nutritionGoalCalories", state.goals.foodCalories);
  setValue("nutritionGoalProtein", state.goals.foodProtein);
  setValue("nutritionGoalWater", state.goals.foodWater);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.goals.foodCalories = Number(getValue("nutritionGoalCalories"));
    state.goals.foodProtein = Number(getValue("nutritionGoalProtein"));
    state.goals.foodWater = Number(getValue("nutritionGoalWater"));
    persist();
    renderAll();
  });
}

function bindRunningPage() {
  const form = document.getElementById("runLogForm");
  if (!form) return;

  const dateInput = document.getElementById("runDate");
  dateInput.value = getDateId(new Date());
  hydrateRunLogInputs();

  dateInput.addEventListener("change", hydrateRunLogInputs);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const dateId = getValue("runDate");
    const existing = findDailyLog(dateId);
    const entry = {
      dateId,
      displayDate: formatDate(dateId),
      runMiles: Number(getValue("runMiles")),
      runMinutes: Number(getValue("runMinutes")),
      workoutDone: existing?.workoutDone || false,
      plannedFocus: existing?.plannedFocus || getPlannedFocusForDate(dateId),
      exercises: existing?.exercises || [],
      foodCalories: existing?.foodCalories || 0,
      foodProtein: existing?.foodProtein || 0,
      foodWater: existing?.foodWater || 0,
      notes: existing?.notes || "",
    };

    upsertByDate(state.dailyLogs, entry);
    sortByDateDesc(state.dailyLogs);
    persist();
    renderAll();
  });
}

function hydrateRunLogInputs() {
  const dateId = getValue("runDate");
  if (!dateId) return;
  const existing = findDailyLog(dateId);
  setValue("runMiles", existing?.runMiles ?? "");
  setValue("runMinutes", existing?.runMinutes ?? "");
}

function bindWorkoutPage() {
  const form = document.getElementById("workoutLogForm");
  if (!form) return;

  const dateInput = document.getElementById("workoutDate");
  const addBtn = document.getElementById("addExerciseBtn");
  const aiGoalList = document.getElementById("aiGoalList");

  dateInput.value = getDateId(new Date());
  hydrateWorkoutLogInputs();

  addBtn.addEventListener("click", () => addExerciseRow());
  dateInput.addEventListener("change", hydrateWorkoutLogInputs);

  if (aiGoalList) {
    aiGoalList.addEventListener("submit", onSaveCustomAiGoal);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const dateId = getValue("workoutDate");
    const existing = findDailyLog(dateId);
    const entry = {
      dateId,
      displayDate: formatDate(dateId),
      runMiles: existing?.runMiles || 0,
      runMinutes: existing?.runMinutes || 0,
      workoutDone: getValue("workoutDone") === "yes",
      plannedFocus: getValue("workoutPlanned"),
      exercises: collectExerciseRows(),
      foodCalories: existing?.foodCalories || 0,
      foodProtein: existing?.foodProtein || 0,
      foodWater: existing?.foodWater || 0,
      notes: getValue("workoutNotes") || existing?.notes || "",
    };

    upsertByDate(state.dailyLogs, entry);
    sortByDateDesc(state.dailyLogs);
    persist();
    renderAll();
  });
}

function hydrateWorkoutLogInputs() {
  const dateId = getValue("workoutDate");
  if (!dateId) return;

  const existing = findDailyLog(dateId);
  setValue("workoutPlanned", getPlannedFocusForDate(dateId));
  setValue("workoutDone", existing?.workoutDone ? "yes" : "no");
  setValue("workoutNotes", existing?.notes || "");

  clearExerciseRows();
  if (existing?.exercises?.length) {
    existing.exercises.forEach((exercise) => addExerciseRow(exercise));
  } else {
    addExerciseRow();
  }
}

function onSaveCustomAiGoal(event) {
  const form = event.target.closest(".ai-goal-form");
  if (!form) return;

  event.preventDefault();

  const key = decodeURIComponent(form.dataset.exerciseKey || "");
  const nextWeight = Number(form.querySelector(".ai-next-weight").value);
  const nextReps = Number(form.querySelector(".ai-next-reps").value);
  const monthWeight = Number(form.querySelector(".ai-month-weight").value);
  const monthReps = Number(form.querySelector(".ai-month-reps").value);

  if (!state.customExerciseGoals) state.customExerciseGoals = {};
  state.customExerciseGoals[key] = {
    nextWeight: Number.isFinite(nextWeight) ? nextWeight : 0,
    nextReps: Number.isFinite(nextReps) ? nextReps : 0,
    monthWeight: Number.isFinite(monthWeight) ? monthWeight : 0,
    monthReps: Number.isFinite(monthReps) ? monthReps : 0,
    updatedAt: getDateId(new Date()),
  };

  persist();
  renderAll();
}

function addExerciseRow(data = {}) {
  const container = document.getElementById("exerciseRows");
  const template = document.getElementById("exerciseRowTemplate");
  if (!container || !template) return;

  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".exercise-name").value = data.name || "";
  row.querySelector(".exercise-muscle").value = data.muscle || "legs";
  row.querySelector(".exercise-weight").value = data.weight ?? "";
  row.querySelector(".exercise-reps").value = data.reps ?? "";
  row.querySelector(".exercise-sets").value = data.sets ?? "";

  row.querySelector(".remove-exercise").addEventListener("click", () => {
    row.remove();
    if (!container.children.length) addExerciseRow();
  });

  container.appendChild(row);
}

function clearExerciseRows() {
  const container = document.getElementById("exerciseRows");
  if (container) container.innerHTML = "";
}

function collectExerciseRows() {
  const container = document.getElementById("exerciseRows");
  if (!container) return [];

  return Array.from(container.querySelectorAll(".exercise-row"))
    .map((row) => ({
      name: row.querySelector(".exercise-name").value.trim(),
      muscle: row.querySelector(".exercise-muscle").value,
      weight: Number(row.querySelector(".exercise-weight").value),
      reps: Number(row.querySelector(".exercise-reps").value),
      sets: Number(row.querySelector(".exercise-sets").value),
    }))
    .filter((item) => item.name && item.weight > 0 && item.reps > 0 && item.sets > 0);
}

function bindNutritionPage() {
  const form = document.getElementById("nutritionLogForm");
  if (!form) return;

  const dateInput = document.getElementById("nutritionDate");
  dateInput.value = getDateId(new Date());
  hydrateNutritionInputs();

  dateInput.addEventListener("change", hydrateNutritionInputs);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const dateId = getValue("nutritionDate");
    const existing = findDailyLog(dateId);

    const entry = {
      dateId,
      displayDate: formatDate(dateId),
      runMiles: existing?.runMiles || 0,
      runMinutes: existing?.runMinutes || 0,
      workoutDone: existing?.workoutDone || false,
      plannedFocus: existing?.plannedFocus || getPlannedFocusForDate(dateId),
      exercises: existing?.exercises || [],
      foodCalories: Number(getValue("nutritionCalories")),
      foodProtein: Number(getValue("nutritionProtein")),
      foodWater: Number(getValue("nutritionWater")),
      notes: existing?.notes || "",
    };

    upsertByDate(state.dailyLogs, entry);
    sortByDateDesc(state.dailyLogs);
    persist();
    renderAll();
  });
}

function hydrateNutritionInputs() {
  const dateId = getValue("nutritionDate");
  if (!dateId) return;
  const existing = findDailyLog(dateId);
  setValue("nutritionCalories", existing?.foodCalories ?? "");
  setValue("nutritionProtein", existing?.foodProtein ?? "");
  setValue("nutritionWater", existing?.foodWater ?? "");
}

function bindBodyPage() {
  const form = document.getElementById("bodyForm");
  if (!form) return;

  const dateInput = document.getElementById("bodyDate");
  dateInput.value = getDateId(new Date());
  hydrateBodyInputs();

  dateInput.addEventListener("change", hydrateBodyInputs);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const dateId = getValue("bodyDate");
    const photoInput = document.getElementById("bodyPhoto");
    const file = photoInput.files?.[0];

    const base = {
      dateId,
      displayDate: formatDate(dateId),
      weight: Number(getValue("bodyWeight")),
      waist: Number(getValue("bodyWaist") || 0),
      chest: Number(getValue("bodyChest") || 0),
      arms: Number(getValue("bodyArms") || 0),
      legs: Number(getValue("bodyLegs") || 0),
    };

    if (!file) {
      upsertBodyEntry(base);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      upsertBodyEntry({ ...base, photoDataUrl: String(reader.result || "") });
      photoInput.value = "";
    };
    reader.readAsDataURL(file);
  });
}

function hydrateBodyInputs() {
  const dateId = getValue("bodyDate");
  if (!dateId) return;
  const existing = state.bodyLogs.find((entry) => entry.dateId === dateId);

  setValue("bodyWeight", existing?.weight ?? "");
  setValue("bodyWaist", existing?.waist ?? "");
  setValue("bodyChest", existing?.chest ?? "");
  setValue("bodyArms", existing?.arms ?? "");
  setValue("bodyLegs", existing?.legs ?? "");
}

function upsertBodyEntry(entry) {
  const existing = state.bodyLogs.find((item) => item.dateId === entry.dateId);
  if (existing?.photoDataUrl && !entry.photoDataUrl) entry.photoDataUrl = existing.photoDataUrl;

  upsertByDate(state.bodyLogs, entry);
  sortByDateDesc(state.bodyLogs);
  persist();
  renderAll();
}

function renderAll() {
  renderDashboard();
  renderRunningPage();
  renderWorkoutPage();
  renderNutritionPage();
  renderBodyPage();
  renderPlanPage();
}

function renderDashboard() {
  const metricsEl = document.getElementById("dashboardMetrics");
  if (!metricsEl) return;

  const todayId = getDateId(new Date());
  const today = findDailyLog(todayId);
  const todayBody = state.bodyLogs.find((entry) => entry.dateId === todayId);
  const week = getPeriodStats("week");
  const month = getPeriodStats("month");

  metricsEl.innerHTML = [
    metricCard("Run Today", `${today?.runMiles || 0}/${state.goals.runDailyMiles} mi`, progressPercent(today?.runMiles || 0, state.goals.runDailyMiles), `${today?.runMinutes || 0}/${state.goals.runDailyMinutes} min`),
    metricCard("Run This Week", `${week.runMiles.toFixed(1)}/${state.goals.runWeeklyMiles} mi`, progressPercent(week.runMiles, state.goals.runWeeklyMiles), `${week.runDays} run days`),
    metricCard("Workout This Week", `${week.workoutDays}/${state.goals.workoutDaysPerWeek} days`, progressPercent(week.workoutDays, state.goals.workoutDaysPerWeek), `${week.exerciseCount} exercise entries`),
    metricCard("Workout This Month", `${month.workoutDays}/${state.goals.workoutSessionsPerMonth} sessions`, progressPercent(month.workoutDays, state.goals.workoutSessionsPerMonth), `${month.exerciseCount} exercise entries`),
    metricCard("Food Today", `${today?.foodCalories || 0}/${state.goals.foodCalories} cal`, progressPercent(today?.foodCalories || 0, state.goals.foodCalories), `Protein ${today?.foodProtein || 0}/${state.goals.foodProtein}g | Water ${today?.foodWater || 0}/${state.goals.foodWater}oz`),
    metricCard("Body Trend", bodyTrendText(), 100, "From first entry to latest entry"),
  ].join("");

  const todayEl = document.getElementById("dashboardToday");
  if (todayEl) {
    todayEl.innerHTML = `
      <article class="card">
        <div class="card-title">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
        <div>Planned focus: ${escapeHtml(getPlannedFocusForDate(todayId))}</div>
        <div class="subtle">Log status: ${today ? "Saved" : "Pending"}</div>
      </article>
    `;
  }

  const checklistEl = document.getElementById("dashboardChecklist");
  if (checklistEl) {
    const checklist = [
      checklistCard("Run logged", Boolean(today && (today.runMiles > 0 || today.runMinutes > 0)), `Target ${state.goals.runDailyMiles} mi`),
      checklistCard("Workout logged", Boolean(today && (today.workoutDone || (today.exercises || []).length)), getPlannedFocusForDate(todayId)),
      checklistCard("Nutrition logged", Boolean(today && (today.foodCalories > 0 || today.foodProtein > 0 || today.foodWater > 0)), `Calorie goal ${state.goals.foodCalories}`),
      checklistCard("Body check-in logged", Boolean(todayBody), "Weight + measurements"),
    ];
    checklistEl.innerHTML = checklist.join("");
  }

  renderDashboardAiGoals();
  renderLogList("dashboardRecent", state.dailyLogs, 6);
}

function renderDashboardAiGoals() {
  const target = document.getElementById("dashboardAiGoals");
  if (!target) return;

  const rows = buildAiGoalRows();
  if (!rows.length) {
    target.innerHTML = "<p>No AI lift targets yet. Log at least one workout exercise first.</p>";
    return;
  }

  target.innerHTML = rows.slice(0, 6).map((row) => {
    const sourceLabel = row.isCustom ? "Custom" : "AI";
    return `
      <article class="card">
        <div class="card-title">${escapeHtml(row.displayName)} <span class="subtle">(${sourceLabel})</span></div>
        <div>Next session: ${formatWeight(row.goal.nextWeight)} lb x ${row.goal.nextReps}</div>
        <div>End of month: ${formatWeight(row.goal.monthWeight)} lb x ${row.goal.monthReps}</div>
      </article>
    `;
  }).join("");
}

function checklistCard(title, done, detail) {
  const mark = done ? "Done" : "Pending";
  return `
    <article class="card">
      <div class="card-title">${escapeHtml(title)}</div>
      <div>${mark}</div>
      <div class="subtle">${escapeHtml(detail)}</div>
    </article>
  `;
}

function renderRunningPage() {
  const metricsEl = document.getElementById("runMetrics");
  if (!metricsEl) return;

  const today = findDailyLog(getDateId(new Date()));
  const week = getPeriodStats("week");
  const month = getPeriodStats("month");

  metricsEl.innerHTML = [
    metricCard("Daily Miles", `${today?.runMiles || 0}/${state.goals.runDailyMiles}`, progressPercent(today?.runMiles || 0, state.goals.runDailyMiles), `${today?.runMinutes || 0}/${state.goals.runDailyMinutes} minutes`),
    metricCard("Weekly Miles", `${week.runMiles.toFixed(1)}/${state.goals.runWeeklyMiles}`, progressPercent(week.runMiles, state.goals.runWeeklyMiles), `${week.runDays} run days this week`),
    metricCard("Monthly Miles", `${month.runMiles.toFixed(1)}/${state.goals.runMonthlyMiles}`, progressPercent(month.runMiles, state.goals.runMonthlyMiles), `${month.runDays} run days this month`),
  ].join("");

  renderLogList("runHistory", state.dailyLogs.filter((log) => log.runMiles > 0 || log.runMinutes > 0), 20, (log) => `Running: ${log.runMiles} mi in ${log.runMinutes} min`);
}

function renderWorkoutPage() {
  const metricsEl = document.getElementById("workoutMetrics");
  if (!metricsEl) return;

  const week = getPeriodStats("week");
  const month = getPeriodStats("month");

  metricsEl.innerHTML = [
    metricCard("Week Sessions", `${week.workoutDays}/${state.goals.workoutDaysPerWeek}`, progressPercent(week.workoutDays, state.goals.workoutDaysPerWeek), `${week.exerciseCount} exercise entries`),
    metricCard("Month Sessions", `${month.workoutDays}/${state.goals.workoutSessionsPerMonth}`, progressPercent(month.workoutDays, state.goals.workoutSessionsPerMonth), `${month.exerciseCount} exercise entries`),
  ].join("");

  renderAiGoalCoach();
  renderWorkoutTable("workoutPlanMeta", "workoutPlanTable");
  renderExerciseProgress("workoutProgress");
  renderLogList("workoutHistory", state.dailyLogs.filter((log) => log.workoutDone || (log.exercises || []).length), 20, (log) => {
    const count = (log.exercises || []).length;
    return `Workout: ${log.workoutDone ? "Done" : "Missed"} | Focus: ${log.plannedFocus || "N/A"} | Exercises: ${count}`;
  });
}

function renderAiGoalCoach() {
  const target = document.getElementById("aiGoalList");
  if (!target) return;

  const rows = buildAiGoalRows();
  if (!rows.length) {
    target.innerHTML = "<p>No exercise baseline yet. Log one exercise and save to generate AI targets.</p>";
    return;
  }

  target.innerHTML = rows.map((row) => `
    <form class="card ai-goal-form" data-exercise-key="${encodeURIComponent(row.key)}">
      <div class="card-title">${escapeHtml(row.displayName)} <span class="subtle">(${escapeHtml(row.muscle)})</span></div>
      <div class="subtle">Baseline: ${formatWeight(row.baseline.weight)} lb x ${row.baseline.reps}</div>
      <div class="subtle">Latest: ${formatWeight(row.latest.weight)} lb x ${row.latest.reps}</div>
      <div class="ai-goal-grid">
        <label>Next session weight<input class="ai-next-weight" type="number" min="0" step="0.5" value="${row.goal.nextWeight}" required /></label>
        <label>Next session reps<input class="ai-next-reps" type="number" min="1" step="1" value="${row.goal.nextReps}" required /></label>
        <label>Month-end weight<input class="ai-month-weight" type="number" min="0" step="0.5" value="${row.goal.monthWeight}" required /></label>
        <label>Month-end reps<input class="ai-month-reps" type="number" min="1" step="1" value="${row.goal.monthReps}" required /></label>
      </div>
      <div class="row-head">
        <span class="subtle">Source: ${row.isCustom ? "Custom override" : "AI suggestion"}</span>
        <button type="submit" class="secondary">Save Goal Override</button>
      </div>
    </form>
  `).join("");
}

function buildAiGoalRows() {
  const progressMap = buildExerciseProgressMap();
  const names = Object.keys(progressMap).sort((a, b) => a.localeCompare(b));

  return names.map((displayName) => {
    const progress = progressMap[displayName];
    const key = normalizeExerciseKey(displayName);
    const suggestion = suggestExerciseGoals(progress);
    const custom = state.customExerciseGoals?.[key];

    const goal = custom ? {
      nextWeight: custom.nextWeight,
      nextReps: custom.nextReps,
      monthWeight: custom.monthWeight,
      monthReps: custom.monthReps,
    } : suggestion;

    return {
      key,
      displayName,
      muscle: progress.latest.muscle,
      baseline: progress.baseline,
      latest: progress.latest,
      goal,
      isCustom: Boolean(custom),
    };
  });
}

function suggestExerciseGoals(progress) {
  const baselineWeight = Number(progress.baseline.weight || 0);
  const latestWeight = Number(progress.latest.weight || 0);
  const baselineReps = Number(progress.baseline.reps || 0);
  const latestReps = Number(progress.latest.reps || 0);

  const step = getWeightStep(Math.max(baselineWeight, latestWeight));
  const workingWeight = Math.max(baselineWeight, latestWeight);
  const workingReps = Math.max(baselineReps, latestReps, 1);

  const nextWeight = roundToStep(workingWeight + step, step);
  const nextReps = Math.min(15, workingReps + 1);
  const monthWeight = roundToStep(nextWeight + step * 3, step);
  const monthReps = Math.min(20, nextReps + 2);

  return { nextWeight, nextReps, monthWeight, monthReps };
}

function getWeightStep(weight) {
  if (weight >= 225) return 10;
  if (weight >= 95) return 5;
  return 2.5;
}

function roundToStep(value, step) {
  if (!step) return value;
  const rounded = Math.round(value / step) * step;
  return Number(rounded.toFixed(step === 2.5 ? 1 : 0));
}

function formatWeight(value) {
  const num = Number(value || 0);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function normalizeExerciseKey(name) {
  return name.trim().toLowerCase();
}

function renderNutritionPage() {
  const metricsEl = document.getElementById("nutritionMetrics");
  if (!metricsEl) return;

  const today = findDailyLog(getDateId(new Date()));
  metricsEl.innerHTML = [
    metricCard("Calories", `${today?.foodCalories || 0}/${state.goals.foodCalories}`, progressPercent(today?.foodCalories || 0, state.goals.foodCalories), "Daily calorie target"),
    metricCard("Protein", `${today?.foodProtein || 0}/${state.goals.foodProtein} g`, progressPercent(today?.foodProtein || 0, state.goals.foodProtein), "Daily protein target"),
    metricCard("Water", `${today?.foodWater || 0}/${state.goals.foodWater} oz`, progressPercent(today?.foodWater || 0, state.goals.foodWater), "Daily hydration target"),
  ].join("");

  renderLogList("nutritionHistory", state.dailyLogs.filter((log) => log.foodCalories || log.foodProtein || log.foodWater), 20, (log) => `Food: ${log.foodCalories} cal | ${log.foodProtein}g protein | ${log.foodWater}oz water`);
}

function renderBodyPage() {
  const metricsEl = document.getElementById("bodyMetrics");
  if (!metricsEl) return;

  const first = [...state.bodyLogs].sort((a, b) => (a.dateId > b.dateId ? 1 : -1))[0];
  const latest = [...state.bodyLogs].sort((a, b) => (a.dateId < b.dateId ? 1 : -1))[0];

  const deltaWeight = first && latest ? latest.weight - first.weight : 0;
  const deltaWaist = first && latest ? latest.waist - first.waist : 0;

  metricsEl.innerHTML = [
    metricCard("Current Weight", `${latest?.weight || 0} lb`, 100, latest ? `Latest entry ${latest.displayDate}` : "No entries yet"),
    metricCard("Weight Change", `${formatDelta(deltaWeight)} lb`, 100, "From first to latest"),
    metricCard("Waist Change", `${formatDelta(deltaWaist)} in`, 100, "From first to latest"),
  ].join("");

  const historyEl = document.getElementById("bodyHistory");
  historyEl.innerHTML = "";
  if (!state.bodyLogs.length) {
    historyEl.innerHTML = "<p>No body entries yet.</p>";
    return;
  }

  const cards = state.bodyLogs.slice(0, 14).map((entry) => `
    <article class="card">
      <div class="card-title">${escapeHtml(entry.displayDate)}</div>
      <div>Weight: ${entry.weight} lb</div>
      <div class="subtle">Waist ${entry.waist || 0} in | Chest ${entry.chest || 0} in | Arms ${entry.arms || 0} in | Legs ${entry.legs || 0} in</div>
    </article>
  `).join("");

  const photos = state.bodyLogs
    .filter((entry) => entry.photoDataUrl)
    .slice(0, 24)
    .map((entry) => `<figure><img src="${entry.photoDataUrl}" alt="Progress ${escapeHtml(entry.displayDate)}" /><figcaption class="subtle">${escapeHtml(entry.displayDate)}</figcaption></figure>`)
    .join("");

  historyEl.innerHTML = `${cards}${photos ? `<div class="photo-grid">${photos}</div>` : ""}`;
}

function renderPlanPage() {
  if (!document.getElementById("planTable")) return;
  renderWorkoutTable("planMeta", "planTable");

  const listEl = document.getElementById("planCompliance");
  if (listEl) {
    const missed = state.dailyLogs
      .filter((log) => getPlannedFocusForDate(log.dateId) !== "X" && !log.workoutDone)
      .slice(0, 14);

    if (!missed.length) {
      listEl.innerHTML = "<p>No missed planned workout days logged recently.</p>";
    } else {
      listEl.innerHTML = missed
        .map((log) => `<article class="card"><div class="card-title">${escapeHtml(log.displayDate)}</div><div>Missed focus: ${escapeHtml(getPlannedFocusForDate(log.dateId))}</div></article>`)
        .join("");
    }
  }
}

function renderWorkoutTable(metaId, tableId) {
  const metaEl = document.getElementById(metaId);
  const tableEl = document.getElementById(tableId);
  if (!metaEl || !tableEl) return;

  const now = new Date();
  const currentWeek = getProgramWeekIndex(getDateId(now));
  const currentDayIndex = getWeekDayIndexMonday(now);

  metaEl.textContent = `Current cycle week: ${currentWeek + 1} of ${SPLIT_PLAN.length}. Today: ${WEEK_DAYS[currentDayIndex]}.`;

  const header = `<thead><tr><th>Cycle Week</th>${WEEK_DAYS.map((day) => `<th>${day}</th>`).join("")}</tr></thead>`;
  const rows = SPLIT_PLAN.map((row, weekIndex) => {
    const cells = row
      .map((item, dayIndex) => `<td class="${dayIndex === currentDayIndex ? "today-cell" : ""}">${escapeHtml(item)}</td>`)
      .join("");
    return `<tr class="${weekIndex === currentWeek ? "current-row" : ""}"><td>Week ${weekIndex + 1}</td>${cells}</tr>`;
  }).join("");

  tableEl.innerHTML = `${header}<tbody>${rows}</tbody>`;
}

function renderExerciseProgress(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const map = buildExerciseProgressMap();
  const names = Object.keys(map).sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    target.innerHTML = "<p>Add workout exercise logs to see baseline vs latest progress.</p>";
    return;
  }

  target.innerHTML = names.map((name) => {
    const item = map[name];
    const weightDelta = item.latest.weight - item.baseline.weight;
    const repsDelta = item.latest.reps - item.baseline.reps;

    return `
      <article class="card">
        <div class="card-title">${escapeHtml(name)} (${escapeHtml(item.latest.muscle)})</div>
        <div>Baseline: ${item.baseline.weight} lb x ${item.baseline.reps}</div>
        <div>Latest: ${item.latest.weight} lb x ${item.latest.reps}</div>
        <div class="subtle">Change: ${formatDelta(weightDelta)} lb, ${formatDelta(repsDelta)} reps</div>
      </article>
    `;
  }).join("");
}

function buildExerciseProgressMap() {
  const logsAsc = [...state.dailyLogs].sort((a, b) => (a.dateId > b.dateId ? 1 : -1));
  const map = {};

  logsAsc.forEach((log) => {
    (log.exercises || []).forEach((exercise) => {
      const key = normalizeExerciseKey(exercise.name);
      if (!key) return;
      if (!map[key]) map[key] = { displayName: exercise.name, baseline: exercise, latest: exercise };
      map[key].latest = exercise;
      map[key].displayName = exercise.name;
    });
  });

  const normalized = {};
  Object.values(map).forEach((item) => {
    normalized[item.displayName] = item;
  });
  return normalized;
}

function renderLogList(targetId, logs, limit, lineBuilder) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const subset = logs.slice(0, limit);
  if (!subset.length) {
    target.innerHTML = "<p>No logs yet.</p>";
    return;
  }

  target.innerHTML = subset.map((log) => `
    <article class="card">
      <div class="card-title">${escapeHtml(log.displayDate || formatDate(log.dateId))}</div>
      <div>${escapeHtml(lineBuilder ? lineBuilder(log) : defaultLogLine(log))}</div>
    </article>
  `).join("");
}

function defaultLogLine(log) {
  return `Run ${log.runMiles || 0} mi | Workout ${log.workoutDone ? "Done" : "Missed"} | Food ${log.foodCalories || 0} cal`;
}

function metricCard(label, value, percent, subtext) {
  return `
    <article class="metric">
      <div class="metric-head"><span>${escapeHtml(label)}</span><span>${Math.round(percent)}%</span></div>
      <div>${escapeHtml(value)}</div>
      <div class="metric-sub">${escapeHtml(subtext)}</div>
      <div class="bar"><div class="fill" style="width:${percent}%"></div></div>
    </article>
  `;
}

function getPeriodStats(period) {
  const now = new Date();
  const bounds = period === "week" ? getWeekBoundsMonday(now) : getMonthBounds(now);

  return state.dailyLogs.reduce((acc, log) => {
    const logDate = new Date(log.dateId + "T00:00:00");
    if (logDate < bounds.start || logDate > bounds.end) return acc;

    acc.runMiles += Number(log.runMiles || 0);
    if ((log.runMiles || 0) > 0) acc.runDays += 1;
    if (log.workoutDone) acc.workoutDays += 1;
    acc.exerciseCount += (log.exercises || []).length;
    return acc;
  }, {
    runMiles: 0,
    runDays: 0,
    workoutDays: 0,
    exerciseCount: 0,
  });
}

function bodyTrendText() {
  if (state.bodyLogs.length < 2) return "Need at least 2 entries";
  const asc = [...state.bodyLogs].sort((a, b) => (a.dateId > b.dateId ? 1 : -1));
  const first = asc[0];
  const last = asc[asc.length - 1];
  return `${formatDelta(last.weight - first.weight)} lb`;
}

function getPlannedFocusForDate(dateId) {
  const week = getProgramWeekIndex(dateId);
  const day = getWeekDayIndexMonday(new Date(dateId + "T00:00:00"));
  return SPLIT_PLAN[week][day];
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

function upsertByDate(arr, entry) {
  const index = arr.findIndex((item) => item.dateId === entry.dateId);
  if (index >= 0) arr[index] = { ...arr[index], ...entry };
  else arr.push(entry);
}

function sortByDateDesc(arr) {
  arr.sort((a, b) => (a.dateId < b.dateId ? 1 : -1));
}

function findDailyLog(dateId) {
  return state.dailyLogs.find((item) => item.dateId === dateId);
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function getValue(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
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

function formatDelta(value) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
