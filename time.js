/* eslint-disable no-console */
/* eslint-disable prefer-template */
;(function() {
  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')

  if (!Gun)
    throw new Error('TimeGraph is meant to be used with Gun')

  Gun.chain.timegraph = function(startDateOpt, stopDateOpt) {
    'use strict'

    var gun = this, root = gun.back(-1)
    var ify = Gun.node.ify
    var opts = gun && gun._ && gun._.root && gun._.root.opt
    var enforceData = opts.enforceData

    // TODO: These will likely be moved into timeState obj.
    var startDate, stopDate
    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      stopDate = new Date(stopDateOpt).getTime()

    // Object to store the state of window/buffer
    var timeState = {
      now: 0,

      range: {
        low: 0,
        high: 0,
      },

      newItemCount: 0,
    }

    var timeMethods = {

      /* BEGIN UN-NEEDED METHODS */
      // TODO: find all functions inside nodeProxyPoly and proxy them with timeMethods. We don't need map; filtering is taken care of in .on and .once
      get: function() {
        return nodeProxyPoly(gun.get.apply(this, arguments), timeMethods)
      },

      map: function() {
        return nodeProxyPoly(gun.map.apply(this, arguments), timeMethods)
      },

      set: function() {
        return nodeProxyPoly(gun.set.apply(this, arguments), timeMethods)
      },
      /* END UN-NEEDED METHODS */

      time: function(data, cb) {
        if (data instanceof Function) {
          cb = data
          return chainEvent.call(this, 'on', cb, true)
        }

        return timeMethods.set.call(this, data, cb)
      },

      put: function(data, cb, as, rSoul) {
        var gunCtx = this

        if (Gun.is(data)) {
          data.get(function(soul) {
            if (!soul)
              return cb && cb({ err: "Timegraph cannot link `undefined`!" })

            timeMethods.put.call(gunCtx, Gun.val.link.ify(soul), cb, as, soul)
          }, true)
          return gunCtx
        }

        gun.get(function(soul) {
          // This fixes odd behavior like .set(), because .set does not have a soul on first .put. Passing soul to gun.put() creates weird behavior, so not a solution.
          if (!soul)
            return timeMethods.put.call(gunCtx, gun.put.call(gunCtx, data, null, as), cb)

          gun.put.call(gunCtx, data, cb, as)

          // Last ditch effort to find soul for TimeGraph
          if (!rSoul)
            rSoul = (as && as.item && as.item._ && as.item._.soul) || soul

          var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig)
          var rid = 'timepoint/' + soul
          t = [rid].concat(t)

          // Working example of original modified slightly. Will later work this into a loop.
          var milli = ify({}, t.join(':'))
          milli['soul'] = rSoul

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

          var time = ify({}, t.join(':') || 'id')
          time[tmp] = year

          // TODO: FIXME: Need to fix dangling : on last item.

          var timepoint = time //milli //time
          root.put.call(root, { last: milli, state: Gun.state(), timepoint, soul }, 'timegraph/' + soul)
        }, true)

        return gunCtx
      },

      once: function(cb) {
        return chainEvent.call(this, 'once', cb)
      },

      on: function(cb) {
        return chainEvent.call(this, 'on', cb)
      },

      off: function() {
        return chainEvent.call(this, 'off')
      },

      // Subset of API for filtering
      range: function(startRange, stopRange) {
        //timeState.now = Gun.state()
        //
        timeState.range.low = startRange
        timeState.range.high = stopRange
        //traverse.call(this)
      },

      first: function(count) {
      },

      last: function(count) {
      },

      pause: function() {
      },

      resume: function() {
      },

      done: function(cb) {
        // cb will pass new items count since last Gun emit event, potentially along with timegraph of those items. (Requires array or obj, but may be better in user-land)
        // cb(timeState.newItemCount). The reason this is a seperate API method and not part of .range, .first, etc is so that it can be used in the future for other things.

      },

      filter: function() {
      },

      // Transformation API
      transform(cb) {
        // Transforms data from a Gun chain before being passed.
      },

      withinDate() {
        return withinDate.apply(this, arguments)
      },
    }

    function nodeProxyPoly(node, props) {
      // NOTE: Alternative method would be to just redeclare gun.chain.apiMethod and proxy those instead.

      var nodeProps = {}
      for (var key of Object.keys(props)) {
        nodeProps[key] = { value: props[key] }
      }

      var newNode = Object.create(node, nodeProps)
      newNode = Object.assign(newNode, node)

      return newNode
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

    function chainEvent(event, cb, soulOnly) {
      // TODO: .on/.once can take multiple paths like .first, .last, .range
      cb = (cb instanceof Function && cb) || function(){}

      gun.get(function(soul) {
        if (!soul)
          return cb.call(gun, { err: Gun.log('TimeGraph ran into .on error, please report this!') })

        root.get('timegraph/' + soul)[event](function(timegraph) {
          if (!withinDate(timegraph.state, startDate, stopDate))
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

    function traverse() {
      //console.log(timegraph)
      //var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig)

      // var r = gun.__.opt.hooks.all(keys, {from: 'user/', upto: '/', start: "c", end: "f"});

      // TODO: Some idea that takes high num - low num to find middle, and store timepoint refs inebtween a sparse array type thing.
      // Then build a timeIndex of inbetween values. This would be at most 100 to 500 datapoints, changed with a cacheLevel opt config.
      // 100 datapoints on average, 500 for medium sized data, etc.

      // .from(myLastVisit).to(whenPageLoaded).map().once()

      root.get(function(timepoint, ev) {
        console.log(arguments)
      }, true)

      gun.get(function(soul) {
        gun.get(function(timepoint, ev) {
          console.log(arguments)
        })
        /*gun.get('timepoint/' + soul).get(function(timepoint, ev) {
          console.log(arguments)
        })*/
      }, true)
      return this



      gun.get(function(soul) {
        root.get('timepoint/' + soul).once(function(timepoint) {
          console.log(timepoint)
          for (var key of Object.keys(timepoint)) {
            if (key === '_')
              continue

            timeState.now = new Date(key).getTime() //.toISOString()
            if (withinDate(timeState.now, timeState.range.low, timeState.range.high))
              console.log('within time')
            else
              console.log('not within time')
          }
        })
      }, true)
    }

    function traverseRemote() {

    }

    return nodeProxyPoly(gun, timeMethods)
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
