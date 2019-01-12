/* eslint-disable no-undef */

const mocha = require('../lib/mocha-log')
const perf = mocha.perf

var chai = require('chai')
var expect = chai.expect

const Gun = require('gun/gun')
global.Gun = Gun
require('../lib/memorystorage')
require('../time')

const gun = Gun()
const withinDate = gun.timegraph().withinDate


describe('withinDate function tests:', function() {
  describe('Test Basic Algorithm', function() {
    perf('No date range provided, should always return true', function(done) {
      expect(withinDate(1)).to.be.true
      done()
    })

    perf('Start date only supplied', function(done) {
      expect(withinDate(1, 3)).to.be.false
      expect(withinDate(2, 3)).to.be.false
      expect(withinDate(3, 3)).to.be.true
      expect(withinDate(4, 3)).to.be.true
      done()
    })

    perf('Stop date only supplied', function(done) {
      expect(withinDate(1, null, 3)).to.be.true
      expect(withinDate(2, null, 3)).to.be.true
      expect(withinDate(3, null, 3)).to.be.true
      expect(withinDate(4, null, 3)).to.be.false
      done()
    })

    perf('Dates with ranges', function(done) {
      expect(withinDate(1, 1, 3)).to.be.true
      expect(withinDate(2, 1, 3)).to.be.true
      expect(withinDate(3, 1, 3)).to.be.true
      expect(withinDate(4, 1, 3)).to.be.false
      done()
    })
  })

  describe('Test real dates', function() {
    var today = new Date()
    var yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    var tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)

    perf('No date range provided, should always return true', function(done) {
      expect(withinDate(today)).to.be.true
      done()
    }).add()

    perf('Start date only supplied', function(done) {
      expect(withinDate(today, today)).to.be.true
      expect(withinDate(today, tomorrow)).to.be.false
      expect(withinDate(today, yesterday)).to.be.true
      done()
    }).add()

    perf('Stop date only supplied', function(done) {
      expect(withinDate(today, null, today)).to.be.true
      expect(withinDate(today, null, tomorrow)).to.be.true
      expect(withinDate(today, null, yesterday)).to.be.false
      done()
    }).add()

    describe('Dates with ranges', function() {
      perf('Today within range', function(done) {
        expect(withinDate(today, today, today)).to.be.true
        expect(withinDate(today, today, tomorrow)).to.be.true
        expect(withinDate(today, today, yesterday)).to.be.false

        expect(withinDate(today, yesterday, today)).to.be.true
        expect(withinDate(today, yesterday, tomorrow)).to.be.true
        expect(withinDate(today, yesterday, yesterday)).to.be.false

        expect(withinDate(today, tomorrow, today)).to.be.false
        expect(withinDate(today, tomorrow, tomorrow)).to.be.false
        expect(withinDate(today, tomorrow, yesterday)).to.be.false
        done()
      }).add()

      perf('Yesterday within range', function(done) {
        expect(withinDate(yesterday, today, today)).to.be.false
        expect(withinDate(yesterday, today, tomorrow)).to.be.false
        expect(withinDate(yesterday, today, yesterday)).to.be.false

        expect(withinDate(yesterday, yesterday, today)).to.be.true
        expect(withinDate(yesterday, yesterday, tomorrow)).to.be.true
        expect(withinDate(yesterday, yesterday, yesterday)).to.be.true

        expect(withinDate(yesterday, tomorrow, today)).to.be.false
        expect(withinDate(yesterday, tomorrow, tomorrow)).to.be.false
        expect(withinDate(yesterday, tomorrow, yesterday)).to.be.false
        done()
      }).add()

      perf('Tomorrow within range', function(done) {
        expect(withinDate(tomorrow, today, today)).to.be.false
        expect(withinDate(tomorrow, today, tomorrow)).to.be.true
        expect(withinDate(tomorrow, today, yesterday)).to.be.false

        expect(withinDate(tomorrow, yesterday, today)).to.be.false
        expect(withinDate(tomorrow, yesterday, tomorrow)).to.be.true
        expect(withinDate(tomorrow, yesterday, yesterday)).to.be.false

        expect(withinDate(tomorrow, tomorrow, today)).to.be.false
        expect(withinDate(tomorrow, tomorrow, tomorrow)).to.be.true
        expect(withinDate(tomorrow, tomorrow, yesterday)).to.be.false
        done()
      }).add()
    })
  })

  describe('Performance (x1000): ', function() {
    mocha.apply(this.timeout(Infinity))
    mocha.apply(this.slow(100))

    let testNum = 1000

    for (let perfTest of mocha.tests) {
      perf(perfTest.description, function(done) {
        let i = 0
        for (; i < testNum; i++) {
          perfTest.perf()
        }
        done()
      })
    }

  })
})
