describe("break.js", () => {
  let greetingEl, messageEl, container;

  beforeEach(() => {
    global.clearAllEventListeners();
    // Setup clean DOM matching break.html
    document.body.innerHTML = `
      <h1 id="greeting">Session Complete!</h1>
      <p id="message">What would you like to do next?</p>
      <p id="tomatoes-left" style="display: none;"></p>
      <div id="action-buttons-container"></div>
    `;

    greetingEl = document.getElementById("greeting");
    messageEl = document.getElementById("message");
    container = document.getElementById("action-buttons-container");

    jest.resetModules();
    chrome.storage.local.clearMockStore();
    jest.clearAllMocks();
  });

  test("renders short break prompt and handles short break start", () => {
    chrome.storage.local.setMockStore({
      currentMode: "short-break",
      shortBreak: 5,
      longBreak: 15,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(greetingEl.textContent).toBe("💪 Focus Session Finished!");
    expect(messageEl.textContent).toContain("reset for 5 minutes.");

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("☕ Start Short Break");

    // Click the button
    buttons[0].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.timeLeft).toBe(5 * 60); // 300s
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("short-break");

    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", { when: expect.any(Number) });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", { periodInMinutes: 1 });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "5m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#2ecc71" });
    expect(chrome.tabs.getCurrent).toHaveBeenCalled();
  });

  test("renders long break prompt and handles long break start", () => {
    chrome.storage.local.setMockStore({
      currentMode: "long-break",
      shortBreak: 5,
      longBreak: 15,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(greetingEl.textContent).toBe("🏆 Outstanding Mega Focus!");
    expect(messageEl.textContent).toContain("reset for 15 minutes.");

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("🛋️ Start Long Break");

    // Click the button
    buttons[0].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.timeLeft).toBe(15 * 60); // 900s
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("long-break");

    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", { when: expect.any(Number) });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", { periodInMinutes: 1 });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "15m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#3498db" });
    expect(chrome.tabs.getCurrent).toHaveBeenCalled();
  });

  test("renders list of task choices when transitioning back to work mode", () => {
    chrome.storage.local.setMockStore({
      currentMode: "work", // transition state when break ends
      shortBreak: 5,
      longBreak: 15,
      tasks: [
        { name: "Reading", duration: 25 },
        { name: "Coding", duration: 45 }
      ]
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(greetingEl.textContent).toBe("☕ Break is Over!");
    expect(messageEl.textContent).toBe("Which focus block would you like to tackle next?");

    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe("🎯 Reading (25m)");
    expect(buttons[1].textContent).toBe("🎯 Coding (45m)");

    // Click second task
    buttons[1].click();

    const store = chrome.storage.local.getMockStore();
    expect(store.currentTaskIndex).toBe(1);
    expect(store.timeLeft).toBe(45 * 60);
    expect(store.isRunning).toBe(true);
    expect(store.currentMode).toBe("work");

    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroTimer", { when: expect.any(Number) });
    expect(chrome.alarms.create).toHaveBeenCalledWith("pomodoroBadge", { periodInMinutes: 1 });
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "45m" });
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: "#e74c3c" });
    expect(chrome.tabs.getCurrent).toHaveBeenCalled();
  });

  test("plays sound when work session completes and soundWork is true", () => {
    chrome.storage.local.setMockStore({
      currentMode: "short-break",
      lastCompletedMode: "work",
      soundWork: true
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("does not play sound when work session completes and soundWork is false", () => {
    chrome.storage.local.setMockStore({
      currentMode: "short-break",
      lastCompletedMode: "work",
      soundWork: false
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  test("plays sound when short break completes and soundShortBreak is true", () => {
    chrome.storage.local.setMockStore({
      currentMode: "work",
      lastCompletedMode: "short-break",
      soundShortBreak: true
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(window.AudioContext).toHaveBeenCalled();
  });

  test("does not play sound when long break completes and soundLongBreak is false", () => {
    chrome.storage.local.setMockStore({
      currentMode: "work",
      lastCompletedMode: "long-break",
      soundLongBreak: false
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    expect(window.AudioContext).not.toHaveBeenCalled();
  });

  test("shows tomatoes left until long break during short break", () => {
    chrome.storage.local.setMockStore({
      currentMode: "short-break",
      shortBreak: 5,
      longBreak: 15,
      cycleTarget: 4,
      completedWorkSessions: 1,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const tomatoesLeftEl = document.getElementById("tomatoes-left");
    expect(tomatoesLeftEl.style.display).toBe("block");
    expect(tomatoesLeftEl.textContent).toBe("🍅 3 tomatoes left until long break");
  });

  test("shows singular tomato left until long break", () => {
    chrome.storage.local.setMockStore({
      currentMode: "short-break",
      shortBreak: 5,
      longBreak: 15,
      cycleTarget: 4,
      completedWorkSessions: 3,
      tasks: [{ name: "Reading", duration: 25 }]
    });

    require("../src/break.js");
    document.dispatchEvent(new Event("DOMContentLoaded"));

    const tomatoesLeftEl = document.getElementById("tomatoes-left");
    expect(tomatoesLeftEl.style.display).toBe("block");
    expect(tomatoesLeftEl.textContent).toBe("🍅 1 tomato left until long break");
  });
});
