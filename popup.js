document.addEventListener("DOMContentLoaded", () => {
    const display = document.getElementById("time-left");
    const currentTaskTitle = document.getElementById("current-task-title");
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const resetBtn = document.getElementById("reset-btn");
    const saveBtn = document.getElementById("save-settings");
    const addTaskBtn = document.getElementById("add-task-btn");
    const tasksContainer = document.getElementById("tasks-container");

    const shortInput = document.getElementById("short-time");
    const longInput = document.getElementById("long-time");
    const cycleInput = document.getElementById("cycle-target");

    let localTasks = [];
    let updateInterval;

    // Load configuration
    chrome.storage.local.get(
        ["timeLeft", "isRunning", "shortBreak", "longBreak", "cycleTarget", "tasks", "currentMode", "currentTaskIndex"],
        (data) => {
            shortInput.value = data.shortBreak || 5;
            longInput.value = data.longBreak || 15;
            cycleInput.value = data.cycleTarget || 4;

            // Default initial fallback task
            localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
            renderTasks();
            updateStatusTitle(data.currentMode, localTasks, data.currentTaskIndex || 0);
            updateUI(data.timeLeft);

            if (data.isRunning) startUIInterval();
        }
    );

    function renderTasks() {
        tasksContainer.innerHTML = "";
        localTasks.forEach((task, index) => {
            const row = document.createElement("div");
            row.className = "task-row";
            row.innerHTML = `
        <input type="text" class="task-name" value="${task.name}" placeholder="Task Name">
        <input type="number" class="task-duration" value="${task.duration}" min="1" placeholder="Min">
        <button class="delete-btn" type="button" ${localTasks.length <= 1 ? 'disabled style="opacity:0.3;"' : ''}>✕</button>
      `;

            // Sync changes instantly to our local array state
            row.querySelector(".task-name").addEventListener("input", (e) => { localTasks[index].name = e.target.value; });
            row.querySelector(".task-duration").addEventListener("input", (e) => { localTasks[index].duration = parseInt(e.target.value) || 25; });

            // Delete event handler
            row.querySelector(".delete-btn").addEventListener("click", () => {
                if (localTasks.length > 1) {
                    localTasks.splice(index, 1);
                    renderTasks();
                }
            });
            tasksContainer.appendChild(row);
        });
    }

    addTaskBtn.addEventListener("click", () => {
        if (localTasks.length < 3) {
            localTasks.push({ name: `Work ${localTasks.length + 1}`, duration: 25 });
            renderTasks();
        } else {
            alert("Maximum limit of 3 custom tasks reached.");
        }
    });

    function updateStatusTitle(mode, tasks, index) {
        if (mode === 'work') {
            const currentTask = tasks[index] || tasks[0];
            currentTaskTitle.textContent = `🎯 Focus: ${currentTask.name}`;
        } else if (mode === 'short-break') {
            currentTaskTitle.textContent = "☕ Short Break";
        } else if (mode === 'long-break') {
            currentTaskTitle.textContent = "🛋️ Long Break";
        }
    }

    function updateUI(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
        const secs = (totalSeconds % 60).toString().padStart(2, "0");
        display.textContent = `${mins}:${secs}`;
    }

    function startUIInterval() {
        clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            chrome.storage.local.get(["timeLeft", "isRunning", "currentMode", "tasks", "currentTaskIndex"], (data) => {
                updateUI(data.timeLeft);
                updateStatusTitle(data.currentMode, data.tasks || localTasks, data.currentTaskIndex || 0);
                if (!data.isRunning) clearInterval(updateInterval);
            });
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
        chrome.storage.local.set({
            isRunning: false,
            timeLeft: localTasks[0].duration * 60,
            currentMode: 'work',
            currentTaskIndex: 0,
            completedWorkSessions: 0
        });
        updateUI(localTasks[0].duration * 60);
        updateStatusTitle('work', localTasks, 0);
    });

    saveBtn.addEventListener("click", () => {
        chrome.alarms.clear("pomodoroTimer");
        clearInterval(updateInterval);

        const firstTaskDuration = localTasks[0].duration;

        chrome.storage.local.set({
            tasks: localTasks,
            shortBreak: parseInt(shortInput.value) || 5,
            longBreak: parseInt(longInput.value) || 15,
            cycleTarget: parseInt(cycleInput.value) || 4,
            timeLeft: firstTaskDuration * 60,
            isRunning: false,
            currentMode: 'work',
            currentTaskIndex: 0,
            completedWorkSessions: 0
        }, () => {
            updateUI(firstTaskDuration * 60);
            updateStatusTitle('work', localTasks, 0);
            alert("Settings saved & reset to first task!");
        });
    });
});