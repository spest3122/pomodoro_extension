document.addEventListener("DOMContentLoaded", () => {
    const greetingEl = document.getElementById("greeting");
    const messageEl = document.getElementById("message");
    const actionBtn = document.getElementById("start-next-btn");

    // 1. Read the next session details configured by the background script
    chrome.storage.local.get(["currentMode", "workTime", "shortBreak", "longBreak", "cycleTarget"], (data) => {
        const mode = data.currentMode;

        if (mode === "work") {
            greetingEl.textContent = "☕ Break is Over!";
            messageEl.textContent = `Ready to get back to it? Next focus block is ${data.workTime} minutes.`;
            actionBtn.textContent = "💻 Start Work Session";
            actionBtn.style.backgroundColor = "#e74c3c"; // Red for work
        } else if (mode === "short-break") {
            greetingEl.textContent = "💪 Focus Block Done!";
            messageEl.textContent = `Great job. Take a quick breather for ${data.shortBreak} minutes.`;
            actionBtn.textContent = "☕ Start Short Break";
            actionBtn.style.backgroundColor = "#2ecc71"; // Green for break
        } else if (mode === "long-break") {
            greetingEl.textContent = `🏆 ${data.cycleTarget} Sessions Done! Mega Focus!`;
            messageEl.textContent = `You earned a deep rest. Take ${data.longBreak} minutes to stretch.`;
            actionBtn.textContent = "🛋️ Start Long Break";
            actionBtn.style.backgroundColor = "#3498db"; // Blue for long break
        }
    });

    // 2. Start the timer and close the tab when clicked
    actionBtn.addEventListener("click", () => {
        chrome.storage.local.get(["timeLeft", "currentMode"], (data) => {
            chrome.storage.local.set({ isRunning: true }, () => {
                chrome.alarms.create("pomodoroTimer", { periodInMinutes: 1 / 60 });

                // Force an immediate badge update so it shifts color the moment you click
                const minutesLeft = Math.ceil(data.timeLeft / 60);
                chrome.action.setBadgeText({ text: `${minutesLeft}m` });
                if (data.currentMode === 'work') chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
                if (data.currentMode === 'short-break') chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
                if (data.currentMode === 'long-break') chrome.action.setBadgeBackgroundColor({ color: "#3498db" });

                chrome.tabs.getCurrent((currentTab) => {
                    if (currentTab) {
                        chrome.tabs.remove(currentTab.id);
                    }
                });
            });
        });
    });
});