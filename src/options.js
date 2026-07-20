document.addEventListener("DOMContentLoaded", () => {
  // Selector Bindings
  const tasksContainer = document.getElementById("tasks-container");
  const addTaskBtn = document.getElementById("add-task-btn");
  const cycleInput = document.getElementById("cycle-target");
  const shortInput = document.getElementById("short-time");
  const longInput = document.getElementById("long-time");
  const soundWork = document.getElementById("sound-work");
  const soundShortBreak = document.getElementById("sound-short-break");
  const soundLongBreak = document.getElementById("sound-long-break");
  const saveTasksBtn = document.getElementById("save-tasks-btn");
  const saveBreakBtn = document.getElementById("save-break-btn");
  const saveSoundBtn = document.getElementById("save-sound-btn");

  // Tab System Selectors
  const navSettings = document.getElementById("nav-settings");
  const navRecords = document.getElementById("nav-records");
  const contentSettings = document.getElementById("content-settings");
  const contentRecords = document.getElementById("content-records");

  // History Elements
  const todayCountEl = document.getElementById("today-count");
  const historyLogContainer = document.getElementById("history-log-container");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  let localTasks = [];

  // --- TAB NAVIGATION CORE SWITCH ROUTE ---
  navSettings.addEventListener("click", () => switchTab("settings"));
  navRecords.addEventListener("click", () => switchTab("records"));

  function switchTab(target) {
    if (target === "settings") {
      navSettings.classList.add("active");
      navRecords.classList.remove("active");
      contentSettings.classList.add("active");
      contentRecords.classList.remove("active");
    } else {
      navSettings.classList.remove("active");
      navRecords.classList.add("active");
      contentSettings.classList.remove("active");
      contentRecords.classList.add("active");
      loadAndRenderRecords(); // Pull fresh logs whenever view renders
    }
  }

  // --- ANALYTICS PARSING ENGINE ---
  function loadAndRenderRecords() {
    chrome.storage.local.get({ history: [] }, (data) => {
      const logs = data.history;

      // Calculate start of today's date index footprint
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfTodayTimestamp = today.getTime();

      let sessionsCompletedToday = 0;
      historyLogContainer.innerHTML = "";

      if (logs.length === 0) {
        historyLogContainer.innerHTML = `<li style="color:#888; text-align:center; padding:20px;">No recorded blocks logged yet.</li>`;
        todayCountEl.textContent = "0";
        return;
      }

      // Read history from newest to oldest
      for (let i = logs.length - 1; i >= 0; i--) {
        const item = logs[i];

        if (item.timestamp >= startOfTodayTimestamp) {
          sessionsCompletedToday++;
        }

        // Parse human legible timestamps
        const logDate = new Date(item.timestamp);
        const formattedTime = logDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const formattedDate = logDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        const li = document.createElement("li");
        li.className = "history-item";
        li.innerHTML = `
          <span>🎯 <strong>${item.taskName}</strong></span>
          <span style="color:#777;">${formattedDate} at ${formattedTime}</span>
        `;
        historyLogContainer.appendChild(li);
      }

      todayCountEl.textContent = sessionsCompletedToday;
    });
  }

  // Clear data loop
  clearHistoryBtn.addEventListener("click", () => {
    if (
      confirm(
        "Are you sure you want to permanently wipe all completion metrics?",
      )
    ) {
      chrome.storage.local.set({ history: [] }, () => {
        loadAndRenderRecords();
      });
    }
  });

  // --- EXISTING TASK SETTINGS LOGIC KEEPERS ---
  chrome.storage.local.get(
    ["tasks", "shortBreak", "longBreak", "cycleTarget", "soundWork", "soundShortBreak", "soundLongBreak"],
    (data) => {
      localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
      shortInput.value = data.shortBreak || 5;
      longInput.value = data.longBreak || 15;
      cycleInput.value = data.cycleTarget || 4;
      soundWork.checked = data.soundWork !== false; // Default true
      soundShortBreak.checked = data.soundShortBreak !== false;
      soundLongBreak.checked = data.soundLongBreak !== false;
      renderTasks();
    },
  );

  function renderTasks() {
    tasksContainer.innerHTML = "";
    localTasks.forEach((task, index) => {
      const row = document.createElement("div");
      row.className = "task-row";
      row.innerHTML = `
        <input type="text" class="task-name" value="${task.name}">
        <input type="number" class="task-duration" value="${task.duration}" min="1"> mins
        <button class="delete-btn" type="button" ${localTasks.length <= 1 ? 'disabled style="opacity:0.2;"' : ""}>✕</button>
      `;
      row.querySelector(".task-name").addEventListener("input", (e) => {
        localTasks[index].name = e.target.value;
      });
      row.querySelector(".task-duration").addEventListener("input", (e) => {
        localTasks[index].duration = parseInt(e.target.value) || 25;
      });
      row.querySelector(".delete-btn").addEventListener("click", () => {
        if (localTasks.length > 1) {
          localTasks.splice(index, 1);
          renderTasks();
        }
      });
      tasksContainer.appendChild(row);
    });
  }

  addTaskBtn.addEventListener("click", () => {
    if (localTasks.length < 3) {
      localTasks.push({ name: `Work ${localTasks.length + 1}`, duration: 25 });
      renderTasks();
    } else {
      alert("Maximum limit of 3 custom tasks reached.");
    }
  });

  // ── Save Tasks only (timer untouched) ─────────────────────────────────────
  saveTasksBtn.addEventListener("click", () => {
    chrome.storage.local.set({ tasks: localTasks }, () => {
      alert("Tasks saved successfully!");
    });
  });

  // ── Save Break & Schedule only (timer untouched) ───────────────────────────
  saveBreakBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        shortBreak: parseInt(shortInput.value) || 5,
        longBreak: parseInt(longInput.value) || 15,
        cycleTarget: parseInt(cycleInput.value) || 4,
      },
      () => {
        alert("Break settings saved successfully!");
      },
    );
  });

  // ── Save Sound Settings ──────────────────────────────────────────────────
  saveSoundBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        soundWork: soundWork.checked,
        soundShortBreak: soundShortBreak.checked,
        soundLongBreak: soundLongBreak.checked
      },
      () => {
        alert("Sound settings saved successfully!");
      },
    );
  });

  // ── Version Number ────────────────────────────────────────────────────────
  const appVersion = document.getElementById("app-version");
  if (appVersion) {
    appVersion.textContent = "v" + chrome.runtime.getManifest().version;
  }
});
