// Mock Chrome Extension APIs

const listeners = {
  alarms: [],
  onInstalled: [],
};

let store = {};

global.chrome = {
  runtime: {
    onInstalled: {
      addListener: (fn) => listeners.onInstalled.push(fn),
    },
    getURL: jest.fn((path) => `chrome-extension://mock-id/${path}`),
    openOptionsPage: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        let result = {};
        if (typeof keys === "string") {
          result[keys] = store[keys];
        } else if (Array.isArray(keys)) {
          keys.forEach((key) => {
            result[key] = store[key];
          });
        } else if (typeof keys === "object") {
          Object.keys(keys).forEach((key) => {
            result[key] = store[key] !== undefined ? store[key] : keys[key];
          });
        }
        callback(result);
      }),
      set: jest.fn((items, callback) => {
        Object.keys(items).forEach((key) => {
          store[key] = items[key];
        });
        if (callback) callback();
      }),
      clearMockStore: () => {
        store = {};
      },
      setMockStore: (newStore) => {
        store = { ...newStore };
      },
      getMockStore: () => store,
    },
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  alarms: {
    onAlarm: {
      addListener: (fn) => listeners.alarms.push(fn),
    },
    create: jest.fn(),
    clear: jest.fn(),
  },
  tabs: {
    create: jest.fn((options, callback) => {
      if (callback) {
        callback({ id: 123, windowId: 456, url: options.url });
      }
    }),
    getCurrent: jest.fn((callback) => {
      if (callback) {
        callback({ id: 789 });
      }
    }),
    remove: jest.fn((tabId, callback) => {
      if (callback) callback();
    }),
  },
  windows: {
    get: jest.fn((windowId, callback) => {
      if (callback) {
        callback({ id: windowId });
      }
    }),
    update: jest.fn((windowId, updateInfo, callback) => {
      if (callback) {
        callback({ id: windowId, ...updateInfo });
      }
    }),
  },
  // Custom helpers to trigger events in tests
  triggerOnInstalled: () => {
    listeners.onInstalled.forEach((fn) => fn());
  },
  triggerAlarm: (alarm) => {
    listeners.alarms.forEach((fn) => fn(alarm));
  },
  resetMockListeners: () => {
    listeners.alarms = [];
    listeners.onInstalled = [];
  }
};

// Mock dialog handlers in JSDOM
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// Track and clean up event listeners to prevent test pollution in JSDOM
const docListeners = [];
const winListeners = [];

const originalDocAdd = document.addEventListener;
document.addEventListener = (type, listener, options) => {
  docListeners.push({ type, listener, options });
  originalDocAdd.call(document, type, listener, options);
};

const originalWinAdd = window.addEventListener;
window.addEventListener = (type, listener, options) => {
  winListeners.push({ type, listener, options });
  originalWinAdd.call(window, type, listener, options);
};

global.clearAllEventListeners = () => {
  docListeners.forEach(({ type, listener, options }) => {
    document.removeEventListener(type, listener, options);
  });
  docListeners.length = 0;

  winListeners.forEach(({ type, listener, options }) => {
    window.removeEventListener(type, listener, options);
  });
  winListeners.length = 0;
};
