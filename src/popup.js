document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("time-left");
  const currentTaskTitle = document.getElementById("current-task-title");
  const taskBtnRow = document.getElementById("task-btn-row");
  const shortBreakBtn = document.getElementById("short-break-btn");
  const longBreakBtn = document.getElementById("long-break-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const openSettingsLink = document.getElementById("open-settings");

  let localTasks = [];
  let updateInterval;

  // ── Boot: read state from storage ────────────────────────────────────────
  chrome.storage.local.get(
    ["timeLeft", "endTime", "isRunning", "tasks", "currentMode", "currentTaskIndex",
     "shortBreak", "longBreak"],
    (data) => {
      localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
      const currentIndex = data.currentTaskIndex || 0;
      const isRunning = !!data.isRunning;
      const mode = data.currentMode || "work";

      // Calculate accurate display time using endTime if the timer is running
      let displayTime = data.timeLeft;
      if (isRunning && data.endTime) {
        displayTime = Math.max(0, Math.round((data.endTime - Date.now()) / 1000));
      }

      updateStatusTitle(mode, localTasks, currentIndex);
      updateUI(displayTime);
      renderAllButtons({ mode, isRunning, activeTaskIndex: currentIndex });

      // Reveal the timer only after real data is loaded — prevents flash of "25:00"
      display.style.visibility = "visible";
      currentTaskTitle.style.visibility = "visible";

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

  // ── Badge helper (mirrors background.js updateBadge) ─────────────────────
  function updateBadgeNow(seconds, mode) {
    const minutesLeft = Math.ceil(seconds / 60);
    chrome.action.setBadgeText({ text: minutesLeft > 0 ? `${minutesLeft}m` : "DONE" });
    if (mode === "work")
      chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
    else if (mode === "short-break")
      chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
    else if (mode === "long-break")
      chrome.action.setBadgeBackgroundColor({ color: "#3498db" });
  }

  // ── Unified button state renderer ─────────────────────────────────────────
  /**
   * Drives the enabled/active state of ALL interactive buttons from one place.
   *
   * @param {object} state
   *   mode           - "work" | "short-break" | "long-break"
   *   isRunning      - bool
   *   activeTaskIndex - number (index of current work task)
   */
  function renderAllButtons({ mode, isRunning, activeTaskIndex }) {
    renderTaskButtons(localTasks, activeTaskIndex, mode, isRunning);
    renderBreakButtons(mode, isRunning);
  }

  // ── Task Buttons ──────────────────────────────────────────────────────────
  /**
   * Rules:
   *  - Active task button = filled color (only meaningful when mode === "work")
   *  - Running (any mode): non-active task buttons disabled
   *  - Break running: ALL task buttons disabled
   *  - Click active task while RUNNING  → nothing
   *  - Click active task while PAUSED   → resume from stored timeLeft
   *  - Click different task (idle/paused) → start fresh
   */
  function renderTaskButtons(tasks, activeIndex, mode, isRunning) {
    taskBtnRow.innerHTML = "";
    const inBreak = mode === "short-break" || mode === "long-break";

    tasks.forEach((task, index) => {
      const btn = document.createElement("button");
      const isActiveTask = mode === "work" && index === activeIndex;

      btn.className = `task-btn task-btn-${index}` + (isActiveTask ? " active" : "");
      btn.textContent = `${task.name} (${task.duration}min)`;
      btn.title = `${task.name} — ${task.duration} minutes`;

      // Disable when: a break is actively RUNNING, OR timer is running on a different task
      if ((inBreak && isRunning) || (isRunning && !isActiveTask)) {
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        // Active work task running → do nothing
        if (isActiveTask && isRunning) return;

        chrome.alarms.clear("pomodoroTimer");
        chrome.alarms.clear("pomodoroBadge");
        clearInterval(updateInterval);

        if (isActiveTask && !isRunning) {
          // ── RESUME: same task was paused ──────────────────────────────────
          chrome.storage.local.get(["timeLeft"], (data) => {
            const seconds = data.timeLeft;
            const endTime = Date.now() + seconds * 1000;
            chrome.storage.local.set(
              { isRunning: true, currentMode: "work", endTime: endTime },
              () => {
                chrome.alarms.create("pomodoroTimer", { when: endTime });
                chrome.alarms.create("pomodoroBadge", { periodInMinutes: 1 });
                updateBadgeNow(seconds, "work");
                updateUI(seconds);
                updateStatusTitle("work", tasks, index);
                renderAllButtons({ mode: "work", isRunning: true, activeTaskIndex: index });
                startUIInterval();
              },
            );
          });
        } else {
          // ── START FRESH: different task ───────────────────────────────────
          const seconds = task.duration * 60;
          const endTime = Date.now() + seconds * 1000;
          chrome.storage.local.set(
            {
              isRunning: true,
              currentMode: "work",
              currentTaskIndex: index,
              timeLeft: seconds,
              endTime: endTime,
            },
            () => {
              chrome.alarms.create("pomodoroTimer", { when: endTime });
              chrome.alarms.create("pomodoroBadge", { periodInMinutes: 1 });
              updateBadgeNow(seconds, "work");
              updateUI(seconds);
              updateStatusTitle("work", tasks, index);
              renderAllButtons({ mode: "work", isRunning: true, activeTaskIndex: index });
              startUIInterval();
            },
          );
        }
      });

      taskBtnRow.appendChild(btn);
    });
  }

  // ── Break Buttons ─────────────────────────────────────────────────────────
  /**
   * Rules:
   *  - Active break button = filled color
   *  - Disabled when: a task or the OTHER break is running
   *  - Clicking a break button starts that break fresh from stored duration
   */
  function renderBreakButtons(mode, isRunning) {
    const shortActive = mode === "short-break";
    const longActive  = mode === "long-break";
    const taskRunning = mode === "work" && isRunning;

    // Short break button state
    shortBreakBtn.classList.toggle("active", shortActive);
    shortBreakBtn.disabled = taskRunning || (isRunning && longActive);

    // Long break button state
    longBreakBtn.classList.toggle("active", longActive);
    longBreakBtn.disabled = taskRunning || (isRunning && shortActive);
  }

  function startBreak(breakMode) {
    chrome.alarms.clear("pomodoroTimer");
    chrome.alarms.clear("pomodoroBadge");
    clearInterval(updateInterval);

    chrome.storage.local.get(
      ["shortBreak", "longBreak", "currentTaskIndex", "currentMode", "isRunning", "timeLeft"],
      (data) => {
        const activeTaskIndex = data.currentTaskIndex || 0;
        const isPaused = !data.isRunning && data.currentMode === breakMode;

        if (isPaused) {
          // ── RESUME: same break was paused — continue from stored timeLeft ──
          const seconds = data.timeLeft;
          const endTime = Date.now() + seconds * 1000;
          chrome.storage.local.set(
            { isRunning: true, endTime: endTime },
            () => {
              chrome.alarms.create("pomodoroTimer", { when: endTime });
              chrome.alarms.create("pomodoroBadge", { periodInMinutes: 1 });
              updateBadgeNow(seconds, breakMode);
              updateUI(seconds);
              updateStatusTitle(breakMode, localTasks, activeTaskIndex);
              renderAllButtons({ mode: breakMode, isRunning: true, activeTaskIndex });
              startUIInterval();
            },
          );
        } else {
          // ── START FRESH: different break or first click — reset duration ──
          const duration = breakMode === "short-break"
            ? (data.shortBreak || 5)
            : (data.longBreak || 15);
          const seconds = duration * 60;
          const endTime = Date.now() + seconds * 1000;

          chrome.storage.local.set(
            { isRunning: true, currentMode: breakMode, timeLeft: seconds, endTime: endTime },
            () => {
              chrome.alarms.create("pomodoroTimer", { when: endTime });
              chrome.alarms.create("pomodoroBadge", { periodInMinutes: 1 });
              updateBadgeNow(seconds, breakMode);
              updateUI(seconds);
              updateStatusTitle(breakMode, localTasks, activeTaskIndex);
              renderAllButtons({ mode: breakMode, isRunning: true, activeTaskIndex });
              startUIInterval();
            },
          );
        }
      },
    );
  }

  shortBreakBtn.addEventListener("click", () => startBreak("short-break"));
  longBreakBtn.addEventListener("click", () => startBreak("long-break"));

  // ── Polling interval ──────────────────────────────────────────────────────
  function startUIInterval() {
    clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      chrome.storage.local.get(
        ["timeLeft", "endTime", "isRunning", "currentMode", "tasks", "currentTaskIndex"],
        (data) => {
          const mode = data.currentMode || "work";
          const isRunning = !!data.isRunning;
          localTasks = data.tasks || localTasks;
          const activeTaskIndex = data.currentTaskIndex || 0;

          let displayTime = data.timeLeft;
          if (isRunning && data.endTime) {
            displayTime = Math.max(0, Math.round((data.endTime - Date.now()) / 1000));
          }

          updateUI(displayTime);
          updateStatusTitle(mode, localTasks, activeTaskIndex);

          if (!isRunning) {
            clearInterval(updateInterval);
            renderAllButtons({ mode, isRunning: false, activeTaskIndex });
          }
        },
      );
    }, 1000);
  }

  // ── Pause ─────────────────────────────────────────────────────────────────
  pauseBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    chrome.alarms.clear("pomodoroBadge");
    clearInterval(updateInterval);
    chrome.storage.local.get(["tasks", "currentTaskIndex", "currentMode", "endTime", "timeLeft", "isRunning"], (data) => {
      if (!data.isRunning) return;
      const mode = data.currentMode || "work";
      localTasks = data.tasks || localTasks;
      
      let currentTimeLeft = data.timeLeft;
      if (data.endTime) {
        currentTimeLeft = Math.max(0, Math.round((data.endTime - Date.now()) / 1000));
      }

      chrome.storage.local.set({ isRunning: false, timeLeft: currentTimeLeft });
      updateUI(currentTimeLeft);

      renderAllButtons({
        mode,
        isRunning: false,
        activeTaskIndex: data.currentTaskIndex || 0,
      });
    });
  });

  // ── Reset ─────────────────────────────────────────────────────────────────
  resetBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    chrome.alarms.clear("pomodoroBadge");
    clearInterval(updateInterval);
    chrome.storage.local.get(
      ["tasks", "currentTaskIndex", "currentMode", "shortBreak", "longBreak"],
      (data) => {
        const mode = data.currentMode || "work";
        const activeTaskIndex = data.currentTaskIndex || 0;
        localTasks = data.tasks || localTasks;

        let seconds;
        if (mode === "short-break") {
          seconds = (data.shortBreak || 5) * 60;
        } else if (mode === "long-break") {
          seconds = (data.longBreak || 15) * 60;
        } else {
          seconds = localTasks[activeTaskIndex].duration * 60;
        }

        chrome.storage.local.set({ isRunning: false, timeLeft: seconds });
        updateUI(seconds);
        renderAllButtons({ mode, isRunning: false, activeTaskIndex });
      },
    );
  });

  // ── Settings link ─────────────────────────────────────────────────────────
  openSettingsLink.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
