// ---------- Elements ----------
const taskInput = document.getElementById("fTask");
const catInput = document.getElementById("fCat");
const priInput = document.getElementById("fPri");
const dueInput = document.getElementById("fDue");
const estInput = document.getElementById("fEst");
const addBtn = document.getElementById("addBtn");
const clockBox = document.getElementById("clock");
const countersBox = document.getElementById("counters");
const chipsBox = document.getElementById("catChips");
const sortBy = document.getElementById("sortBy");
const statsBox = document.getElementById("stats");
const pendingBody = document.getElementById("pendingBody");
const completedBody = document.getElementById("completedBody");
const pendingCount = document.getElementById("pendingCount");
const completedCount = document.getElementById("completedCount");

// new-category controls
const catSelectRow = document.getElementById("catSelectRow");
const catNewRow = document.getElementById("catNewRow");
const newCatInput = document.getElementById("newCatInput");
const newCatBtn = document.getElementById("newCatBtn");
const saveCatBtn = document.getElementById("saveCatBtn");
const cancelCatBtn = document.getElementById("cancelCatBtn");

document.getElementById("today").textContent =
  new Date().toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

// ---------- Data ----------
let tasks = [];
let categoryFilter = "All";
let editingId = null; // id of the task being edited (null = none)
const priorityRank = { High: 0, Medium: 1, Low: 2 };

try {
  tasks = JSON.parse(localStorage.getItem("todoTasksV2")) || [];
} catch (e) {
  tasks = [];
}

function save() {
  try {
    localStorage.setItem("todoTasksV2", JSON.stringify(tasks));
  } catch (e) {}
}

// ---------- Categories ----------
const defaultCategories = ["Study", "Coding", "Work", "Personal"];
let customCategories = [];

try {
  customCategories = JSON.parse(localStorage.getItem("todoCategories")) || [];
} catch (e) {
  customCategories = [];
}

function saveCategories() {
  try {
    localStorage.setItem("todoCategories", JSON.stringify(customCategories));
  } catch (e) {}
}

function allCategories() {
  return defaultCategories.concat(customCategories);
}

function makeOption(value, label) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  return opt;
}

// Rebuild the category dropdown in the add form
function fillCategoryLists(selectName) {
  const formValue = selectName || catInput.value;
  const names = allCategories();

  catInput.innerHTML = "";
  names.forEach(name => catInput.appendChild(makeOption(name, name)));
  catInput.value = names.includes(formValue) ? formValue : defaultCategories[0];
}

function openNewCategory() {
  catSelectRow.hidden = true;
  catNewRow.hidden = false;
  newCatInput.value = "";
  newCatInput.focus();
}

function closeNewCategory() {
  catNewRow.hidden = true;
  catSelectRow.hidden = false;
}

function saveNewCategory() {
  const name = newCatInput.value.trim().replace(/\s+/g, " ");
  if (!name) return;

  // if it already exists (any capitalisation), just select it
  const existing = allCategories().find(c => c.toLowerCase() === name.toLowerCase());
  if (existing) {
    fillCategoryLists(existing);
    closeNewCategory();
    return;
  }

  customCategories.push(name);
  saveCategories();
  fillCategoryLists(name);
  closeNewCategory();
  render(); // so the new category button appears
}

// ---------- Helpers ----------
function formatTime(ts) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins >= 60) return Math.floor(mins / 60) + "h " + (mins % 60) + "m";
  return mins + "m";
}

function formatDate(str) {
  if (!str) return "--";
  return new Date(str + "T00:00").toLocaleDateString([], { day: "numeric", month: "short" });
}

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function matchesCategory(task) {
  return categoryFilter === "All" || task.cat === categoryFilter;
}

// time taken text + colour class for a task
function getTook(task) {
  if (task.start && task.end) {
    const ms = task.end - task.start;
    const cls = ms / 60000 <= task.est ? "fast" : "slow";
    return { text: formatDuration(ms) + (cls === "fast" ? " ✓" : " ▲"), cls: cls };
  }
  if (task.start) return { text: "In progress...", cls: "" };
  return { text: "--", cls: "" };
}

// ---------- Live clock and running timers ----------
function formatStopwatch(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (
    String(h).padStart(2, "0") + ":" +
    String(m).padStart(2, "0") + ":" +
    String(s).padStart(2, "0")
  );
}

// updates one ticking timer element (red once it passes the estimate)
function updateTimerEl(el) {
  const elapsed = Date.now() - Number(el.dataset.start);
  el.textContent = "⏱ " + formatStopwatch(elapsed);
  el.classList.toggle("over", elapsed / 60000 > Number(el.dataset.est));
}

// fills the "Time taken" cell: ticking timer if running, fixed time if finished
function fillTookCell(td, task) {
  if (task.start && !task.end) {
    const span = document.createElement("span");
    span.className = "live-timer";
    span.dataset.start = task.start;
    span.dataset.est = task.est;
    td.appendChild(span);
    updateTimerEl(span);
  } else {
    const took = getTook(task);
    td.className = took.cls;
    td.textContent = took.text;
  }
}

// runs every second: updates the clock and all running timers
function tick() {
  clockBox.textContent =
    "🕒 " +
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  document.querySelectorAll(".live-timer").forEach(updateTimerEl);
}

// ---------- Actions ----------
function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  tasks.push({
    id: Date.now(),
    text: text,
    cat: catInput.value,
    pri: priInput.value,
    due: dueInput.value,
    est: Number(estInput.value) || 30,
    start: null,
    end: null
  });

  taskInput.value = "";
  editingId = null;
  save();
  render();
}

function startTask(task) {
  task.start = Date.now();
  save();
  render();
}

function toggleTask(task) {
  if (task.end) {
    task.end = null; // untick = reopen task
  } else {
    task.end = Date.now();
    if (!task.start) task.start = task.end; // finished without pressing Start
  }
  save();
  render();
}

function deleteTask(task) {
  if (editingId === task.id) editingId = null;
  tasks = tasks.filter(t => t !== task);
  save();
  render();
}

function startEdit(task) {
  editingId = task.id;
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

// ---------- Render: counters, tabs, category buttons ----------
function renderCounters() {
  const today = todayString();
  const total = tasks.length;
  const done = tasks.filter(t => t.end).length;
  const overdue = tasks.filter(t => t.due && t.due < today && !t.end).length;

  const items = [
    ["Total", total, "c-total"],
    ["Pending", total - done, "c-pending"],
    ["Done", done, "c-done"],
    ["Overdue", overdue, "c-over"]
  ];

  countersBox.innerHTML = "";
  items.forEach(item => {
    const box = document.createElement("div");
    box.className = "counter " + item[2];
    const num = document.createElement("strong");
    num.textContent = item[1];
    const label = document.createElement("span");
    label.textContent = item[0];
    box.appendChild(num);
    box.appendChild(label);
    countersBox.appendChild(box);
  });
}

function renderChips() {
  chipsBox.innerHTML = "";
  const base = tasks;

  ["All"].concat(allCategories()).forEach(name => {
    const count = name === "All"
      ? base.length
      : base.filter(t => t.cat === name).length;

    const btn = document.createElement("button");
    btn.textContent = name + " (" + count + ")";
    if (name === categoryFilter) btn.className = "on";
    btn.addEventListener("click", () => {
      categoryFilter = name;
      editingId = null;
      render();
    });
    chipsBox.appendChild(btn);
  });
}

// ---------- Render: table rows ----------
function buildEditRow(task) {
  const tr = document.createElement("tr");
  tr.className = "editing";

  function cell(child) {
    const td = document.createElement("td");
    if (typeof child === "string") td.textContent = child;
    else if (child) td.appendChild(child);
    tr.appendChild(td);
    return td;
  }

  const textIn = document.createElement("input");
  textIn.type = "text";
  textIn.className = "edit-input edit-text";
  textIn.value = task.text;

  const catSel = document.createElement("select");
  catSel.className = "edit-input";
  allCategories().forEach(name => catSel.appendChild(makeOption(name, name)));
  catSel.value = task.cat;

  const priSel = document.createElement("select");
  priSel.className = "edit-input";
  ["High", "Medium", "Low"].forEach(p => priSel.appendChild(makeOption(p, p)));
  priSel.value = task.pri;

  const dueIn = document.createElement("input");
  dueIn.type = "date";
  dueIn.className = "edit-input";
  dueIn.value = task.due || "";

  const estIn = document.createElement("input");
  estIn.type = "number";
  estIn.min = "1";
  estIn.className = "edit-input";
  estIn.value = task.est;

  function commitEdit() {
    const text = textIn.value.trim();
    if (!text) {
      textIn.focus();
      return;
    }
    task.text = text;
    task.cat = catSel.value;
    task.pri = priSel.value;
    task.due = dueIn.value;
    task.est = Number(estIn.value) > 0 ? Number(estIn.value) : task.est;
    editingId = null;
    save();
    render();
  }

  [textIn, dueIn, estIn].forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") commitEdit();
      if (e.key === "Escape") cancelEdit();
    });
  });

  cell("✎");
  cell(textIn);
  cell(catSel);
  cell(priSel);
  cell(dueIn);
  cell(estIn);
  cell(formatTime(task.start));
  cell(formatTime(task.end));
  fillTookCell(cell(null), task);

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-save";
  saveBtn.textContent = "✓ Save";
  saveBtn.addEventListener("click", commitEdit);

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-cancel";
  cancelBtn.textContent = "✕";
  cancelBtn.title = "Cancel";
  cancelBtn.addEventListener("click", cancelEdit);

  const tdAct = cell(null);
  tdAct.appendChild(saveBtn);
  tdAct.appendChild(cancelBtn);

  return tr;
}

function buildRow(task, today) {
  const tr = document.createElement("tr");
  if (task.end) tr.className = "done";

  const isOverdue = task.due && task.due < today && !task.end;

  // checkbox cell
  const tdCheck = document.createElement("td");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!task.end;
  cb.addEventListener("change", () => toggleTask(task));
  tdCheck.appendChild(cb);

  // task text cell
  const tdText = document.createElement("td");
  tdText.className = "task-text";
  tdText.textContent = task.text;

  // category cell
  const tdCat = document.createElement("td");
  tdCat.innerHTML = '<span class="badge cat"></span>';
  tdCat.firstChild.textContent = task.cat;

  // priority cell
  const tdPri = document.createElement("td");
  tdPri.innerHTML = '<span class="badge ' + task.pri + '">' + task.pri + "</span>";

  // due cell
  const tdDue = document.createElement("td");
  tdDue.textContent = formatDate(task.due) + (isOverdue ? " ⚠ Overdue" : "");
  if (isOverdue) tdDue.className = "overdue";

  // other cells
  const tdEst = document.createElement("td");
  tdEst.textContent = task.est + "m";

  const tdStart = document.createElement("td");
  tdStart.textContent = formatTime(task.start);

  const tdEnd = document.createElement("td");
  tdEnd.textContent = formatTime(task.end);

  const tdTook = document.createElement("td");
  fillTookCell(tdTook, task);

  // actions cell
  const tdAct = document.createElement("td");

  if (!task.start && !task.end) {
    const startBtn = document.createElement("button");
    startBtn.className = "btn-start";
    startBtn.textContent = "▶ Start";
    startBtn.addEventListener("click", () => startTask(task));
    tdAct.appendChild(startBtn);
  }

  const editBtn = document.createElement("button");
  editBtn.className = "btn-edit";
  editBtn.textContent = "✎";
  editBtn.title = "Edit task";
  editBtn.addEventListener("click", () => startEdit(task));
  tdAct.appendChild(editBtn);

  const delBtn = document.createElement("button");
  delBtn.className = "btn-delete";
  delBtn.textContent = "✖";
  delBtn.title = "Delete task";
  delBtn.addEventListener("click", () => deleteTask(task));
  tdAct.appendChild(delBtn);

  [tdCheck, tdText, tdCat, tdPri, tdDue, tdEst, tdStart, tdEnd, tdTook, tdAct]
    .forEach(td => tr.appendChild(td));

  return tr;
}

function sortList(list) {
  if (sortBy.value === "pri") {
    list.sort((a, b) => priorityRank[a.pri] - priorityRank[b.pri]);
  } else if (sortBy.value === "due") {
    list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  }
  return list;
}

function fillSection(body, list, emptyText, today) {
  body.innerHTML = "";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.className = "empty";
    td.style.borderLeft = "none";
    td.style.borderRadius = "10px";
    td.textContent = emptyText;
    tr.appendChild(td);
    body.appendChild(tr);
    return;
  }

  list.forEach(task => {
    const row = task.id === editingId ? buildEditRow(task) : buildRow(task, today);
    body.appendChild(row);
  });
}

function render() {
  renderCounters();
  renderChips();

  const today = todayString();
  const visible = tasks.filter(matchesCategory);

  // split into two sections
  const pending = sortList(visible.filter(t => !t.end));
  const completed = sortList(visible.filter(t => t.end));

  // newest finished task first (when sorting by "Added")
  if (sortBy.value === "added") {
    completed.sort((a, b) => b.end - a.end);
  }

  pendingCount.textContent = pending.length;
  completedCount.textContent = completed.length;

  fillSection(pendingBody, pending, "No pending tasks. Add one above!", today);
  fillSection(completedBody, completed, "No completed tasks yet.", today);

  // put the cursor in the task box when editing starts
  if (editingId !== null) {
    const box = document.querySelector(".edit-text");
    if (box) box.focus();
  }

  // total time spent on finished tasks
  let totalMs = 0;
  tasks.forEach(t => {
    if (t.end) totalMs += t.end - t.start;
  });
  statsBox.textContent =
    "Total time: " + formatDuration(totalMs) +
    "  |  Green = faster than estimate, red = slower";
}

// ---------- Events ----------
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask();
});
sortBy.addEventListener("change", () => {
  editingId = null;
  render();
});

newCatBtn.addEventListener("click", openNewCategory);
saveCatBtn.addEventListener("click", saveNewCategory);
cancelCatBtn.addEventListener("click", closeNewCategory);
newCatInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveNewCategory();
  if (e.key === "Escape") closeNewCategory();
});

fillCategoryLists();
render();
tick();
setInterval(tick, 1000);
