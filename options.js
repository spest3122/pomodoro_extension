document.addEventListener("DOMContentLoaded", () => {
  const tasksContainer = document.getElementById("tasks-container");
  const addTaskBtn = document.getElementById("add-task-btn");
  const shortInput = document.getElementById("short-time");
  const longInput = document.getElementById("long-time");
  const cycleInput = document.getElementById("cycle-target");
  const saveBtn = document.getElementById("save-btn");

  let localTasks = [];

  // Populate settings from storage on startup
  chrome.storage.local.get(
    ["tasks", "shortBreak", "longBreak", "cycleTarget"],
    (data) => {
      localTasks = data.tasks || [{ name: "Work 1", duration: 25 }];
      shortInput.value = data.shortBreak || 5;
      longInput.value = data.longBreak || 15;
      cycleInput.value = data.cycleTarget || 4;
      renderTasks();
    },
  );

  function renderTasks() {
    tasksContainer.innerHTML = "";
    localTasks.forEach((task, index) => {
      const row = document.createElement("div");
      row.className = "task-row";
      row.innerHTML = `
        <input type="text" class="task-name" value="${task.name}">
        <input type="number" class="task-duration" value="${task.duration}" min="1"> mins
        <button class="delete-btn" type="button" ${localTasks.length <= 1 ? 'disabled style="opacity:0.2;"' : ""}>✕</button>
      `;

      row.querySelector(".task-name").addEventListener("input", (e) => {
        localTasks[index].name = e.target.value;
      });
      row.querySelector(".task-duration").addEventListener("input", (e) => {
        localTasks[index].duration = parseInt(e.target.value) || 25;
      });

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

  saveBtn.addEventListener("click", () => {
    chrome.alarms.clear("pomodoroTimer");
    const initialSeconds = localTasks[0].duration * 60;

    chrome.storage.local.set(
      {
        tasks: localTasks,
        shortBreak: parseInt(shortInput.value) || 5,
        longBreak: parseInt(longInput.value) || 15,
        cycleTarget: parseInt(cycleInput.value) || 4,
        timeLeft: initialSeconds,
        isRunning: false,
        currentMode: "work",
        currentTaskIndex: 0,
        completedWorkSessions: 0,
      },
      () => {
        // Direct update to clear extension badge icon text back to initial task state
        chrome.action.setBadgeText({ text: `${localTasks[0].duration}m` });
        chrome.action.setBadgeBackgroundColor({ color: "#e74c3c" });
        alert("Settings saved successfully! Timer reset to your first task.");
      },
    );
  });
});
