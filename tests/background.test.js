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
    expect(store.lastSessionDate).toBe("");
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
      endTime: Date.now() + 119 * 1000,
      isRunning: true,
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
      endTime: Date.now(),
      isRunning: true,
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
    const today = new Date().toLocaleDateString("en-CA");
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      endTime: Date.now(),
      isRunning: true,
      currentMode: "work",
      completedWorkSessions: 3, // completedWorkSessions will increment to 4
      lastSessionDate: today,   // same day so no reset
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
      endTime: Date.now(),
      isRunning: true,
      currentMode: "short-break",
      completedWorkSessions: 1,
      cycleTarget: 4,
    });

    require("../src/background.js");
    chrome.triggerAlarm({ name: "pomodoroTimer" });

    const store = chrome.storage.local.getMockStore();
    expect(store.currentMode).toBe("work");
    // completedWorkSessions must NOT change when a break ends
    expect(store.completedWorkSessions).toBe(1);
    expect(store.timeLeft).toBe(1500);
    expect(store.isRunning).toBe(false);
  });

  test("onAlarm transition to work mode with custom task duration when break completes", () => {
    chrome.storage.local.setMockStore({
      timeLeft: 1,
      endTime: Date.now(),
      isRunning: true,
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
    // completedWorkSessions must NOT change when a break ends
    expect(store.completedWorkSessions).toBe(1);
    expect(store.timeLeft).toBe(45 * 60);
    expect(store.isRunning).toBe(false);
  });

  // ── Daily reset ──────────────────────────────────────────────────────────
  describe("daily reset of completedWorkSessions", () => {
    const TODAY = "2026-06-12"; // fixed date used across all cases

    beforeEach(() => {
      // Pin the instance toLocaleDateString while keeping Date.now and new Date() numeric form intact
      const OriginalDate = global.Date;
      jest.spyOn(global, "Date").mockImplementation((...args) => {
        if (args.length === 0) {
          const instance = new OriginalDate();
          instance.toLocaleDateString = (locale) =>
            locale === "en-CA" ? TODAY : instance.toLocaleDateString.call(new OriginalDate(), locale);
          return instance;
        }
        return new OriginalDate(...args);
      });
      // Preserve static methods
      global.Date.now = OriginalDate.now.bind(OriginalDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("same day: continues counting from stored completedWorkSessions", () => {
      chrome.storage.local.setMockStore({
        timeLeft: 1,
        endTime: Date.now(),
        isRunning: true,
        currentMode: "work",
        completedWorkSessions: 2,
        lastSessionDate: TODAY, // same day
        cycleTarget: 4,
        history: [],
      });

      require("../src/background.js");
      chrome.triggerAlarm({ name: "pomodoroTimer" });

      const store = chrome.storage.local.getMockStore();
      // count must continue from 2 → 3 (not reset)
      expect(store.completedWorkSessions).toBe(3);
      expect(store.lastSessionDate).toBe(TODAY);
      expect(store.currentMode).toBe("short-break");
    });

    test("new day: resets completedWorkSessions to 1 (0 + first session)", () => {
      chrome.storage.local.setMockStore({
        timeLeft: 1,
        endTime: Date.now(),
        isRunning: true,
        currentMode: "work",
        completedWorkSessions: 5,       // yesterday's count
        lastSessionDate: "2026-06-11",  // yesterday
        cycleTarget: 4,
        history: [],
      });

      require("../src/background.js");
      chrome.triggerAlarm({ name: "pomodoroTimer" });

      const store = chrome.storage.local.getMockStore();
      // must reset to 0 then increment → 1
      expect(store.completedWorkSessions).toBe(1);
      expect(store.lastSessionDate).toBe(TODAY);
      expect(store.currentMode).toBe("short-break");
    });

    test("new day: cycleTarget uses the fresh count, not yesterday's", () => {
      // Yesterday had 3 sessions (3 % 4 !== 0 so it would have been short-break),
      // but after reset count = 0+1 = 1, which is still short-break.
      // Test the edge case: yesterday = cycleTarget-1 (3); without reset it
      // would fire long-break at count=4, but with reset count=1 → short-break.
      chrome.storage.local.setMockStore({
        timeLeft: 1,
        endTime: Date.now(),
        isRunning: true,
        currentMode: "work",
        completedWorkSessions: 3,       // if NOT reset → would reach cycleTarget
        lastSessionDate: "2026-06-11",  // yesterday
        cycleTarget: 4,
        history: [],
      });

      require("../src/background.js");
      chrome.triggerAlarm({ name: "pomodoroTimer" });

      const store = chrome.storage.local.getMockStore();
      expect(store.completedWorkSessions).toBe(1);
      // Should be short-break (1 % 4 !== 0), NOT long-break
      expect(store.currentMode).toBe("short-break");
    });

    test("new day: lastSessionDate is absent (first ever install) — treats as new day", () => {
      chrome.storage.local.setMockStore({
        timeLeft: 1,
        endTime: Date.now(),
        isRunning: true,
        currentMode: "work",
        completedWorkSessions: 0,
        // lastSessionDate intentionally missing — simulates fresh install
        cycleTarget: 4,
        history: [],
      });

      require("../src/background.js");
      chrome.triggerAlarm({ name: "pomodoroTimer" });

      const store = chrome.storage.local.getMockStore();
      expect(store.completedWorkSessions).toBe(1);
      expect(store.lastSessionDate).toBe(TODAY);
    });

    test("break completion does not update lastSessionDate", () => {
      chrome.storage.local.setMockStore({
        timeLeft: 1,
        endTime: Date.now(),
        isRunning: true,
        currentMode: "short-break",
        completedWorkSessions: 2,
        lastSessionDate: "2026-06-11",  // yesterday — should remain unchanged
        cycleTarget: 4,
      });

      require("../src/background.js");
      chrome.triggerAlarm({ name: "pomodoroTimer" });

      const store = chrome.storage.local.getMockStore();
      // Break ended → work mode; lastSessionDate must NOT be written for breaks
      expect(store.currentMode).toBe("work");
      // completedWorkSessions unchanged after a break
      expect(store.completedWorkSessions).toBe(2);
      expect(store.lastSessionDate).toBe("2026-06-11");
    });
  });
});
