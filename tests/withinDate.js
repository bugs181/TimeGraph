/* eslint-disable no-undef */

var chai = require('chai')
var expect = chai.expect

// Setup algo
function withinDate(checkDate, startDate, stopDate) {
  // If startDate and stopDate are provided, check within bounds
  //console.log(checkDate, startDate, stopDate)

  if (startDate && stopDate)
    if (checkDate >= startDate && checkDate <= stopDate)
      return true
    else
      return false

  // If startDate only provided
  if (startDate && startDate > checkDate) {
    return false
  }

  // if stopDate only provided
  if (stopDate && stopDate < checkDate) {
    return false
  }

  return true
}

describe('Test Basic Algorithm', function() {
  describe('No date range provided, should always return true', function() {
    expect(withinDate(1)).to.be.true
  })

  describe('Start date only supplied', function() {
    expect(withinDate(1, 3)).to.be.false
    expect(withinDate(2, 3)).to.be.false
    expect(withinDate(3, 3)).to.be.true
    expect(withinDate(4, 3)).to.be.true
  })

  describe('Stop date only supplied', function() {
    expect(withinDate(1, null, 3)).to.be.true
    expect(withinDate(2, null, 3)).to.be.true
    expect(withinDate(3, null, 3)).to.be.true
    expect(withinDate(4, null, 3)).to.be.false
  })

  describe('Dates with ranges', function() {
    expect(withinDate(1, 1, 3)).to.be.true
    expect(withinDate(2, 1, 3)).to.be.true
    expect(withinDate(3, 1, 3)).to.be.true
    expect(withinDate(4, 1, 3)).to.be.false
  })
})

describe('Test real dates', function() {
  var today = new Date()
  var yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  var tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1)

  describe('No date range provided, should always return true', function() {
    expect(withinDate(today)).to.be.true
  })

  describe('Start date only supplied', function() {
    expect(withinDate(today, today)).to.be.true
    expect(withinDate(today, tomorrow)).to.be.false
    expect(withinDate(today, yesterday)).to.be.true
  })

  describe('Stop date only supplied', function() {
    expect(withinDate(today, null, today)).to.be.true
    expect(withinDate(today, null, tomorrow)).to.be.true
    expect(withinDate(today, null, yesterday)).to.be.false
  })

  describe('Dates with ranges', function() {
    describe('Today within range', function() {
      expect(withinDate(today, today, today)).to.be.true
      expect(withinDate(today, today, tomorrow)).to.be.true
      expect(withinDate(today, today, yesterday)).to.be.false

      expect(withinDate(today, yesterday, today)).to.be.true
      expect(withinDate(today, yesterday, tomorrow)).to.be.true
      expect(withinDate(today, yesterday, yesterday)).to.be.false

      expect(withinDate(today, tomorrow, today)).to.be.false
      expect(withinDate(today, tomorrow, tomorrow)).to.be.false
      expect(withinDate(today, tomorrow, yesterday)).to.be.false
    })

    describe('Yesterday within range', function() {
      expect(withinDate(yesterday, today, today)).to.be.false
      expect(withinDate(yesterday, today, tomorrow)).to.be.false
      expect(withinDate(yesterday, today, yesterday)).to.be.false

      expect(withinDate(yesterday, yesterday, today)).to.be.true
      expect(withinDate(yesterday, yesterday, tomorrow)).to.be.true
      expect(withinDate(yesterday, yesterday, yesterday)).to.be.true

      expect(withinDate(yesterday, tomorrow, today)).to.be.false
      expect(withinDate(yesterday, tomorrow, tomorrow)).to.be.false
      expect(withinDate(yesterday, tomorrow, yesterday)).to.be.false
    })

    describe('Tomorrow within range', function() {
      expect(withinDate(tomorrow, today, today)).to.be.false
      expect(withinDate(tomorrow, today, tomorrow)).to.be.true
      expect(withinDate(tomorrow, today, yesterday)).to.be.false

      expect(withinDate(tomorrow, yesterday, today)).to.be.false
      expect(withinDate(tomorrow, yesterday, tomorrow)).to.be.true
      expect(withinDate(tomorrow, yesterday, yesterday)).to.be.false

      expect(withinDate(tomorrow, tomorrow, today)).to.be.false
      expect(withinDate(tomorrow, tomorrow, tomorrow)).to.be.true
      expect(withinDate(tomorrow, tomorrow, yesterday)).to.be.false
    })
  })
})