chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        timeLeft: 25 * 60,
        cycleTarget: 4, // Added default target
        isRunning: false,
        currentMode: 'work',
        completedWorkSessions: 0
    });
});

// HELPER FUNCTION: Controls color scheme and text updates on your toolbar icon
function updateBadge(timeLeft, mode) {
    if (timeLeft <= 0) {
        chrome.action.setBadgeText({ text: "DONE" });
        chrome.action.setBadgeBackgroundColor({ color: "#2c3e50" }); // Dark slate gray
        return;
    }

    const minutesLeft = Math.ceil(timeLeft / 60);
    chrome.action.setBadgeText({ text: `${minutesLeft}m` });

    // Select background color based on status
    if (mode === 'work') {
        chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" }); // Bright Red
    } else if (mode === 'short-break') {
        chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" }); // Bright Green
    } else if (mode === 'long-break') {
        chrome.action.setBadgeBackgroundColor({ color: "#3498db" }); // Bright Blue
    }
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroTimer") {
        chrome.storage.local.get([
            "timeLeft", "currentMode", "workTime", "shortBreak", "longBreak", "completedWorkSessions", "cycleTarget"
        ], (data) => {
            let time = data.timeLeft - 1;

            if (time <= 0) {
                // 1. FIX: Stop the current alarm loop completely
                chrome.alarms.clear("pomodoroTimer");

                // Calculate the NEXT session state
                let nextMode = 'work';
                let nextCount = data.completedWorkSessions;

                if (data.currentMode === 'work') {
                    nextCount++;
                    const target = data.cycleTarget || 4;
                    if (nextCount % target === 0) {
                        nextMode = 'long-break';
                    } else {
                        nextMode = 'short-break';
                    }
                } else {
                    nextMode = 'work';
                }

                let nextMins = data.workTime;
                if (nextMode === 'short-break') nextMins = data.shortBreak;
                if (nextMode === 'long-break') nextMins = data.longBreak;

                let nextSeconds = nextMins * 60;

                // 2. FIX: Save the setup for the next session but keep isRunning as FALSE
                chrome.storage.local.set({
                    currentMode: nextMode,
                    timeLeft: nextSeconds,
                    completedWorkSessions: nextCount,
                    isRunning: false
                }, () => {
                    // Open the alert tab, but don't start the countdown yet
                    updateBadge(0, data.currentMode); // Mark badge as "DONE"
                    chrome.tabs.create({ url: chrome.runtime.getURL("break.html") });
                });

            } else {
                chrome.storage.local.set({ timeLeft: time });
                updateBadge(time, data.currentMode); // Update live countdown on badge
            }
        });
    }
});