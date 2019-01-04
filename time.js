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

    var startDate, stopDate
    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      stopDate = new Date(stopDateOpt).getTime()


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
          // This fixes .set(), because .set does not have a soul yet. Passing soul to gun.put() creates weird behavior, so not a solution.
          if (!soul)
            return timeMethods.put.call(gunCtx, gun.put.call(gunCtx, data, null, as), cb)

          gun.put.call(gunCtx, data, cb, as)

          // Last ditch effort to find soul for TimeGraph
          if (!rSoul)
            rSoul = (as && as.item && as.item._ && as.item._.soul) || soul

          var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig)
          var rid = 'timepoint/' + soul
          t = [rid].concat(t)

          // Working example of original modified slightly
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

          var timepoint = milli //milli //time
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
      },

      pause: function() {
      },

      continue: function() {
      },

      done: function() {
      },

      filter: function() {
      },

      // Transformation API
      transform(cb) {
        // Transforms data from a Gun chain before being passed.
      },
    }

    function nodeProxyPoly(node, props) {
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
      console.log(checkDate, startDate, stopDate)

      if (startDate && stopDate)
        if (checkDate >= startDate && checkDate <= stopDate)
          return true
        else
          return false

      // If startDate only provided
      if (startDate && startDate >= checkDate) {
        console.warn('Data outside startDate')
        return false
      }

      // if stopDate only provided
      if (stopDate && stopDate <= checkDate) {
        console.log('Data outside stopDate')
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
