/* eslint-disable no-console */
/* eslint-disable prefer-template */
;(function() {
  'use strict'

  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')

  if (!Gun)
    throw new Error('TimeGraph is meant to be used with Gun')

  var gun, root
  var ify = Gun.node.ify

  // Object to store the state of TimeGraph, range, window/buffer, and other stateful things.
  var timeState = {
    startDate: null,
    stopDate: null,
    enforceData: false,

    graph: {
      low: 0,
      high: 0,
    },

    graphKey: {
      low: null, // Stores lowest soul
      high: null, // Stores highest soul
    },

    range: {
      low: [],
      high: [],

      //now: 0,
      //tot: 0, // keep in sync with timePointIndex.length
    },

    newItemCount: 0,

    usingRange: false,
    cursor: 0,
    max: Infinity,
  }

  function gunProxy(node, props) {
    var nodeProps = {}
    for (var key of Object.keys(props)) {
      nodeProps[key] = { value: props[key] }
    }

    var newNode = Object.create(node, nodeProps)
    newNode = Object.assign(newNode, node)

    return newNode
  }

  function methodProxy(gun, method) {
    return function() {
      //console.log(method, 'proxied')
      return gunProxy(gun[method].apply(this, arguments), gun.timegraph)
    }
  }


  Gun.chain.timegraph = function timegraph(startDateOpt, stopDateOpt) {
    gun = this, root = gun.back(-1)

    var opts = gun && gun._ && gun._.root && gun._.root.opt
    timeState.enforceData = opts.enforceData

    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      timeState.startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      timeState.stopDate = new Date(stopDateOpt).getTime()

    // Generic proxy for re-routing Gun methods.
    Gun.chain.timegraph.get = methodProxy(gun, 'get')
    Gun.chain.timegraph.set = methodProxy(gun, 'set')
    Gun.chain.timegraph.map = methodProxy(gun, 'map')

    // Exposed helpers
    Gun.chain.timegraph.withinDate = withinRange
    Gun.chain.timegraph.withinRange = withinRange

    return gunProxy(gun, Gun.chain.timegraph)
  }


  Gun.chain.timegraph.time = function time(data, cb) {
    if (data instanceof Function) {
      cb = data
      return Gun.chain.timegraph.on.call(this, cb)
    }

    return gun.timegraph.set.call(this, data, cb)
  }

  Gun.chain.timegraph.put = function timePut(data, cb, as, rSoul) {
    var gunCtx = this

    if (Gun.is(data)) {
      data.get(function(soul) {
        if (!soul)
          return cb && cb({ err: "Timegraph cannot link `undefined`!" })

        gun.timegraph.put.call(gunCtx, Gun.val.link.ify(soul), cb, as, soul)
      }, true)
      return gunCtx
    }

    gun.get(function(soul) {
      // This fixes odd behavior like .set(), because .set does not have a soul on first .put. Passing soul to gun.put() creates weird behavior, so not a solution.
      if (!soul)
        return gun.timegraph.put.call(gunCtx, gun.put.call(gunCtx, data, null, as), cb)

      gun.put.call(gunCtx, data, cb, as)

      // Last ditch effort to find soul for TimeGraph
      if (!rSoul)
        rSoul = (as && as.item && as.item._ && as.item._.soul) || soul

      var d = new Date(Gun.state())
      var t = d.toISOString().split(/[\-t\:\.z]/ig)
      var rid = 'timepoint/' + soul
      t = [rid].concat(t)

      // Working example of original modified slightly. Will later work this into a loop.
      var milliStr = t.join(':')
      var milliSoul = milliStr.substring(0, milliStr.length - 1)
      var milli = ify({}, milliSoul)
      milli.soul = rSoul

      var tmp = t.pop()
      tmp = t.pop()

      var sec = ify({}, t.join(':'))
      sec[tmp] = milli
      tmp = t.pop()

      var min = ify({}, t.join(':'));
      min[tmp] = sec;
      tmp = t.pop();

      var hour = ify({}, t.join(':'))
      hour[tmp] = min
      tmp = t.pop()

      var day = ify({}, t.join(':'))
      day[tmp] = hour
      tmp = t.pop()

      var month = ify({}, t.join(':'))
      month[tmp] = day
      tmp = t.pop()

      var year = ify({}, t.join(':'))
      year[tmp] = month
      tmp = t.pop()

      var time = ify({}, t.join(':'))
      time[tmp] = year

      var timepoint = time //milli //time
      root.put.call(root, { last: milli, timepoint, soul }, 'timegraph/' + soul)

      timeState.graph.high = d.getTime()
      timeState.graphKey.high = milliSoul

      // TODO: Can we use node().not() to insert `first` prop above? Then chain off of that?
      // root.not().put.call(root, { first: milli }, 'timegraph/' + soul)
      // Scratch this idea. .put performance is more important than querying..
    }, true)

    return gunCtx
  }

  Gun.chain.timegraph.once = function timeOnce(cb, soulOnly) {
    cb = (cb instanceof Function && cb) || function(){}

    gun.get(function(soul) {
      if (!soul)
        return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

      // Default to all timepoints if no range is provided.
      if (!timeState.usingRange) {
        timeState.range.low = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity]
        timeState.range.high = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity]
      }

      getRange('timepoint/' + soul, function(timepoint, soul, state) {
        timeState.cursor++

        if (soulOnly)
          return cb({ '#': soul }, timepoint, state)

        root.get(soul).once(function(data) {
          cb.call(gun.timegraph, data, timepoint, state) // Warning: callback(this) refers to the TimeGraph
        })
      })
    }, true)

    return this
  }

  Gun.chain.timegraph.on = function timeOn(cb, soulOnly) {
    cb = (cb instanceof Function && cb) || function(){}

    gun.get(function(soul) {
      if (!soul)
        return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

      // Default to all timepoints if no range is provided.
      if (!timeState.usingRange) {
        timeState.range.low = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity]
        timeState.range.high = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity]
      }

      root.get(soul).on(function() {
        getRange('timepoint/' + soul, function(timepoint, soul, state) {
          timeState.cursor++

          if (soulOnly)
            return cb({ '#': soul }, timepoint, state)

          root.get(soul).once(function(data) {
            cb.call(gun.timegraph, data, timepoint, state) // Warning: callback(this) refers to the TimeGraph
          })

          // TODO: Update low range to last timepoint.
          //timeState.range.low = granularDate(new Date(timepoint))
        })
      })
    }, true)

    return this
  }

  Gun.chain.timegraph.off = function timeOff(cb) {
    // .time(data).once(callback).off() Will not trigger an update in .time(callback)
    // The equivelant of doing `node.set(data).once(callback).off()`
    // This may be a bug in Gun where calling `.off()` directly after `.once()` results in lost data.
    // See: https://github.com/amark/gun/issues/685

    cb = (cb instanceof Function && cb) || function(){}

    timeState.range.low = 0
    timeState.range.high = 0
    timeState.usingRange = false

    gun.get(function(soul) {
      if (!soul)
        return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

      root.get(soul).off(cb)
    }, true)

    return this
  }

  // Subset of API for filtering
  Gun.chain.timegraph.range = function timeRange(startRange, stopRange) {
    timeState.range.low = []
    timeState.range.high = []
    timeState.usingRange = true
    timeState.cursor = 0

    if (startRange instanceof Date) // TODO: Do magic
      timeState.range.low = granularDate(startRange)
    else
      console.warn('Warning: Improper start Date used for .range()')

    if (stopRange instanceof Date)
      timeState.range.high = granularDate(stopRange)
    else
      console.warn('Warning: Improper stop Date used for .range()')

    return this //Gun.chain.timegraph //Gun.chain.timegraph.range
  }

  Gun.chain.timegraph.first = function timeFirst(count) {
  }

  Gun.chain.timegraph.last = function timeLast(count) {
  }

  Gun.chain.timegraph.pause = function timePause() {
  }

  Gun.chain.timegraph.resume = function timeResume() {
  }

  Gun.chain.timegraph.near = function timeNear() {
    // This function is to be used in conjunction with .first/.last or .pause/.resume
  }

  Gun.chain.timegraph.done = function timeDine(cb) {
    // cb will pass new items count since last Gun emit event, potentially along with timegraph of those items. (Requires array or obj, but may be better in user-land)
    // cb(timeState.newItemCount). The reason this is a seperate API method and not part of .range, .first, etc is so that it can be used in the future for other things.
  }

  Gun.chain.timegraph.filter = function timeFilter() {
  }

  // Transformation API
  Gun.chain.timegraph.transform = function timeTransform(cb) {
    // Transforms data from a Gun chain before being passed.
  }


  function withinRange(checkRange, startRange, stopRange) {
    // If startDate and stopDate are provided, check within bounds
    //console.log(checkRange, startRange, stopRange)

    if (startRange && stopRange)
      if (checkRange >= startRange && checkRange <= stopRange)
        return true
      else
        return false

    // If startDate only provided
    if (startRange && startRange > checkRange) {
      return false
    }

    // if stopDate only provided
    if (stopRange && stopRange < checkRange) {
      return false
    }

    return true
  }

  function getRange(soul, callback, depth) {
    console.log('getOpRange', soul)

    root.get(soul).once(function(timepoint) {
      if (!timepoint)
        return

      if (!depth)
        depth = 0

      // Retrieve all timepoint keys within range.
      var low = timeState.range.low[depth]
      var high = timeState.range.high[depth]

      var keys = []
      for (var key of Object.keys(timepoint)) {
        if (key === '_' || key === 'soul')
          continue

        var tp = (soul + ':' + key).split(':').slice(1)
        var d = new Date(tp[0], tp[1] - 1 || 0, tp[2] || 1, tp[3] || 0, tp[4] || 0, tp[5] || 0, tp[6] || 0)
        var ts = granularDate(d)

        // Not in range, move to next
        if (!withinRange(ts[depth], low, high))
          continue

        keys.push(key) // Any given timepoint will realistically only have 60 keys at most. (The only exception is milliseconds, which has up to 1000)
      }

      if (timepoint.soul) {
        // TODO: replace callback state with tp. This will allow .near() and .range(first, last) to be used within callback.
        return callback(soul, timepoint.soul, timepoint._['>'].soul)
      }

      // Recurse to find timepoint souls
      keys.sort() // FIXME: Key sorting does not working for 10, 11, 01, 02
      depth++

      for (var tpKey of keys) {
        // We already have the amount we asked for, exit from getRange()
        if (timeState.cursor >= timeState.max)
          return

        getRange(soul + ':' + tpKey, callback, depth)
      }
    })
  }

  function granularDate(date) {
    // This method is required for more efficient traversal.
    // It exists, due to the root Date() may be outside of range, although technically still in it.
    // For example, with a start range of March 20, 2019 and a stop range of March 21, 2019. The root date returned is just '2019', which has a default of Jaunuary 1, 2019
    // We break these ranges down into an array so sRange = [year, month, day, hour, min, sec, ms] set appropriately. We check each of these date ranges with a `depth` cursor.

    // TODO: See if there's a more efficient way of doing this.

    var year = new Date(date.getFullYear().toString())

    var month = new Date(year)
    month.setUTCMonth(date.getUTCMonth())

    var day = new Date(month)
    day.setUTCDate(date.getUTCDate())

    var hour = new Date(day)
    hour.setUTCHours(date.getUTCHours())

    var mins = new Date(hour)
    mins.setUTCMinutes(date.getUTCMinutes())

    var sec = new Date(mins)
    sec.setUTCSeconds(date.getUTCSeconds())

    var ms = new Date(sec)
    ms.setUTCMilliseconds(date.getUTCMilliseconds())

    return [year.getTime(), month.getTime(), day.getTime(), hour.getTime(), mins.getTime(), sec.getTime(), ms.getTime()]
  }


  // Shim for backward compatibility
  var origTimegraph = (typeof Gun.chain.time !== 'undefined') ? Gun.chain.time : null
  if (origTimegraph)
    return console.warn('Warning: Original .time() API detected! Please remove it from your project to use the new API.')

  Gun.chain.time = function(data, a, b) {
    if (b)
      console.warn('Warning: Detected that you are still using the old TimeGraph API, we recommend switching to the new API syntax for more features and better stability.')

    return Gun.chain.timegraph.time.apply(this, data, a)
  }

}())
