/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { diagnostics: false }],
  },
  moduleNameMapper: {
    "^vscode$": "<rootDir>/src/providers/__tests__/__mocks__/vscode.ts",
  },
};
