document.addEventListener("DOMContentLoaded", () => {
    const greetingEl = document.getElementById("greeting");
    const messageEl = document.getElementById("message");
    const container = document.getElementById("action-buttons-container");

    const tomatoesLeftEl = document.getElementById("tomatoes-left");

    chrome.storage.local.get(["currentMode", "lastCompletedMode", "tasks", "shortBreak", "longBreak", "soundWork", "soundShortBreak", "soundLongBreak", "cycleTarget", "completedWorkSessions"], (data) => {
        const lastMode = data.lastCompletedMode;
        let shouldPlaySound = true;

        if (lastMode === "work" && data.soundWork === false) shouldPlaySound = false;
        if (lastMode === "short-break" && data.soundShortBreak === false) shouldPlaySound = false;
        if (lastMode === "long-break" && data.soundLongBreak === false) shouldPlaySound = false;

        if (shouldPlaySound) {
            playSound();
        }

        const mode = data.currentMode;
        const tasksList = data.tasks || [{ name: "Work 1", duration: 25 }];

        container.innerHTML = ""; // Clear loader text

        if (mode === "short-break" || mode === "long-break") {
            // --- WORK JUST ENDED -> START A BREAK ---
            const isLong = (mode === "long-break");
            greetingEl.textContent = isLong ? "🏆 Outstanding Mega Focus!" : "💪 Focus Session Finished!";
            const breakMins = isLong ? data.longBreak : data.shortBreak;
            messageEl.textContent = `Time to step away and reset for ${breakMins} minutes.`;

            if (!isLong) {
                const target = data.cycleTarget || 4;
                const completed = data.completedWorkSessions || 0;
                const tomatoesLeft = target - (completed % target);
                if (tomatoesLeft > 0 && tomatoesLeft < target) {
                    tomatoesLeftEl.textContent = `🍅 ${tomatoesLeft} tomato${tomatoesLeft > 1 ? 'es' : ''} left until long break`;
                    tomatoesLeftEl.style.display = "block";
                }
            }

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

    // Function to play a notification sound using the Web Audio API
    function playSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            function playTone(freq, startTime, duration) {
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, startTime);
                
                gainNode.gain.setValueAtTime(0.1, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            }
            
            const now = audioCtx.currentTime;
            playTone(880, now, 0.5);       // A5
            playTone(1046.50, now + 0.3, 0.5); // C6
        } catch (e) {
            console.error("Audio play failed:", e);
        }
    }
});