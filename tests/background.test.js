describe("background.js", () => {
  beforeEach(() => {
    global.clearAllEventListeners();
    jest.resetModules();
    chrome.storage.local.clearMockStore();
    chrome.resetMockListeners();
    jest.clearAllMocks();
  });

  test("onInstalled initializes storage and updates badge", () => {
    require("../src/background.js");
    chrome.triggerOnInstalled();

    const store = chrome.storage.local.getMockStore();
    expect(store.shortBreak).toBe(5);
    expect(store.longBreak).toBe(15);
    expect(store.cycleTarget).toBe(4);
    expect(store.timeLeft).toBe(25 * 60);
    expect(store.isRunning).toBe(false);
    expect(store.currentMode).toBe("work");
    expect(store.currentTaskIndex).toBe(0);
    expect(store.completedWorkSessions).toBe(0);
    expect(store.tasks).toEqual([
      { name: "Reading", duration: 25 },
      { name: "Develop", duration: 50 },
    ]);

    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "25m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#e74c3c" });
  });

  test("onAlarm decrements timeLeft when timeLeft > 1", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 120,
      currentMode: "work",
      completedWorkSessions: 0,
      cycleTarget: 4,
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(store.timeLeft).toBe(119);
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "2m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#e74c3c" });
  });

  test("onAlarm transition to short break when work session completes", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      currentMode: "work",
      completedWorkSessions: 0,
      cycleTarget: 4,
      history: [],
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(chrome.alarms.clear).toHaveBeenCalledWith("pomodoroTimer");
    expect(store.currentMode).toBe("short-break");
    expect(store.completedWorkSessions).toBe(1);
    expect(store.isRunning).toBe(false);
    expect(store.timeLeft).toBe(300);

    // Verify history logic (using fallback "Work Session" due to missing keys in storage query)
    expect(store.history).toHaveLength(1);
    expect(store.history[0].taskName).toBe("Work Session");
    expect(store.history[0].timestamp).toBeLessThanOrEqual(Date.now());

    // Verify tab and window creation
    expect(chrome.tabs.create).toHaveBeenCalledWith(
      { url: "chrome-extension://mock-id/break.html" },
      expect.any(Function)
    );
    expect(chrome.windows.get).toHaveBeenCalledWith(456, expect.any(Function));
    expect(chrome.windows.update).toHaveBeenCalledWith(456, {
      focused: true,
      drawAttention: true,
    });
  });

  test("onAlarm transition to long break when completedWorkSessions reaches cycleTarget", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      currentMode: "work",
      completedWorkSessions: 3, // completedWorkSessions will increment to 4
      cycleTarget: 4,
      history: [],
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(store.currentMode).toBe("long-break");
    expect(store.completedWorkSessions).toBe(4);
    expect(store.timeLeft).toBe(900);
    expect(store.isRunning).toBe(false);
  });

  test("onAlarm transition to work mode when break session completes", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      currentMode: "short-break",
      completedWorkSessions: 1,
      cycleTarget: 4,
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(store.currentMode).toBe("work");
    expect(store.completedWorkSessions).toBe(1);
    expect(store.timeLeft).toBe(1500);
    expect(store.isRunning).toBe(false);
  });

  test("onAlarm transition to work mode with custom task duration when break completes", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      currentMode: "short-break",
      completedWorkSessions: 1,
      cycleTarget: 4,
      tasks: [
        { name: "Reading", duration: 10 },
        { name: "Coding", duration: 45 }
      ],
      currentTaskIndex: 1
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(store.currentMode).toBe("work");
    expect(store.completedWorkSessions).toBe(1);
    expect(store.timeLeft).toBe(45 * 60);
    expect(store.isRunning).toBe(false);
  });
});
