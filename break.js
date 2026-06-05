document.addEventListener("DOMContentLoaded", () => {
    const greetingEl = document.getElementById("greeting");
    const messageEl = document.getElementById("message");
    const container = document.getElementById("action-buttons-container");

    chrome.storage.local.get(["currentMode", "tasks", "shortBreak", "longBreak"], (data) => {
        const mode = data.currentMode;
        const tasksList = data.tasks || [{ name: "Work 1", duration: 25 }];

        container.innerHTML = ""; // Clear loader text

        if (mode === "short-break" || mode === "long-break") {
            // --- WORK JUST ENDED -> START A BREAK ---
            const isLong = (mode === "long-break");
            greetingEl.textContent = isLong ? "🏆 Outstanding Mega Focus!" : "💪 Focus Session Finished!";
            const breakMins = isLong ? data.longBreak : data.shortBreak;
            messageEl.textContent = `Time to step away and reset for ${breakMins} minutes.`;

            // Create a single button to kick off the break countdown
            const breakBtn = document.createElement("button");
            breakBtn.className = "btn";
            breakBtn.textContent = isLong ? "🛋️ Start Long Break" : "☕ Start Short Break";
            breakBtn.style.backgroundColor = isLong ? "#3498db" : "#2ecc71";

            breakBtn.addEventListener("click", () => {
                startSessionSequence(breakMins * 60, mode);
            });
            container.appendChild(breakBtn);

        } else {
            // --- BREAK JUST ENDED -> USER CHOOSES NEXT WORK TASK ---
            greetingEl.textContent = "☕ Break is Over!";
            messageEl.textContent = "Which focus block would you like to tackle next?";

            // Dynamically map every user task into its own interactive dashboard button
            tasksList.forEach((task, index) => {
                const taskBtn = document.createElement("button");
                taskBtn.className = "btn";
                taskBtn.textContent = `🎯 ${task.name} (${task.duration}m)`;

                // Give buttons a distinct color scheme so they look distinct
                const colors = ["#e74c3c", "#9b59b6", "#34495e"];
                taskBtn.style.backgroundColor = colors[index % colors.length];

                taskBtn.addEventListener("click", () => {
                    // Update the background task index to match the selected button
                    chrome.storage.local.set({ currentTaskIndex: index }, () => {
                        startSessionSequence(task.duration * 60, "work");
                    });
                });
                container.appendChild(taskBtn);
            });
        }
    });

    // Reusable function to engage the background timer and terminate the tab
    function startSessionSequence(seconds, mode) {
        chrome.storage.local.set({ timeLeft: seconds, isRunning: true, currentMode: mode }, () => {
            chrome.alarms.create("pomodoroTimer", { periodInMinutes: 1 / 60 });

            // Update badge aesthetics instantly
            const minutesLeft = Math.ceil(seconds / 60);
            chrome.action.setBadgeText({ text: `${minutesLeft}m` });
            if (mode === 'work') chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
            else if (mode === 'short-break') chrome.action.setBadgeBackgroundColor({ color: "#2ecc71" });
            else if (mode === 'long-break') chrome.action.setBadgeBackgroundColor({ color: "#3498db" });

            chrome.tabs.getCurrent((currentTab) => {
                if (currentTab) chrome.tabs.remove(currentTab.id);
            });
        });
    }
});