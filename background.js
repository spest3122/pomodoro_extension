chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({
        workTime: 25,
        shortBreak: 5,
        longBreak: 15,
        timeLeft: 25 * 60,
        isRunning: false,
        currentMode: 'work',
        completedWorkSessions: 0
    });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "pomodoroTimer") {
        chrome.storage.local.get([
            "timeLeft", "currentMode", "workTime", "shortBreak", "longBreak", "completedWorkSessions"
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
                    if (nextCount % 4 === 0) {
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
                    chrome.tabs.create({ url: chrome.runtime.getURL("break.html") });
                });

            } else {
                chrome.storage.local.set({ timeLeft: time });
            }
        });
    }
});