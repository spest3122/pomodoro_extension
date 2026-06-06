document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("time-left");
  const currentTaskTitle = document.getElementById("current-task-title");
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const resetBtn = document.getElementById("reset-btn");
  const openSettingsLink = document.getElementById("open-settings");

  let localTasks = [];
  let updateInterval;

  // Load active runtime configurations
  chrome.storage.local.get(
    ["timeLeft", "isRunning", "tasks", "currentMode", "currentTaskIndex"],
    (data) => {
      localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
      updateStatusTitle(
        data.currentMode,
        localTasks,
        data.currentTaskIndex || 0,
      );
      updateUI(data.timeLeft);

      if (data.isRunning) startUIInterval();
    },
  );

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
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    display.textContent = `${mins}:${secs}`;
  }

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
          if (!data.isRunning) clearInterval(updateInterval);
        },
      );
    }, 1000);
  }

  startBtn.addEventListener("click", () => {
    chrome.storage.local.get(["isRunning", "timeLeft"], (data) => {
      if (!data.isRunning && data.timeLeft > 0) {
        chrome.storage.local.set({ isRunning: true });
        chrome.alarms.create("pomodoroTimer", { periodInMinutes: 1 / 60 });
        startUIInterval();
      }
    });
  });

  pauseBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    chrome.storage.local.set({ isRunning: false });
    clearInterval(updateInterval);
  });

  resetBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    clearInterval(updateInterval);
    chrome.storage.local.get(["tasks", "currentTaskIndex"], (data) => {
      const list = data.tasks || localTasks;
      const idx = data.currentTaskIndex || 0;
      const seconds = list[idx].duration * 60;
      chrome.storage.local.set({ isRunning: false, timeLeft: seconds });
      updateUI(seconds);
    });
  });

  // Action hook to launch configuration dashboard
  openSettingsLink.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});
