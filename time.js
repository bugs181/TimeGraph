/* eslint-disable no-console */
/* eslint-disable prefer-template */
;(function() {
  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')

  if (!Gun)
    throw new Error('TimeGraph is meant to be used with Gun')

  Gun.chain.timegraph = function(startDateOpt, stopDateOpt) {
    'use strict'

    var gun = this, root = gun.back(-1)
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
          return timeMethods.on.call(this, function(data, key, _, _2, time) {
            cb && cb(data, key, time)
          })
        }

        // Create new data/soul for every .put to match original API
        var soul = (gun.back('opt.uuid') || Gun.text.random)(9)
        data._ = { '#': soul }
        return timeMethods.put.call(this, data, cb, null, null, soul)
      },

      put: function(data, cb, as, rData, rSoul) {
        var gunCtx = this

        if (Gun.is(data)) {
          data.get(function(soul) {
            if (!soul)
              return cb && cb({ err: "Timegraph cannot link `undefined`!" })

            timeMethods.put.call(gunCtx, null, cb, as, data, soul)
          }, true)
          return this
        }

        gun.get(function(soul) {
          if (rSoul)
            soul = rSoul

          if (soul) {
            //var ify = Gun.node.ify
            function ify(obj, str) {
              return { _: { '#': str } }
            }

            var t = new Date(Gun.state()).toISOString().split(/[\-t\:\.z]/ig)
            var rid = 'timepoint/' + soul
            t = [rid].concat(t)

            // Working example of original modified slightly
            var milli = ify({}, t.join(':'))
            milli['soul'] = soul

            var tmp = t.pop()
            tmp = t.pop()

            var sec = ify({}, t.join(':'))
            sec[tmp] = milli
            tmp = t.pop()

            var min = ify({}, t.join(':'));
            min[tmp] = sec;
            tmp = t.pop();

            var hour = ify({}, t.join(':'));
            hour[tmp] = min;
            tmp = t.pop();

            var day = ify({}, t.join(':'));
            day[tmp] = hour;
            tmp = t.pop();

            var month = ify({}, t.join(':'));
            month[tmp] = day;
            tmp = t.pop();

            var year = ify({}, t.join(':'));
            year[tmp] = month;
            tmp = t.pop();

            var time = ify({}, t.join(':') || 'id');
            time[tmp] = year;

            var timepoint = time
            gun.put({ last: Gun.state(), timepoint, soul }, 'timegraph/' + soul)
            //timeMethods.pending.push(soul)
          }

          if (rData)
            gun.put.call(gunCtx, rData, cb, as)
          else
            gun.put.call(gunCtx, data, cb, as)

        }, true)

        return this
      },

      onceOld: function(cb, opts) {
        // Filter out timegraph objects
        /*var proxyCall = gun.once.call(this, opts, function(data, key) {
          if (key === 'timegraph')
            return

          // TODO: Filter startTime/stopTime
          cb && cb(data, key)
        })*/

        return gun.once.apply(this, timeMethods)
        //return nodeProxyPoly(proxyCall, timeMethods)
      },

      on: function(cb) {
        var gunCtx = this

        gun.on(function(data) {
          var args = arguments
          const nodeRef = data._['#']
          root.get('timegraph/' + nodeRef).once(data => {
            if (withinDate(data.last, startDate, stopDate))
              cb && cb.apply(gunCtx, Array.prototype.slice.call(args).concat([data.last]))
          })
        })
      },
    }

    return nodeProxyPoly(gun, timeMethods)
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
    if (startDate && stopDate)
      if (checkDate <= startDate && checkDate >= stopDate)
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
