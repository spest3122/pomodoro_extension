module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  verbose: true,
  testMatch: ["**/tests/**/*.test.js"]
};
