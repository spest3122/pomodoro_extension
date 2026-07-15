# Future Improvements & Suggestions

Based on the current architecture and the unique "Inkwell Black & White" design system, here are several suggested improvements to elevate the extension's functionality, user experience, and technical robustness.

## 1. Bundle Fonts Locally (Manifest V3 Best Practice)
Currently, the extension loads "Spicy Rice" and "Fredoka One" directly from Google Fonts.
* **Why improve it**: Manifest V3 enforces strict Content Security Policies (CSP) that discourage or block external resources. Additionally, fetching external fonts compromises user privacy and prevents the extension from working perfectly offline.
* **Proposed Fix**: Download the `.woff2` files for these fonts, place them in an `assets/fonts` folder, and load them locally via `@font-face` in your CSS.

## 2. Theatrical Sound Effects
The `DESIGN.md` explicitly mentions an "Inkwell Black & White" vintage 1920s/1930s rubber-hose animation aesthetic.
* **The Idea**: To fully realize this "theatrical energy," add vintage sound effects—like an old bicycle horn, a typewriter ding, or a classic boxing bell—that trigger when a Pomodoro session or break completes. This makes the extension feel incredibly immersive and tactile.

## 3. Implement `chrome.storage.sync` for Settings
* **Why improve it**: If a user installs the extension on their work laptop and personal desktop, using `chrome.storage.sync` ensures their custom Pomodoro timers and preferences automatically follow them across devices.
* **Proposed Fix**: While productivity logs (history) might grow too large and should stay in `chrome.storage.local`, user settings (Custom Task names, work durations, and break durations) should be migrated to `chrome.storage.sync`.

## 4. Data Export & Advanced Analytics
The extension currently tracks "Productivity Logs" in the options panel.
* **The Idea**: Add an "Export to CSV" or "Export to JSON" button in the settings dashboard so users can analyze their productivity data in tools like Excel or Notion. Additionally, consider adding a GitHub-style contribution heatmap to visualize focus streaks over the month.

## 5. Enhanced Accessibility (a11y)
While the high-contrast monochromatic design is visually striking, the timer could be made more accessible for screen readers.
* **The Idea**: Implement `aria-live="polite"` on the timer display so visually impaired users get periodic updates on the remaining time. Ensure all custom task buttons have clear `aria-labels` that describe their function and duration.
