describe("popup.js", () => {
  let display, currentTaskTitle, startBtn, pauseBtn, resetBtn, openSettingsLink;

  beforeEach(() => {
    global.clearAllEventListeners();
    // Setup clean DOM structure
    document.body.innerHTML = `
      <div id="current-task-title">Loading...</div>
      <div id="time-left">25:00</div>
      <button id="start-btn">Start</button>
      <button id="pause-btn">Pause</button>
      <button id="reset-btn">Reset</button>
      <span id="open-settings">⚙️ Open Settings Board</span>
    `;

    display = document.getElementById("time-left");
    currentTaskTitle = document.getElementById("current-task-title");
    startBtn = document.getElementById("start-btn");
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

  test("loads settings and updates UI on DOMContentLoaded", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500, // 25:00
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    // Requiring the file triggers DOMContentLoaded logic
    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(display.textContent).toBe("25:00");
    expect(currentTaskTitle.textContent).toBe("🎯 Focus: Reading");
  });

  test("loads break status message on DOMContentLoaded when in break mode", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 300, // 5:00
      isRunning: false,
      currentMode: "short-break",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(display.textContent).toBe("05:00");
    expect(currentTaskTitle.textContent).toBe("☕ Short Break");
  });

  test("start button triggers alarm creation and ticks when not already running", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1500,
      isRunning: false,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    startBtn.click();

    expect(chrome.storage.local.getMockStore().isRunning).toBe(true);
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", { periodInMinutes: 1 / 60 });
    
    // Test interval update tick
    chrome.storage.local.setMockStore({
      timeLeft: 1499,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    jest.advanceTimersByTime(1000);
    // Since mock local.get is async-ish with callbacks, we check if UI updates
    expect(display.textContent).toBe("24:59");
  });

  test("pause button clears alarm and stops ticking", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1499,
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    pauseBtn.click();

    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(chrome.storage.local.getMockStore().isRunning).toBe(false);
  });

  test("reset button resets time remaining and stops ticking", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 120, // 2 minutes left
      isRunning: true,
      currentMode: "work",
      currentTaskIndex: 0,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    resetBtn.click();

    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(chrome.storage.local.getMockStore().isRunning).toBe(false);
    // time should be reset to task duration (25m = 1500s)
    expect(chrome.storage.local.getMockStore().timeLeft).toBe(1500);
    expect(display.textContent).toBe("25:00");
  });

  test("open settings link opens options page", () => {
    require("../src/popup.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    openSettingsLink.click();

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
