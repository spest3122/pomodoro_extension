document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("time-left");
  const currentTaskTitle = document.getElementById("current-task-title");
  const taskBtnRow = document.getElementById("task-btn-row");
  const pauseBtn = document.getElementById("pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const openSettingsLink = document.getElementById("open-settings");

  let localTasks = [];
  let updateInterval;

  // ── Boot: read state from storage ────────────────────────────────────────
  chrome.storage.local.get(
    ["timeLeft", "isRunning", "tasks", "currentMode", "currentTaskIndex"],
    (data) => {
      localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
      const currentIndex = data.currentTaskIndex || 0;
      const isRunning = !!data.isRunning;

      updateStatusTitle(data.currentMode, localTasks, currentIndex);
      updateUI(data.timeLeft);
      renderTaskButtons(localTasks, currentIndex, isRunning);

      if (isRunning) startUIInterval();
    },
  );

  // ── Helpers ───────────────────────────────────────────────────────────────
  function updateStatusTitle(mode, tasks, index) {
    if (mode === "work") {
      const currentTask = tasks[index] || tasks[0];
      currentTaskTitle.textContent = `🎯 Focus: ${currentTask.name}`;
    } else {
      currentTaskTitle.textContent =
        mode === "short-break" ? "☕ Short Break" : "🛋️ Long Break";
    }
  }

  function updateUI(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    display.textContent = `${mins}:${secs}`;
  }

  // ── Task Buttons ──────────────────────────────────────────────────────────
  /**
   * Renders one button per task.
   *
   * Rules:
   *  - Active task button = filled color
   *  - When running: all other task buttons are disabled
   *  - Click active button while RUNNING  → nothing (use Pause to stop)
   *  - Click active button while PAUSED   → resume from current timeLeft
   *  - Click different button while paused/idle → start that task fresh;
   *                                               previously paused task resets
   */
  function renderTaskButtons(tasks, activeIndex, isRunning) {
    taskBtnRow.innerHTML = "";
    tasks.forEach((task, index) => {
      const btn = document.createElement("button");
      const isActive = index === activeIndex;

      btn.className = `task-btn task-btn-${index}` + (isActive ? " active" : "");
      btn.textContent = `${task.name} (${task.duration}min)`;
      btn.title = `${task.name} — ${task.duration} minutes`;

      // Disable non-active buttons while timer is running
      if (isRunning && !isActive) {
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        // Active + running → do nothing (Pause is the only way to stop)
        if (isActive && isRunning) return;

        chrome.alarms.clear("pomodoroTimer");
        clearInterval(updateInterval);

        if (isActive && !isRunning) {
          // ── RESUME: same task was paused — continue from stored timeLeft ──
          chrome.storage.local.get(["timeLeft"], (data) => {
            chrome.storage.local.set(
              { isRunning: true, currentMode: "work" },
              () => {
                chrome.alarms.create("pomodoroTimer", { periodInMinutes: 1 / 60 });
                updateUI(data.timeLeft);
                updateStatusTitle("work", tasks, index);
                renderTaskButtons(tasks, index, true);
                startUIInterval();
              },
            );
          });
        } else {
          // ── START FRESH: different task clicked — reset its time & start ──
          const seconds = task.duration * 60;
          chrome.storage.local.set(
            {
              isRunning: true,
              currentMode: "work",
              currentTaskIndex: index,
              timeLeft: seconds,
            },
            () => {
              chrome.alarms.create("pomodoroTimer", { periodInMinutes: 1 / 60 });
              updateUI(seconds);
              updateStatusTitle("work", tasks, index);
              renderTaskButtons(tasks, index, true);
              startUIInterval();
            },
          );
        }
      });

      taskBtnRow.appendChild(btn);
    });
  }

  // ── Polling interval (updates display while running) ─────────────────────
  function startUIInterval() {
    clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      chrome.storage.local.get(
        ["timeLeft", "isRunning", "currentMode", "tasks", "currentTaskIndex"],
        (data) => {
          updateUI(data.timeLeft);
          updateStatusTitle(
            data.currentMode,
            data.tasks || localTasks,
            data.currentTaskIndex || 0,
          );
          // If background stopped the timer (break started etc.), unlock buttons
          if (!data.isRunning) {
            clearInterval(updateInterval);
            renderTaskButtons(
              data.tasks || localTasks,
              data.currentTaskIndex || 0,
              false,
            );
          }
        },
      );
    }, 1000);
  }

  // ── Pause ─────────────────────────────────────────────────────────────────
  pauseBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    chrome.storage.local.set({ isRunning: false });
    clearInterval(updateInterval);
    // Re-render buttons in unlocked state so user can switch tasks
    chrome.storage.local.get(["tasks", "currentTaskIndex"], (data) => {
      renderTaskButtons(
        data.tasks || localTasks,
        data.currentTaskIndex || 0,
        false,
      );
    });
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    clearInterval(updateInterval);
    chrome.storage.local.get(["tasks", "currentTaskIndex"], (data) => {
      const list = data.tasks || localTasks;
      const idx = data.currentTaskIndex || 0;
      const seconds = list[idx].duration * 60;
      chrome.storage.local.set({ isRunning: false, timeLeft: seconds });
      updateUI(seconds);
      renderTaskButtons(list, idx, false);
    });
  });

  // ── Settings link ─────────────────────────────────────────────────────────
  openSettingsLink.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
