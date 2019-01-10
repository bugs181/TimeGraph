/* eslint-disable no-undef */

const mocha = require('../lib/mocha-log')
const perf = mocha.perf

const Gun = require('gun/gun')
global.Gun = Gun
require('../lib/memorystorage')
require('../lib/time')
require('../time')

let testNum = 1000


describe('Performance (x1000): ', function() {
  this.timeout(5000)

  // Setup
  var gun = Gun()
  var app = gun.get('app')

  perf('put:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0

    for (; i < testNum; i++) {
      people.put({ name: 'Mark' + i })
    }
    done()
  })

  perf('set:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0

    for (; i < testNum; i++) {
      people.set({ name: 'Mark' + i })
    }
    done()
  })

  perf('time original:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0

    for (; i < testNum; i++) {
      people.time({ name: 'Mark' + i })
    }
    done()
  })

  perf('timegraph.put:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people').timegraph()

    let i = 0

    for (; i < testNum; i++) {
      people.put({ name: 'Mark_' + i })
    }
    done()
  })

  perf('timegraph.time:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people').timegraph()

    let i = 0

    for (; i < testNum; i++) {
      people.time({ name: 'Mark' + i })
    }
    done()
  })
})
