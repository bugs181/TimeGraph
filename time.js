/* eslint-disable no-func-assign */
/* eslint-disable no-console */
/* eslint-disable prefer-template */
;(function() {
  'use strict'

  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')

  if (!Gun)
    throw new Error('TimeGraph is meant to be used with Gun')

  //var gun, root
  var ify = Gun.node.ify

  // Object to store the state of TimeGraph, range, window/buffer, and other stateful things.
  var timeState = {
    startDate: null,
    stopDate: null,
    enforceData: false,

    range: {
      low: [],
      high: [],
    },

    newItemCount: 0,

    usingRange: false,

    _pending: 0,
    get pending() { return timeState._pending },
    set pending(val ) {
      timeState._pending = val
      //console.log(timeState.pending)

      if (timeState._pending === 0)
        timeState.done()

      return timeState._pending
    },

    cursor: 0,
    max: Infinity,
    rangeOrder: '<',

    done: function(){},
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
    var gun = this

    // Create a clone of timeState for new API chain.
    gun.timeState = Object.assign({}, timeState)
    timeState = gun.timeState

    var opts = gun && gun._ && gun._.root && gun._.root.opt
    timeState.enforceData = opts.enforceData

    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      timeState.startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      timeState.stopDate = new Date(stopDateOpt).getTime()

    // Generic proxy for re-routing Gun methods.
    Gun.chain._put = Gun.chain.put
    Gun.chain.timegraph.get = methodProxy(gun, 'get')
    Gun.chain.timegraph.set = methodProxy(gun, 'set')
    Gun.chain.timegraph.map = methodProxy(gun, 'map')

    // Exposed helpers
    Gun.chain.timegraph.withinDate = withinRange
    Gun.chain.timegraph.withinRange = withinRange

    // Bind Helper functions
    traverse = traverse.bind(gun)
    resetRange = resetRange.bind(gun)

    return gunProxy(gun, Gun.chain.timegraph)
  }


  Gun.chain.timegraph.time = function time(data, cb) {
    var gun = this

    if (data instanceof Function) {
      cb = data
      return Gun.chain.timegraph.on.call(this, cb, true)
    }

    return gun.timegraph.set.call(this, data, cb)
  }

  Gun.chain.timegraph.put = function timePut(data, cb, as, rSoul) {
    var gunCtx = this
    var gun = this.back(1)
    var root = gun.back(-1)

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
        return gun.timegraph.put.call(gunCtx, gunCtx._put.call(gunCtx, data, null, as), cb)

      gunCtx._put.call(gunCtx, data, cb, as)

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

      var timepoint = time
      root.put.call(root, { last: milli, timepoint, soul }, 'timegraph/' + soul)
    }, true)

    return gunCtx
  }

  Gun.chain.timegraph.once = function timeOnce(cb, soulOnly) {
    cb = (cb instanceof Function && cb) || function(){}

    var gun = this
    var root = gun.back(-1)
    var timeState = gun.timeState

    setTimeout(function() { // Give app a chance to set up chaining API. (Example .once().done(cb))
      gun.get(function(soul) {
        if (!soul)
          return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

        // Default to all timepoints if no range is provided.
        if (!timeState.usingRange) {
          timeState.range.low = [-Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity, -Infinity]
          timeState.range.high = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity]
        }

        traverse('timepoint/' + soul, function(timepoint, soul, state) {
          timeState.cursor++

          var tpTime = (timepoint).split(':').slice(1)
          var dTime = new Date(tpTime[0], tpTime[1] - 1 || 0, tpTime[2] || 1, tpTime[3] || 0, tpTime[4] || 0, tpTime[5] || 0, tpTime[6] || 0)

          if (soulOnly) {
            cb({ '#': soul }, timepoint, dTime.getTime()) //cb({ '#': soul }, timepoint, state)
            return timeState.pending--
          }

          root.get(soul).once(function(data) {
            cb.call(gun.timegraph, data, timepoint, dTime) //cb.call(gun.timegraph, data, timepoint, state) // Warning: callback(this) refers to the TimeGraph
            timeState.pending--
          })
        })
      }, true)
    }, 1)

    return this
  }

  Gun.chain.timegraph.on = function timeOn(cb, soulOnly) {
    Gun.chain.timegraph.once.apply(this, arguments)
    // TODO: Implement .on to use backward traversal.

    cb = (cb instanceof Function && cb) || function(){}

    var gun = this, root = gun.back(-1)

    gun.get(function(soul) {
      if (!soul)
        return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

      root.get('timegraph/' + soul).on(function(timegraph) {
        // TODO: determine if .on works for nested data, since it may not necessarily be a timepoint index.
        if (!timegraph.last)
          return cb.call(gun, { err: Gun.log('TimeGraph ran into incomplete node, please report this!') })

        var state = Gun.state.is(timegraph, 'timepoint')
        if (!isFinite(state))
          return cb.call(gun, { err: Gun.log('TimeGraph ran into invalid state, please report this!') })

        // TODO: use range.low[length] + range.high[length].. or switch to granularDate(), alternative would be to look into dup.track() and use getRange()
        if (!withinRange(state, timeState.startDate, timeState.stopDate))
          return

        //var stateDate = new Date(state).getTime() // || function userProvided() {}
        var stateDate = state
        root.get(timegraph.last['#']).once(function(timepoint, key) {
          if (soulOnly)
            return cb({ '#': timepoint.soul }, key, stateDate)

          root.get(timepoint.soul).once(function(data, key) {
            cb.call(this, data, key, stateDate)
          })
        })
      }, true)
    }, true)

    return this
  }

  Gun.chain.timegraph.off = function timeOff(cb) {
    // .time(data).once(callback).off() Will not trigger an update in .time(callback)
    // The equivelant of doing `node.set(data).once(callback).off()`
    // This may be a bug in Gun where calling `.off()` directly after `.once()` results in lost data.
    // See: https://github.com/amark/gun/issues/685

    var gun = this, root = gun.back(-1)

    resetRange()
    cb = (cb instanceof Function && cb) || function(){}
    gun.get(function(soul) {
      if (!soul)
        return cb.call(gun, { err: Gun.log('TimeGraph could not determine soul, please report this!') })

      root.get(soul).off(cb)
    }, true)

    return this
  }

  // Subset of API for filtering
  Gun.chain.timegraph.range = function timeRange(startDate, stopDate) {
    var timeState = this.timeState
    resetRange()
    timeState.usingRange = true

    if (startDate instanceof Date) // TODO: Do magic
      timeState.range.low = granularDate(startDate)
    else
      console.warn('Warning: Improper start Date used for .range()')

    if (stopDate instanceof Date)
      timeState.range.high = granularDate(stopDate)
    else
      console.warn('Warning: Improper stop Date used for .range()')

    return this
  }

  Gun.chain.timegraph.reverse = function timeReverseRange() {
    timeState.rangeOrder = '>'
    return this
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

  Gun.chain.timegraph.done = function timeDone(cb) {
    // cb will pass new items count since last Gun emit event, potentially along with timegraph of those items. (Requires array or obj, but may be better in user-land)
    // cb(timeState.newItemCount). The reason this is a seperate API method and not part of .range, .first, etc is so that it can be used in the future for other things.

    cb = (cb instanceof Function && cb) || function(){}
    timeState.done = cb
  }

  Gun.chain.timegraph.filter = function timeFilter() {
  }

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
    if (startRange && startRange <= checkRange) {
      return true
    }

    // if stopDate only provided
    if (stopRange && stopRange >= checkRange) {
      return true
    }

    return false
  }

  function traverse(soul, callback, depth) {
    var gun = this
    var root = gun.back(-1)
    var timeState = gun.timeState

    console.log('traverse', soul)

    root.get(soul).get(function(msg, ev) {
      var timepoint = msg.put
      ev.off()

      if (!timepoint)
        return

      if (!depth)
        depth = 0

      timeState.pending++

      // Retrieve all timepoint keys within range.
      var low = timeState.range.low[depth]
      var high = timeState.range.high[depth]

      var keys = []
      for (var key of Object.keys(timepoint)) {
        if (key === '_' || key === 'soul')
          continue

        var tp = (soul + ':' + key).split(':').slice(1)
        var d = new Date(tp[0], tp[1] - 1 || 0, tp[2] || 1, tp[3] || 0, tp[4] || 0, tp[5] || 0, tp[6] || 0)
        var ts = granularDate(d, depth)

        // Not in range, move to next
        if (!withinRange(ts, low, high))
          continue

        keys.push(key) // Any given timepoint bucket will realistically only have 60 keys at most. (The only exception is milliseconds, which has up to 1000)
      }

      if (timepoint.soul)
        return callback(soul, timepoint.soul, timepoint._['>'].soul)

      // Recurse to find timepoint souls
      keys.sort()
      depth++

      if (timeState.rangeOrder === '>')
        keys.reverse()

      for (var tpKey of keys) {
        // We already have the amount we asked for, exit from getRange()
        if (timeState.cursor >= timeState.max) {
          timeState.pending = 0
          return
        }

        traverse(soul + ':' + tpKey, callback, depth)
      }

      timeState.pending--
    })
  }

  function granularDate(date, depth) {
    // This method is required for more efficient traversal.
    // It exists, due to the bucket Date() may be outside of range, although technically still in it.
    // For example, with a start range of March 20, 2019 and a stop range of March 21, 2019. The root bucket date returned is just '2019', which has a default of Jaunuary 1, 2019
    // We break these ranges down into an array; sRange = [year, month, day, hour, min, sec, ms] building off of the former. We check each of these date ranges with a `depth` cursor.

    var year = new Date(date.getFullYear().toString())
    if (typeof depth === 'number' && depth === 0) return year.getTime()

    var month = new Date(year)
    month.setUTCMonth(date.getUTCMonth())
    if (typeof depth === 'number' && depth === 1) return month.getTime()

    var day = new Date(month)
    day.setUTCDate(date.getUTCDate())
    if (typeof depth === 'number' && depth === 2) return day.getTime()

    var hour = new Date(day)
    hour.setUTCHours(date.getUTCHours())
    if (typeof depth === 'number' && depth === 3) return hour.getTime()

    var mins = new Date(hour)
    mins.setUTCMinutes(date.getUTCMinutes())
    if (typeof depth === 'number' && depth === 4) return mins.getTime()

    var sec = new Date(mins)
    sec.setUTCSeconds(date.getUTCSeconds())
    if (typeof depth === 'number' && depth === 5) return sec.getTime()

    var ms = new Date(sec)
    ms.setUTCMilliseconds(date.getUTCMilliseconds())
    if (typeof depth === 'number' && depth === 6) return ms.getTime()

    // We want all of them.
    return [year.getTime(), month.getTime(), day.getTime(), hour.getTime(), mins.getTime(), sec.getTime(), ms.getTime()]
  }

  function resetRange() {
    var timeState = this.timeState
    timeState.range.low = []
    timeState.range.high = []
    timeState.usingRange = false
    timeState.rangeOrder = '<'
    timeState.cursor = 0
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
