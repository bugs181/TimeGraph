/* eslint-disable no-undef */

const mocha = require('../lib/mocha-log')
const perf = mocha.perf

var helpers = require('../examples/helpers')
var get = helpers.get

let testNum = 1000

var timeState = {
  graph: {
    low: Infinity,
    high: -Infinity,
  },

  graphKey: {
    low: null, // Stores lowest soul
    high: null, // Stores highest soul
  },

  range: {
    low: 0,
    high: 0,

    //now: 0,
    //tot: 0, // keep in sync with timePointIndex.length
  },

  newItemCount: 0,
}

describe('Range Performance (x1000): ', function() {
  this.timeout(5000)

  // Setup
  let soul = 'jqp2nkw101aSXACaFW9pSKd'

  perf('getRange:', function(done) {
    let i = 0

    for (; i < testNum; i++) {
      getRange('timepoint/' + soul, function(){})
    }
    done()
  })
})


function getOpRange(soul, operator, callback, isAlreadyFixed, timeState) {
  //console.log(soul)

  if (!timeState)
    timeState = { value: null, soul: null }

  get(soul, function(timepoint) {
    if (!timepoint)
      return

    var opValue = null
    for (var key of Object.keys(timepoint)) {
      if (key === '_' || key === 'soul')
        continue

      if (!opValue || operator === '<' && key < opValue || operator === '>' && key > opValue)
        opValue = key
    }

    // Traverse if we're not at the end
    if (!timepoint.soul) {
      opValue && getOpRange(soul + ':' + opValue, operator, callback, isAlreadyFixed, timeState)
      return
    }

    // We're at the end of timepoint, convert to date.
    var tp = soul.split(':').slice(1)
    var d = new Date(Date.UTC.apply(null, tp))
    var ts = d.getTime()

    // Determine if the new low/high are better than existing.
    if (!timeState.value || ts < timeState.value) {
      timeState.value = ts
      timeState.soul = soul
    }

    callback(timeState)
  })
}

function getRange(soul, callback) {
  // This function essentially creates a 'large' window of TimePoints to process down into smaller ranges later.
  // It's efficient due to not having to traverse down every node, only the smallest and largest.
  // The recursion is efficient because it only needs O(timepointDepth: 8) lookup. (timepoint, year, month, day, min, sec, ms, node)
  // Actual use is O(8 + 8) for both ranges

  var callbackLatch = 2

  function cb() {
    callbackLatch--
    if (callbackLatch === 0)
      callback && callback(timeState)
  }

  // Get lowest range
  getOpRange(soul, '<', function(range) {
    timeState.graph.low = range.value
    timeState.graphKey.low = range.soul
    cb()
  })

  // Get highest range
  getOpRange(soul, '>', function(range) {
    timeState.graph.high = range.value
    timeState.graphKey.high = range.soul
    cb()
  })
}
