describe("popup.js", () => {
  let display, currentTaskTitle, taskBtnRow, pauseBtn, resetBtn, openSettingsLink;

  beforeEach(() => {
    global.clearAllEventListeners();
    // DOM matches the new popup.html structure (no start-btn, has task-btn-row)
    document.body.innerHTML = `
      <div id="current-task-title">Loading...</div>
      <div id="time-left">25:00</div>
      <div id="task-btn-row"></div>
      <button id="pause-btn">Pause</button>
      <button id="reset-btn">Reset</button>
      <span id="open-settings">⚙️ Open Settings Board</span>
    `;

    display = document.getElementById("time-left");
    currentTaskTitle = document.getElementById("current-task-title");
    taskBtnRow = document.getElementById("task-btn-row");
    pauseBtn = document.getElementById("pause-btn");
    resetBtn = document.getElementById("reset-btn");
    openSettingsLink = document.getElementById("open-settings");

    jest.resetModules();
    chrome.storage.local.clearMockStore();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Boot ──────────────────────────────────────────────────────────────────

  test("loads settings and updates timer display on DOMContentLoaded", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(display.textContent).toBe("25:00");
    expect(currentTaskTitle.textContent).toBe("🎯 Focus: Reading");
  });

  test("shows break status title when in short-break mode", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 300,
      isRunning: false,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(display.textContent).toBe("05:00");
    expect(currentTaskTitle.textContent).toBe("☕ Short Break");
  });

  // ── Task buttons rendered ─────────────────────────────────────────────────

  test("renders one task button per custom task", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const buttons = taskBtnRow.querySelectorAll(".task-btn");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("Reading (25min)");
    expect(buttons[1].textContent).toBe("Develop (50min)");
  });

  test("assigns a unique color class to each task button", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
        { name: "Review", duration: 15 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const buttons = taskBtnRow.querySelectorAll(".task-btn");
    expect(buttons[0].classList.contains("task-btn-0")).toBe(true);
    expect(buttons[1].classList.contains("task-btn-1")).toBe(true);
    expect(buttons[2].classList.contains("task-btn-2")).toBe(true);
  });

  test("active task button has 'active' class on load", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 3000,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 1,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const buttons = taskBtnRow.querySelectorAll(".task-btn");
    expect(buttons[0].classList.contains("active")).toBe(false);
    expect(buttons[1].classList.contains("active")).toBe(true);
  });

  // ── Task button click — start task ────────────────────────────────────────

  test("clicking an idle task button starts the timer for that task", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Click the second task button (Develop)
    const buttons = taskBtnRow.querySelectorAll(".task-btn");
    buttons[1].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentTaskIndex).toBe(1);
    expect(store.timeLeft).toBe(50 * 60);
    expect(store.currentMode).toBe("work");
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", {
      periodInMinutes: 1 / 60,
    });
  });

  test("clicking a task button updates the display to that task's duration", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    taskBtnRow.querySelectorAll(".task-btn")[1].click();

    expect(display.textContent).toBe("50:00");
    expect(currentTaskTitle.textContent).toBe("🎯 Focus: Develop");
  });

  // ── Locking — other buttons disabled while running ────────────────────────

  test("non-active task buttons are disabled when timer is running", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const buttons = taskBtnRow.querySelectorAll(".task-btn");
    expect(buttons[0].disabled).toBe(false); // active task — enabled
    expect(buttons[1].disabled).toBe(true);  // other task — disabled
  });

  test("clicking the active running task button does nothing", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1499,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const initialCallCount = chrome.alarms.create.mock.calls.length;
    taskBtnRow.querySelectorAll(".task-btn")[0].click();

    // No new alarm should have been created
    expect(chrome.alarms.create.mock.calls.length).toBe(initialCallCount);
  });

  // ── Pause ─────────────────────────────────────────────────────────────────

  test("pause button stops the alarm and sets isRunning to false", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1499,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    pauseBtn.click();

    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(chrome.storage.local.getMockStore().isRunning).toBe(false);
  });

  test("pause button re-enables all task buttons", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1499,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Develop is disabled while running
    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(true);

    pauseBtn.click();

    // After pause, Develop should be re-enabled
    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(false);
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  test("reset button resets time to current task duration and stops timer", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 120,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    resetBtn.click();

    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(chrome.storage.local.getMockStore().isRunning).toBe(false);
    expect(chrome.storage.local.getMockStore().timeLeft).toBe(1500);
    expect(display.textContent).toBe("25:00");
  });

  test("reset button re-enables all task buttons", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 120,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(true);

    resetBtn.click();

    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(false);
  });

  // ── Settings link ─────────────────────────────────────────────────────────

  test("clicking settings link opens options page", () => {
    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    openSettingsLink.click();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
