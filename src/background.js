// In-memory lock: prevents two simultaneous alarm callbacks (pomodoroTimer +
// pomodoroBadge) from both executing the "timer done" branch at the same time.
let handlingAlarm = false;

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
    lastSessionDate: "",
  });
  updateBadge(25 * 60, "work");
});

function updateBadge(timeLeft, mode) {
  if (timeLeft <= 0) {
    chrome.action.setBadgeText({ text: "DONE" });
    chrome.action.setBadgeBackgroundColor({ color: "#2c3e50" });
    return;
  }
  // Use Math.floor to match the popup's mm:ss display (floor of minutes)
  const minutesLeft = Math.floor(timeLeft / 60);
  const badgeText = minutesLeft > 0 ? `${minutesLeft}m` : "<1m";
  chrome.action.setBadgeText({ text: badgeText });
  if (mode === "work")
    chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
  else if (mode === "short-break")
    chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
  else if (mode === "long-break")
    chrome.action.setBadgeBackgroundColor({ color: "#3498db" });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  // ── Bug Fix #1: Double tab-open guard ────────────────────────────────────
  // Both "pomodoroTimer" and "pomodoroBadge" alarms previously shared the same
  // handler branch, so when the timer expired both could fire at nearly the same
  // time and each would open break.html — causing a double tab.
  //
  // Fix: Only "pomodoroTimer" (the one-shot alarm that fires at endTime) may
  // trigger the "done" logic. "pomodoroBadge" (the per-minute repeating alarm)
  // is now limited to updating the badge display only.
  //
  // ── Bug Fix #2: Badge sync ────────────────────────────────────────────────
  // "pomodoroBadge" fires every 60 s. We now compute the badge time from
  // endTime (exact epoch ms) so it is always accurate at the moment it updates.
  // When the popup is open its own setInterval updates the badge every second,
  // giving perfect sync while the user is watching.

  // ── pomodoroBadge: badge-only update (runs every 60 s in background) ──────
  if (alarm.name === "pomodoroBadge") {
    chrome.storage.local.get(["endTime", "timeLeft", "isRunning", "currentMode"], (data) => {
      if (!data.isRunning) return;
      let time = data.timeLeft;
      if (data.endTime) {
        time = Math.max(0, Math.round((data.endTime - Date.now()) / 1000));
      }
      updateBadge(time, data.currentMode);
    });
    return;
  }

  // ── pomodoroTimer: one-shot alarm that fires at endTime ───────────────────
  if (alarm.name !== "pomodoroTimer") return;

  if (handlingAlarm) return;   // safety guard against duplicate firings
  handlingAlarm = true;

  chrome.storage.local.get(
    [
      "timeLeft",
      "endTime",
      "currentMode",
      "completedWorkSessions",
      "lastSessionDate",
      "cycleTarget",
      "tasks",
      "currentTaskIndex",
      "shortBreak",
      "longBreak",
      "isRunning"
    ],
    (data) => {
      handlingAlarm = false; // release lock after storage read

      if (!data.isRunning) return;

      let time = data.timeLeft;
      if (data.endTime) {
        time = Math.max(0, Math.round((data.endTime - Date.now()) / 1000));
      } else {
        time -= 1;
      }

      if (time <= 0) {
        chrome.alarms.clear("pomodoroTimer");
        chrome.alarms.clear("pomodoroBadge"); // clear legacy alarm if present

        if (data.currentMode === "work") {
          // Reset completedWorkSessions if the day has changed
          const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
          let nextCount =
            data.lastSessionDate === today ? data.completedWorkSessions : 0;
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
          let nextMode = (nextCount % target === 0) ? "long-break" : "short-break";

          let nextTimeLeft = 25 * 60;
          if (nextMode === "short-break") {
            nextTimeLeft = (data.shortBreak || 5) * 60;
          } else if (nextMode === "long-break") {
            nextTimeLeft = (data.longBreak || 15) * 60;
          }

          chrome.storage.local.set(
            {
              currentMode: nextMode,
              lastCompletedMode: data.currentMode,
              completedWorkSessions: nextCount,
              lastSessionDate: today,
              isRunning: false,
              timeLeft: nextTimeLeft,
            },
            () => {
              updateBadge(0, data.currentMode);
              // Open the break tab
              chrome.tabs.create(
                { url: chrome.runtime.getURL("break.html") },
                (newTab) => {
                  chrome.windows.update(newTab.windowId, {
                    focused: true,
                    drawAttention: true,
                  });
                },
              );
            },
          );
        } else {
          // Break ended → return to work mode
          const tasksList = data.tasks || [
            { name: "Work Session", duration: 25 },
          ];
          const currentTaskIdx = data.currentTaskIndex || 0;
          const nextTaskDuration = tasksList[currentTaskIdx]?.duration || 25;
          const nextTimeLeft = nextTaskDuration * 60;

          chrome.storage.local.set(
            {
              currentMode: "work",
              lastCompletedMode: data.currentMode,
              isRunning: false,
              timeLeft: nextTimeLeft,
            },
            () => {
              updateBadge(0, data.currentMode);
              chrome.tabs.create(
                { url: chrome.runtime.getURL("break.html") },
                (newTab) => {
                  chrome.windows.update(newTab.windowId, {
                    focused: true,
                    drawAttention: true,
                  });
                },
              );
            },
          );
        }
      } else {
        // Timer still running — store accurate time and sync badge to exact seconds
        chrome.storage.local.set({ timeLeft: time });
        updateBadge(time, data.currentMode);
      }
    },
  );
});
