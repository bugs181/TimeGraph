module.exports = function(wallaby) {
  var path = require('path')
  process.env.NODE_PATH = path.join(wallaby.localProjectDir, 'node_modules')

  return {
    files: [
      'time.js',
      'memorystorage.js',
    ],

    tests: [
      'test/**.js',
    ],

    env: {
      type: 'node',
      runner: 'node',
    },

    testFramework: 'mocha',
    maxConsoleMessagesPerTest: 10000,
    slowTestThreshold: 30 * 1000, // 30 Seconds slow test

    setup: function(wallaby) {
      var mocha = wallaby.testFramework
      mocha.slowTestThreshold = 30 * 1000 // The above wasn't working?
    },
  }
}
