/** @type {import('jest').Config} */
const config = {
  modulePathIgnorePatterns: [
      '<rootDir>/src/',
      '<rootDir>/es/',
      '<rootDir>/lib/'
  ],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  }
};

module.exports = config;