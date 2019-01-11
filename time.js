/* eslint-disable no-console */
/* eslint-disable prefer-template */
;(function() {
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
      low: 0,
      high: 0,

      //now: 0,
      //tot: 0, // keep in sync with timePointIndex.length
    },

    newItemCount: 0,
    usingRange: false,
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
      console.log(method, 'proxied')
      return gunProxy(gun[method].apply(this, arguments), gun.timegraph)
    }
  }


  Gun.chain.timegraph = function(startDateOpt, stopDateOpt) {
    'use strict'

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

    Gun.chain.timegraph.once = Gun.chain.timegraph.event(gun, 'once')
    Gun.chain.timegraph.on = Gun.chain.timegraph.event(gun, 'on')

    return gunProxy(gun, Gun.chain.timegraph)
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

  Gun.chain.timegraph.time = function(data, cb) {
    if (data instanceof Function) {
      cb = data
      //return chainEvent.call(this, 'on', cb, true)
    }

    var proxy = gunProxy(this, Gun.chain.timegraph)
    return Gun.chain.timegraph.set.call(proxy, data, cb)
  }

  Gun.chain.timegraph.put = function(data, cb, as, rSoul) {
    console.log('put called')
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

      var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig)
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
      root.put.call(root, { last: milli, state: Gun.state(), timepoint, soul }, 'timegraph/' + soul)

      timeState.graph.high = t
      timeState.graphKey.high = milliSoul
      console.log(timeState)
    }, true)

    return gunCtx
  }


  Gun.chain.timegraph.event = function(gun, event, soulOnly) {
    return function chainEvent(cb) {
      cb = (cb instanceof Function && cb) || function(){}

      // Called from time.range().$event(), ex: people.time().range().once()
      /*if (timeState.usingRange) {
        // TODO: Think about if this is the best place to put this. We may need to get the range for every .range() instead, for existing streams.
        // Would calling .range() on it again affect anything?? Maybe it will still let us use old events. We have .off() if we need to do other events.
        gun.get(function(soul) {
          getRange('timepoint/' + soul, function(range)  {
            console.log('Finished getting range')
            if (timeState.range.cb instanceof Function)
              timeState.range.cb(range)
          })
        }, true)

        timeState.range.cb = function() {
          // TODO: getNearestRange(timeState.range.low, timeState.graph.low) // Do we really need this? Can't we just use traverse and check if between the dateRange()
          //    The above would require getting every single node, though.. Don't we need that for traverse cache anyway?? We could bail early if it's not in the range... hmmm...
          //  For example, if range(2019), and nodes from 2018 exist, the .getTime() would be sufficient for that check..

          // TODO: do range logic... like findInRange || traverse..
          // TODO: Soul only
          // TODO: For each range.. we need to call .once and .on, for .time() this would give us the whole list.. this is fine to be called every time, because the user can .push() to array
          // Then after iterating each key we call .done()
          // TODO: .first and .last NEED to use range, otherwise the data isn't meaningul at all.

          cb.apply(this, arguments)
        }

        return this
      }*/

      // Not using range, so detour them to TimeGraph node.
      gun.get(function(soul) {
        if (!soul)
          return cb.call(gun, { err: Gun.log('TimeGraph ran into .on error, please report this!') })

        root.get('timegraph/' + soul)[event](function(timegraph) {
          if (!withinDate(timegraph.state, timeState.startDate, timeState.stopDate))
            return

          root.get(timegraph.last['#']).once(function(timepoint, key) {
            if (soulOnly)
              return cb(timepoint.soul, key, timegraph.state)

            root.get(timepoint.soul).once(function(data, key) {
              cb(data, key, timegraph.state)
            })
          })
        })
      }, true)

      return this
    }
  }


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

}())
