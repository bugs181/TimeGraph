/* eslint-disable no-undef */

const Gun = require('gun/gun')
global.Gun = Gun
require('../lib/memorystorage')
require('../lib/time')
require('../time')

let testNum = 1000

function measure(label, cb) {
  let counter = testNum

  return function callback() {
    counter--
    if (counter === 0) {
      cb && cb()
    }
  }
}


describe('Performance: ', function() {
  this.timeout(5000)

  // Setup
  var gun = Gun()
  var app = gun.get('app')

  it('put:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0
    let cb = measure('put', done)

    for (; i < testNum; i++) {
      people.put({ name: 'Mark' + i }, cb)
    }
  })

  it('set:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0
    let cb = measure('set', done)

    for (; i < testNum; i++) {
      people.set({ name: 'Mark' + i }, cb)
    }
  })

  it('time original:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people')

    let i = 0
    let cb = measure('timeOriginal', done)

    for (; i < testNum; i++) {
      people.time({ name: 'Mark' + i }, cb)
    }
  })

  it('timegraph.put:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people').timegraph()

    let i = 0
    let cb = measure('timegraph.put', done)

    for (; i < testNum; i++) {
      people.put({ name: 'Mark' + i }, cb)
    }
  })

  it('timegraph.time:', function(done) {
    gun = Gun()
    app = app.get('app')
    let people = app.get('people').timegraph()

    let i = 0
    let cb = measure('timegraph.time', done)

    for (; i < testNum; i++) {
      people.time({ name: 'Mark' + i }, cb)
    }
  })
})
