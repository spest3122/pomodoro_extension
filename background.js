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
      ["timeLeft", "currentMode", "completedWorkSessions", "cycleTarget"],
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

          chrome.storage.local.set(
            {
              currentMode: nextMode,
              completedWorkSessions: nextCount,
              isRunning: false,
            },
            () => {
              updateBadge(0, data.currentMode);
              chrome.tabs.create({ url: chrome.runtime.getURL("break.html") });
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
