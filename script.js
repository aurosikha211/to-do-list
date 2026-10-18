// ---------- Elements ----------
const taskInput = document.getElementById("fTask");
const catInput = document.getElementById("fCat");
const priInput = document.getElementById("fPri");
const dueInput = document.getElementById("fDue");
const estInput = document.getElementById("fEst");
const addBtn = document.getElementById("addBtn");
const tabsBox = document.getElementById("tabs");
const catFilter = document.getElementById("catFilter");
const sortBy = document.getElementById("sortBy");
const statsBox = document.getElementById("stats");
const taskBody = document.getElementById("taskBody");

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
  tasks = tasks.filter(t => t !== task);
  save();
  render();
}

// ---------- Render ----------
function renderTabs() {
  tabsBox.innerHTML = "";
  ["All", "Not Started", "In Progress", "Completed"].forEach(name => {
    const btn = document.createElement("button");
    btn.textContent = name;
    if (name === statusFilter) btn.className = "on";
    btn.addEventListener("click", () => {
      statusFilter = name;
      render();
    });
    tabsBox.appendChild(btn);
  });
}

function render() {
  renderTabs();

  // filter
  let list = tasks.filter(t => {
    const statusOk = statusFilter === "All" || getStatus(t) === statusFilter;
    const catOk = catFilter.value === "All" || t.cat === catFilter.value;
    return statusOk && catOk;
  });

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
    const tr = document.createElement("tr");
    if (task.end) tr.className = "done";

    const isOverdue = task.due && task.due < today && !task.end;

    // time taken
    let tookText = "--";
    let tookClass = "";
    if (task.start && task.end) {
      const ms = task.end - task.start;
      tookText = formatDuration(ms);
      tookClass = ms / 60000 <= task.est ? "fast" : "slow";
      tookText += tookClass === "fast" ? " ✓" : " ▲";
    } else if (task.start) {
      tookText = "In progress...";
    }

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
    tdTook.className = tookClass;
    tdTook.textContent = tookText;

    // actions cell
    const tdAct = document.createElement("td");
    if (!task.start && !task.end) {
      const startBtn = document.createElement("button");
      startBtn.className = "btn-start";
      startBtn.textContent = "▶ Start";
      startBtn.addEventListener("click", () => startTask(task));
      tdAct.appendChild(startBtn);
    }
    const delBtn = document.createElement("button");
    delBtn.className = "btn-delete";
    delBtn.textContent = "✖";
    delBtn.title = "Delete task";
    delBtn.addEventListener("click", () => deleteTask(task));
    tdAct.appendChild(delBtn);

    [tdCheck, tdText, tdCat, tdPri, tdDue, tdEst, tdStart, tdEnd, tdTook, tdAct]
      .forEach(td => tr.appendChild(td));
    taskBody.appendChild(tr);
  });

  // stats
  let doneCount = 0;
  let totalMs = 0;
  tasks.forEach(t => {
    if (t.end) {
      doneCount++;
      totalMs += t.end - t.start;
    }
  });
  statsBox.textContent =
    doneCount + " of " + tasks.length + " tasks done  |  Total time: " +
    formatDuration(totalMs) + "  |  Green = faster than estimate, red = slower";
}

// ---------- Events ----------
addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTask();
});
catFilter.addEventListener("change", render);
sortBy.addEventListener("change", render);

render();
