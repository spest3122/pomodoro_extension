chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    tasks: [
      { name: "Reading", duration: 25 },
      { name: "Develop", duration: 50 },
    ],
    shortBreak: 5,
    longBreak: 15,
    cycleTarget: 4,
    timeLeft: 25 * 60,
    isRunning: false,
    currentMode: "work",
    currentTaskIndex: 0,
    completedWorkSessions: 0,
  });
  updateBadge(25 * 60, "work");
});

function updateBadge(timeLeft, mode) {
  if (timeLeft <= 0) {
    chrome.action.setBadgeText({ text: "DONE" });
    chrome.action.setBadgeBackgroundColor({ color: "#2c3e50" });
    return;
  }
  const minutesLeft = Math.ceil(timeLeft / 60);
  chrome.action.setBadgeText({ text: `${minutesLeft}m` });
  if (mode === "work")
    chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
  else if (mode === "short-break")
    chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
  else if (mode === "long-break")
    chrome.action.setBadgeBackgroundColor({ color: "#3498db" });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "pomodoroTimer") {
    chrome.storage.local.get(
      [
        "timeLeft",
        "currentMode",
        "completedWorkSessions",
        "cycleTarget",
        "tasks",
        "currentTaskIndex",
        "shortBreak",
        "longBreak",
      ],
      (data) => {
        let time = data.timeLeft - 1;

        if (time <= 0) {
          chrome.alarms.clear("pomodoroTimer");

          let nextMode = "work";
          let nextCount = data.completedWorkSessions;

          if (data.currentMode === "work") {
            nextCount++;

            chrome.storage.local.get({ history: [] }, (historyData) => {
              let currentHistory = historyData.history;

              // Get current task name safely
              const tasksList = data.tasks || [
                { name: "Work Session", duration: 25 },
              ];
              const currentTaskIdx = data.currentTaskIndex || 0;
              const finishedTaskName =
                tasksList[currentTaskIdx]?.name || "Work Session";

              // Push history log object
              currentHistory.push({
                taskName: finishedTaskName,
                timestamp: Date.now(), // Precise log tracking time
              });
              chrome.storage.local.set({ history: currentHistory });
            });

            const target = data.cycleTarget || 4;
            if (nextCount % target === 0) {
              nextMode = "long-break";
            } else {
              nextMode = "short-break";
            }
          } else {
            // If a break ended, we transition into selection mode
            nextMode = "work";
          }

          let nextTimeLeft = 25 * 60;
          if (nextMode === "short-break") {
            nextTimeLeft = (data.shortBreak || 5) * 60;
          } else if (nextMode === "long-break") {
            nextTimeLeft = (data.longBreak || 15) * 60;
          } else {
            const tasksList = data.tasks || [
              { name: "Work Session", duration: 25 },
            ];
            const currentTaskIdx = data.currentTaskIndex || 0;
            const nextTaskDuration = tasksList[currentTaskIdx]?.duration || 25;
            nextTimeLeft = nextTaskDuration * 60;
          }

          chrome.storage.local.set(
            {
              currentMode: nextMode,
              completedWorkSessions: nextCount,
              isRunning: false,
              timeLeft: nextTimeLeft,
            },
            () => {
              updateBadge(0, data.currentMode);
              // 1. Open the break tab
              chrome.tabs.create(
                { url: chrome.runtime.getURL("break.html") },
                (newTab) => {
                  // 2. Query the current window that contains this new tab
                  chrome.windows.get(newTab.windowId, (currentWindow) => {
                    // 3. FORCE Chrome to bring the window into active viewport focus
                    chrome.windows.update(newTab.windowId, {
                      focused: true,
                      drawAttention: true, // Causes taskbar/dock icon to flash on Windows/Mac
                    });
                  });
                },
              );
            },
          );
        } else {
          chrome.storage.local.set({ timeLeft: time });
          updateBadge(time, data.currentMode);
        }
      },
    );
  }
});
