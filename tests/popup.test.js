describe("popup.js", () => {
  let display, currentTaskTitle, taskBtnRow;
  let shortBreakBtn, longBreakBtn, pauseBtn, resetBtn, openSettingsLink;

  beforeEach(() => {
    global.clearAllEventListeners();
    document.body.innerHTML = `
      <div id="current-task-title">Loading...</div>
      <div id="time-left">25:00</div>
      <div id="task-btn-row"></div>
      <button class="break-btn" id="short-break-btn">☕ Short Break</button>
      <button class="break-btn" id="long-break-btn">🛋️ Long Break</button>
      <button id="pause-btn">Pause</button>
      <button id="reset-btn">Reset</button>
      <span id="open-settings">⚙️ Open Settings Board</span>
    `;

    display          = document.getElementById("time-left");
    currentTaskTitle = document.getElementById("current-task-title");
    taskBtnRow       = document.getElementById("task-btn-row");
    shortBreakBtn    = document.getElementById("short-break-btn");
    longBreakBtn     = document.getElementById("long-break-btn");
    pauseBtn         = document.getElementById("pause-btn");
    resetBtn         = document.getElementById("reset-btn");
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

  // ── Task button click — start / resume ────────────────────────────────────

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

    taskBtnRow.querySelectorAll(".task-btn")[1].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentTaskIndex).toBe(1);
    expect(store.timeLeft).toBe(50 * 60);
    expect(store.currentMode).toBe("work");
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", {
      when: expect.any(Number),
    });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", {
      periodInMinutes: 1,
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

  test("clicking the active task button while PAUSED resumes from stored timeLeft", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1800,
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

    taskBtnRow.querySelectorAll(".task-btn")[1].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.timeLeft).toBe(1800);
    expect(display.textContent).toBe("30:00");
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", {
      when: expect.any(Number),
    });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", {
      periodInMinutes: 1,
    });
  });

  test("clicking a DIFFERENT task while paused starts it fresh", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1800,
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

    taskBtnRow.querySelectorAll(".task-btn")[0].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentTaskIndex).toBe(0);
    expect(store.timeLeft).toBe(1500);
    expect(display.textContent).toBe("25:00");
    expect(currentTaskTitle.textContent).toBe("🎯 Focus: Reading");
  });

  // ── Locking — task buttons disabled when timer runs ───────────────────────

  test("non-active task buttons are disabled when a work task is running", () => {
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
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[1].disabled).toBe(true);
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

    expect(chrome.alarms.create.mock.calls.length).toBe(initialCallCount);
  });

  // ── Break buttons — idle/paused state ────────────────────────────────────

  test("break buttons are both enabled when timer is idle", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(shortBreakBtn.disabled).toBe(false);
    expect(longBreakBtn.disabled).toBe(false);
  });

  test("clicking short break button starts a short-break timer", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    shortBreakBtn.click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("short-break");
    expect(store.timeLeft).toBe(5 * 60);
    expect(display.textContent).toBe("05:00");
    expect(currentTaskTitle.textContent).toBe("☕ Short Break");
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", {
      when: expect.any(Number),
    });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", {
      periodInMinutes: 1,
    });
  });

  test("clicking long break button starts a long-break timer", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    longBreakBtn.click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("long-break");
    expect(store.timeLeft).toBe(15 * 60);
    expect(display.textContent).toBe("15:00");
    expect(currentTaskTitle.textContent).toBe("🛋️ Long Break");
  });

  test("clicking short break while PAUSED resumes from stored timeLeft (regression)", () => {
    // Short break was paused with 3:00 remaining (not the full 5:00)
    chrome.storage.local.setMockStore({
      timeLeft: 180,
      isRunning: false,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    shortBreakBtn.click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("short-break");
    // Must NOT reset to 5*60=300 — must stay at 180 (3:00)
    expect(store.timeLeft).toBe(180);
    expect(display.textContent).toBe("03:00");
  });

  test("clicking long break while PAUSED resumes from stored timeLeft (regression)", () => {
    // Long break was paused with 8:00 remaining (not the full 15:00)
    chrome.storage.local.setMockStore({
      timeLeft: 480,
      isRunning: false,
      currentMode: "long-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    longBreakBtn.click();

    const store = chrome.storage.local.getMockStore();
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("long-break");
    // Must NOT reset to 15*60=900 — must stay at 480 (8:00)
    expect(store.timeLeft).toBe(480);
    expect(display.textContent).toBe("08:00");
  });

  // ── Break buttons — locked while task is running ──────────────────────────

  test("break buttons are disabled when a work task is running", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(shortBreakBtn.disabled).toBe(true);
    expect(longBreakBtn.disabled).toBe(true);
  });

  test("short break button is active and long break is disabled while short break runs", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 300,
      isRunning: true,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(shortBreakBtn.classList.contains("active")).toBe(true);
    expect(shortBreakBtn.disabled).toBe(false);
    expect(longBreakBtn.classList.contains("active")).toBe(false);
    expect(longBreakBtn.disabled).toBe(true);
  });

  test("long break button is active and short break is disabled while long break runs", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 900,
      isRunning: true,
      currentMode: "long-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(longBreakBtn.classList.contains("active")).toBe(true);
    expect(longBreakBtn.disabled).toBe(false);
    expect(shortBreakBtn.classList.contains("active")).toBe(false);
    expect(shortBreakBtn.disabled).toBe(true);
  });

  test("task buttons are ALL disabled while a break is running", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 300,
      isRunning: true,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const taskBtns = taskBtnRow.querySelectorAll(".task-btn");
    taskBtns.forEach((btn) => expect(btn.disabled).toBe(true));
  });

  test("task buttons re-enable after pausing a break (regression)", () => {
    // Start with short-break running
    chrome.storage.local.setMockStore({
      timeLeft: 300,
      isRunning: true,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Develop", duration: 50 },
      ],
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    // Confirm task buttons are locked while break is running
    taskBtnRow.querySelectorAll(".task-btn").forEach((btn) =>
      expect(btn.disabled).toBe(true)
    );

    // Pause the break
    pauseBtn.click();

    // Task buttons must be re-enabled after pausing
    taskBtnRow.querySelectorAll(".task-btn").forEach((btn) =>
      expect(btn.disabled).toBe(false)
    );
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

  test("pause re-enables task and break buttons", () => {
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

    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(true);
    expect(shortBreakBtn.disabled).toBe(true);

    pauseBtn.click();

    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(false);
    expect(shortBreakBtn.disabled).toBe(false);
    expect(longBreakBtn.disabled).toBe(false);
  });

  // ── Reset ─────────────────────────────────────────────────────────────────

  test("reset button resets work task time and stops timer", () => {
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

  test("reset during short break resets to short break duration", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 60,
      isRunning: true,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }],
      shortBreak: 5,
      longBreak: 15,
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    resetBtn.click();

    expect(chrome.storage.local.getMockStore().timeLeft).toBe(5 * 60);
    expect(display.textContent).toBe("05:00");
  });

  test("reset re-enables all buttons", () => {
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

    resetBtn.click();

    expect(taskBtnRow.querySelectorAll(".task-btn")[1].disabled).toBe(false);
    expect(shortBreakBtn.disabled).toBe(false);
    expect(longBreakBtn.disabled).toBe(false);
  });

  // ── Settings link ─────────────────────────────────────────────────────────

  test("clicking settings link opens options page", () => {
    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    openSettingsLink.click();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
