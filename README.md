# Custom Pomodoro Timer Chrome Extension

A highly customizable Pomodoro Timer Chrome Extension designed to help you stay focused, manage tasks, and track your daily productivity.

---

## 📁 Project Structure

The project codebase is organized into source files for the extension and a robust testing suite:

```text
pomodoro/
├── src/                      # Extension Source Code
│   ├── manifest.json         # Extension manifest (v3) configuring permissions and entry points
│   ├── background.js         # Service worker managing alarm-based timing logic, state, and tab focus
│   ├── popup.html            # Main extension interface popup
│   ├── popup.js              # Logic for managing popup timer display, start/pause/reset states
│   ├── options.html          # Settings configuration and analytics history dashboard
│   ├── options.js            # Configuration controls and records retrieval/rendering logic
│   ├── break.html            # Full-screen break/transition page opened when sessions complete
│   └── break.js              # Interactivity for handling break/session completion options
├── tests/                    # Testing Suite (Jest)
│   ├── background.test.js    # Unit and integration tests for background timer alarms and badge logic
│   ├── break.test.js         # Tests verifying break screen responses and options selection
│   ├── options.test.js       # Options tab switching, custom task validation, and analytics storage tests
│   ├── popup.test.js         # Popup start, pause, reset behavior, and timer display update tests
│   └── setup.js              # Global chrome-mock and setup utilities for DOM and extensions testing
├── jest.config.js            # Jest test framework configurations
├── package.json              # Script definitions, developer environment setup, and Jest dependencies
└── README.md                 # Project documentation (this file)
```

---

## 🛠️ Installation & Setup (How to Use on Chrome)

Follow these steps to load the extension into your Google Chrome browser:

### 1. Developer Mode Setup
1. Open Google Chrome.
2. In the URL bar, go to `chrome://extensions/` (or click the three-dot menu in the upper right, choose **Extensions** -> **Manage Extensions**).
3. In the top-right corner of the Extensions page, toggle the **Developer mode** switch to **ON**.

### 2. Load the Unpacked Extension
1. Click the **Load unpacked** button in the top-left corner of the page.
2. In the file picker that opens, navigate to this project's directory and select the **`src`** folder (the one containing `manifest.json`).
3. Click **Select** / **Open**.

### 3. Pin the Extension
1. Once loaded, click the puzzle piece icon (🧩 **Extensions**) in the Chrome toolbar next to your profile avatar.
2. Locate **Custom Pomodoro Timer** in the list and click the Pin icon (📌) to keep it visible on your toolbar.

---

## 🚀 Key Features

* **Custom Tasks List**: Manage up to 3 custom focus tasks, specifying unique names and work durations (e.g., Reading: 25 minutes, Develop: 50 minutes).
* **Break & Cycle Customization**: Customize short break duration, long break duration, and select how many work sessions to complete before triggering a long break.
* **Smart Alert & Auto-Focus**: When a focus session or break ends, the extension opens a full-screen transition window (`break.html`) and forces window focus to prompt your next choice immediately.
* **Productivity Logs (Records History)**: Access your analytics dashboard inside the options panel to view your completed focus sessions for the day alongside a precise activity timeline.
* **Persistent Timer Badge**: Check remaining session minutes directly on the extension badge overlay in the browser toolbar.

---

## 🧪 Testing the Extension

This extension uses [Jest](https://jestjs.io/) and `jest-environment-jsdom` to test popup, options page, break page, and service worker functionalities.

### Prerequisite
Make sure you have Node.js installed.

### Steps
1. Install development dependencies:
   ```bash
   npm install
   ```
2. Run tests:
   ```bash
   npm test
   ```
3. Run tests in watch mode:
   ```bash
   npm run test:watch
   ```
