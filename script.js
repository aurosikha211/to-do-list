// ---------- Elements ----------
const taskInput = document.getElementById("fTask");
const catInput = document.getElementById("fCat");
const priInput = document.getElementById("fPri");
const dueInput = document.getElementById("fDue");
const estInput = document.getElementById("fEst");
const addBtn = document.getElementById("addBtn");
const countersBox = document.getElementById("counters");
const tabsBox = document.getElementById("tabs");
const chipsBox = document.getElementById("catChips");
const sortBy = document.getElementById("sortBy");
const statsBox = document.getElementById("stats");
const taskBody = document.getElementById("taskBody");

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
let statusFilter = "All";
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

function getStatus(task) {
  if (task.end) return "Completed";
  if (task.start) return "In Progress";
  return "Not Started";
}

function matchesStatus(task) {
  return statusFilter === "All" || getStatus(task) === statusFilter;
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

function renderTabs() {
  tabsBox.innerHTML = "";
  const base = tasks.filter(matchesCategory);

  ["All", "Not Started", "In Progress", "Completed"].forEach(name => {
    const count = name === "All"
      ? base.length
      : base.filter(t => getStatus(t) === name).length;

    const btn = document.createElement("button");
    btn.textContent = name + " (" + count + ")";
    if (name === statusFilter) btn.className = "on";
    btn.addEventListener("click", () => {
      statusFilter = name;
      editingId = null;
      render();
    });
    tabsBox.appendChild(btn);
  });
}

function renderChips() {
  chipsBox.innerHTML = "";
  const base = tasks.filter(matchesStatus);

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

  const took = getTook(task);

  cell("✎");
  cell(textIn);
  cell(catSel);
  cell(priSel);
  cell(dueIn);
  cell(estIn);
  cell(formatTime(task.start));
  cell(formatTime(task.end));
  cell(took.text).className = took.cls;

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
  const took = getTook(task);

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
  tdTook.className = took.cls;
  tdTook.textContent = took.text;

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

function render() {
  renderCounters();
  renderTabs();
  renderChips();

  // filter
  let list = tasks.filter(t => matchesStatus(t) && matchesCategory(t));

  // sort
  if (sortBy.value === "pri") {
    list.sort((a, b) => priorityRank[a.pri] - priorityRank[b.pri]);
  } else if (sortBy.value === "due") {
    list.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  }

  taskBody.innerHTML = "";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 10;
    td.className = "empty";
    td.style.borderLeft = "none";
    td.style.borderRadius = "10px";
    td.textContent = "No tasks here. Add your first one!";
    tr.appendChild(td);
    taskBody.appendChild(tr);
  }

  const today = todayString();

  list.forEach(task => {
    const row = task.id === editingId ? buildEditRow(task) : buildRow(task, today);
    taskBody.appendChild(row);
  });

  // put the cursor in the task box when editing starts
  if (editingId !== null) {
    const box = taskBody.querySelector(".edit-text");
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
