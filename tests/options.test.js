describe("options.js", () => {
  let tasksContainer, addTaskBtn, shortInput, longInput, cycleInput, saveBtn;
  let navSettings, navRecords, contentSettings, contentRecords;
  let todayCountEl, historyLogContainer, clearHistoryBtn;

  beforeEach(() => {
    global.clearAllEventListeners();
    // Setup clean DOM structure representing options.html
    document.body.innerHTML = `
      <button id="nav-settings" class="active">Configurations</button>
      <button id="nav-records">Records History</button>

      <div id="content-settings" class="active">
        <button id="add-task-btn">+ Add Task</button>
        <div id="tasks-container"></div>
        <input type="number" id="short-time" />
        <input type="number" id="long-time" />
        <input type="number" id="cycle-target" />
        <button id="save-btn">Save Configurations</button>
      </div>

      <div id="content-records">
        <div id="today-count">0</div>
        <button id="clear-history-btn">Clear All Logs</button>
        <ul id="history-log-container"></ul>
      </div>
    `;

    tasksContainer = document.getElementById("tasks-container");
    addTaskBtn = document.getElementById("add-task-btn");
    shortInput = document.getElementById("short-time");
    longInput = document.getElementById("long-time");
    cycleInput = document.getElementById("cycle-target");
    saveBtn = document.getElementById("save-btn");

    navSettings = document.getElementById("nav-settings");
    navRecords = document.getElementById("nav-records");
    contentSettings = document.getElementById("content-settings");
    contentRecords = document.getElementById("content-records");

    todayCountEl = document.getElementById("today-count");
    historyLogContainer = document.getElementById("history-log-container");
    clearHistoryBtn = document.getElementById("clear-history-btn");

    jest.resetModules();
    chrome.storage.local.clearMockStore();
    jest.clearAllMocks();
  });

  test("loads initial configurations and renders task rows on DOMContentLoaded", () => {
    chrome.storage.local.setMockStore({
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
      shortBreak: 6,
      longBreak: 12,
      cycleTarget: 5,
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(shortInput.value).toBe("6");
    expect(longInput.value).toBe("12");
    expect(cycleInput.value).toBe("5");

    const rows = tasksContainer.querySelectorAll(".task-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector(".task-name").value).toBe("Reading");
    expect(rows[0].querySelector(".task-duration").value).toBe("25");
    expect(rows[1].querySelector(".task-name").value).toBe("Develop");
    expect(rows[1].querySelector(".task-duration").value).toBe("50");
  });

  test("adds a new task row up to a maximum limit of 3", () => {
    chrome.storage.local.setMockStore({
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Verify initial count is 1 row
    expect(tasksContainer.querySelectorAll(".task-row")).toHaveLength(1);

    // Add 2nd task
    addTaskBtn.click();
    expect(tasksContainer.querySelectorAll(".task-row")).toHaveLength(2);
    expect(tasksContainer.querySelectorAll(".task-row")[1].querySelector(".task-name").value).toBe("Work 2");

    // Add 3rd task
    addTaskBtn.click();
    expect(tasksContainer.querySelectorAll(".task-row")).toHaveLength(3);
    expect(tasksContainer.querySelectorAll(".task-row")[2].querySelector(".task-name").value).toBe("Work 3");

    // Attempting to add 4th task should trigger alert and not increase count
    addTaskBtn.click();
    expect(global.alert).toHaveBeenCalledWith("Maximum limit of 3 custom tasks reached.");
    expect(tasksContainer.querySelectorAll(".task-row")).toHaveLength(3);
  });

  test("deletes a task row and disables delete button if only 1 task remaining", () => {
    chrome.storage.local.setMockStore({
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    let rows = tasksContainer.querySelectorAll(".task-row");
    expect(rows).toHaveLength(2);

    // Delete first task
    rows[0].querySelector(".delete-btn").click();
    
    rows = tasksContainer.querySelectorAll(".task-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelector(".task-name").value).toBe("Develop");
    expect(rows[0].querySelector(".delete-btn").hasAttribute("disabled")).toBe(true);
  });

  test("saves configurations and resets timer on save button click", () => {
    chrome.storage.local.setMockStore({
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
      cycleTarget: 4,
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    shortInput.value = "10";
    longInput.value = "20";
    cycleInput.value = "6";

    // Edit task inline
    const firstRow = tasksContainer.querySelector(".task-row");
    firstRow.querySelector(".task-name").value = "Testing Focus";
    firstRow.querySelector(".task-name").dispatchEvent(new Event("input"));
    firstRow.querySelector(".task-duration").value = "30";
    firstRow.querySelector(".task-duration").dispatchEvent(new Event("input"));

    saveBtn.click();

    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(global.alert).toHaveBeenCalledWith("Settings saved successfully! Timer reset to your first task.");

    const store = chrome.storage.local.getMockStore();
    expect(store.shortBreak).toBe(10);
    expect(store.longBreak).toBe(20);
    expect(store.cycleTarget).toBe(6);
    expect(store.tasks[0]).toEqual({ name: "Testing Focus", duration: 30 });
    expect(store.timeLeft).toBe(30 * 60); // 1800s
    expect(store.isRunning).toBe(false);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "30m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#e74c3c" });
  });

  test("switches tabs and loads/renders completed focus session history", () => {
    const today = Date.now();
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;

    chrome.storage.local.setMockStore({
      history: [
        { taskName: "Develop", timestamp: yesterday },
        { taskName: "Reading", timestamp: today }
      ]
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Switch to records tab
    navRecords.click();

    expect(navRecords.classList.contains("active")).toBe(true);
    expect(navSettings.classList.contains("active")).toBe(false);
    expect(contentRecords.classList.contains("active")).toBe(true);
    expect(contentSettings.classList.contains("active")).toBe(false);

    // Verify today's count is 1 (only the "Reading" task was done today)
    expect(todayCountEl.textContent).toBe("1");

    // Verify list rendering (from newest to oldest)
    const listItems = historyLogContainer.querySelectorAll("li");
    expect(listItems).toHaveLength(2);
    expect(listItems[0].textContent).toContain("Reading");
    expect(listItems[1].textContent).toContain("Develop");
  });

  test("clears history records on clear history button click (confirmed)", () => {
    chrome.storage.local.setMockStore({
      history: [{ taskName: "Develop", timestamp: Date.now() }]
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Switch to records first to render list
    navRecords.click();
    expect(historyLogContainer.querySelectorAll("li")).toHaveLength(1);

    global.confirm.mockReturnValueOnce(true);
    clearHistoryBtn.click();

    expect(global.confirm).toHaveBeenCalled();
    expect(chrome.storage.local.getMockStore().history).toEqual([]);
    expect(historyLogContainer.querySelectorAll("li")).toHaveLength(1);
    expect(historyLogContainer.querySelector("li").textContent).toContain("No recorded blocks logged yet.");
  });

  test("does not clear history records on clear history button click if cancelled", () => {
    chrome.storage.local.setMockStore({
      history: [{ taskName: "Develop", timestamp: Date.now() }]
    });

    require("../src/options.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    navRecords.click();
    expect(historyLogContainer.querySelectorAll("li")).toHaveLength(1);

    global.confirm.mockReturnValueOnce(false);
    clearHistoryBtn.click();

    expect(chrome.storage.local.getMockStore().history).toHaveLength(1);
  });
});
