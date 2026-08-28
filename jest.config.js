module.exports = {
  testEnvironment: 'node',
  transform: {},
  moduleNameMapper: {
    '^firebase-admin/(.*)$': '<rootDir>/node_modules/firebase-admin/lib/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
