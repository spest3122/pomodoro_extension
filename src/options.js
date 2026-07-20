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

      // Heatmap Data Map (YYYY-MM-DD -> count)
      const activityMap = new Map();
      logs.forEach(log => {
        const d = new Date(log.timestamp);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
      });

      // Render Heatmap (last 30 days)
      const heatmapContainer = document.getElementById("heatmap-container");
      if (heatmapContainer) {
        heatmapContainer.innerHTML = "";
        const todayDate = new Date();
        for (let i = 29; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setDate(d.getDate() - i);
          const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const count = activityMap.get(dateKey) || 0;
          
          let color = "var(--canvas-aged)";
          if (count > 0 && count <= 2) color = "#a8d5ba";
          else if (count > 2 && count <= 5) color = "#5cb85c";
          else if (count > 5) color = "#218838";

          const square = document.createElement("div");
          square.style.width = "14px";
          square.style.height = "14px";
          square.style.backgroundColor = color;
          square.style.border = "1px solid var(--ink-deep)";
          square.style.borderRadius = "2px";
          
          // Custom Tooltip events
          square.addEventListener("mouseenter", () => {
            const tooltip = document.getElementById("heatmap-tooltip");
            if (tooltip) {
              tooltip.textContent = `${dateKey}: ${count} pomodoros`;
              tooltip.style.display = "block";
            }
          });
          square.addEventListener("mousemove", (e) => {
            const tooltip = document.getElementById("heatmap-tooltip");
            if (tooltip) {
              tooltip.style.left = (e.pageX + 15) + "px";
              tooltip.style.top = (e.pageY + 15) + "px";
            }
          });
          square.addEventListener("mouseleave", () => {
            const tooltip = document.getElementById("heatmap-tooltip");
            if (tooltip) {
              tooltip.style.display = "none";
            }
          });

          heatmapContainer.appendChild(square);
        }
      }

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

  // --- CSV DATA EXPORT & IMPORT ---
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const importCsvBtn = document.getElementById("import-csv-btn");
  const importCsvFile = document.getElementById("import-csv-file");

  exportCsvBtn.addEventListener("click", () => {
    chrome.storage.local.get({ history: [] }, (data) => {
      const logs = data.history;
      if (logs.length === 0) {
        alert("No logs to export.");
        return;
      }
      
      let csvContent = "data:text/csv;charset=utf-8,Task Name,Timestamp,Date\n";
      logs.forEach(log => {
        const d = new Date(log.timestamp);
        const dateStr = d.toLocaleString();
        const row = `"${log.taskName}",${log.timestamp},"${dateStr}"`;
        csvContent += row + "\n";
      });
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "pomodoro_history.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  importCsvBtn.addEventListener("click", () => {
    importCsvFile.click();
  });

  importCsvFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n");
      const newLogs = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const cols = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (cols && cols.length >= 2) {
          const taskName = cols[0].replace(/^"|"$/g, '');
          const timestamp = parseInt(cols[1]);
          if (!isNaN(timestamp)) {
            newLogs.push({ taskName, timestamp });
          }
        }
      }
      
      if (newLogs.length > 0) {
        chrome.storage.local.get({ history: [] }, (data) => {
          const merged = [...data.history, ...newLogs];
          const unique = Array.from(new Map(merged.map(item => [item.timestamp, item])).values());
          unique.sort((a, b) => a.timestamp - b.timestamp);
          
          chrome.storage.local.set({ history: unique }, () => {
            loadAndRenderRecords();
            alert(`Imported ${newLogs.length} logs successfully!`);
          });
        });
      } else {
        alert("No valid logs found in CSV.");
      }
      importCsvFile.value = "";
    };
    reader.readAsText(file);
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
        <input type="text" class="task-name" value="${task.name}" aria-label="Task name">
        <input type="number" class="task-duration" value="${task.duration}" min="1" aria-label="Task duration in minutes"> mins
        <button class="delete-btn" type="button" aria-label="Delete this task" ${localTasks.length <= 1 ? 'disabled style="opacity:0.2;"' : ""}>✕</button>
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
