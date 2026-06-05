let updateInterval;

document.addEventListener("DOMContentLoaded", () => {
    const display = document.getElementById("time-left");
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const resetBtn = document.getElementById("reset-btn");
    const saveBtn = document.getElementById("save-settings");

    const workInput = document.getElementById("work-time");
    const shortInput = document.getElementById("short-time");
    const longInput = document.getElementById("long-time");

    // Load saved state and values
    chrome.storage.local.get(
        ["timeLeft", "isRunning", "workTime", "shortBreak", "longBreak"],
        (data) => {
            workInput.value = data.workTime || 25;
            shortInput.value = data.shortBreak || 5;
            longInput.value = data.longBreak || 15;
            updateUI(data.timeLeft);

            if (data.isRunning) {
                startUIInterval();
            }
        }
    );

    function updateUI(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
        const secs = (totalSeconds % 60).toString().padStart(2, "0");
        display.textContent = `${mins}:${secs}`;
    }

    function startUIInterval() {
        clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            chrome.storage.local.get(["timeLeft", "isRunning"], (data) => {
                updateUI(data.timeLeft);
                if (!data.isRunning) {
                    clearInterval(updateInterval);
                }
            });
        }, 1000);
    }

    startBtn.addEventListener("click", () => {
        chrome.storage.local.get(["isRunning", "timeLeft"], (data) => {
            if (!data.isRunning && data.timeLeft > 0) {
                chrome.storage.local.set({ isRunning: true });
                // Set an alarm to tick every 1 second
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
        chrome.storage.local.get(["workTime"], (data) => {
            const seconds = (data.workTime || 25) * 60;
            chrome.storage.local.set({
                isRunning: false,
                timeLeft: seconds,
                currentMode: 'work',
                completedWorkSessions: 0
            });
            updateUI(seconds);
        });
    });

    saveBtn.addEventListener("click", () => {
        const workMins = parseInt(workInput.value) || 25;
        const shortMins = parseInt(shortInput.value) || 5;
        const longMins = parseInt(longInput.value) || 15;

        chrome.alarms.clear("pomodoroTimer");
        clearInterval(updateInterval);

        chrome.storage.local.set({
            workTime: workMins,
            shortBreak: shortMins,
            longBreak: longMins,
            timeLeft: workMins * 60,
            isRunning: false,
            currentMode: 'work'
        }, () => {
            updateUI(workMins * 60);
            alert("Settings saved!");
        });
    });
});