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
          return timeMethods.on.call(this, function(data, key, _, _2, time) {
            cb && cb(data, key, time)
          })
        }

        // Create new data/soul for every .put to match original API

        // Closest working, but loses context
        var soul = (gun.back('opt.uuid') || Gun.text.random)(9)
        //return timeMethods.put.call(this, ify(data, soul), soul, null, soul)

        //this._.dub = soul
        //return timeMethods.put.call(this, ify(data, gun._.dub), null, null, soul)

        //this._.dub = soul
        //var as = this
        //as._.dub = soul
        //return timeMethods.put.call(this, ify(data, soul), cb, as)

        //timeMethods.put.call(this, data, cb, this, null, soul)
        timeMethods.put.call(this, ify(data, soul), cb, this, null, soul)
        return this
      },

      put: function(data, cb, as, rSoul) {
        var gunCtx = this

        if (Gun.is(data)) {
          data.get(function(soul) {
            if (!soul)
              return cb && cb({ err: "Timegraph cannot link `undefined`!" })

            timeMethods.put.call(gunCtx, Gun.val.link.ify(soul), cb, as, soul)
          }, true)
          return this
        }

        gun.get(function(soul) {
          // This fixes .set(), because passing soul to gun.put() creates weird behavior.
          if (!soul) {
            if (!gun._.dub) {
              gun._.dub = (gun.back('opt.uuid') || Gun.text.random)(9)
              soul = gun._.dub
            }
          }

          if (!rSoul)
            rSoul = soul

          gun.put.call(gunCtx, data, cb, as)


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

          var timepoint = milli //time
          gun.put.call(gunCtx, { last: Gun.state(), timepoint, soul }, 'timegraph/' + soul)
        }, true)
      },

      once: function(cb) {
        var gunCtx = this

        gun.once.call(gunCtx, function(data) {
          if (!data)
            cb && cb.apply(gunCtx, undefined)

          var args = arguments
          const nodeRef = data._['#']
          root.get('timegraph/' + nodeRef).once(data => {
            if (withinDate(data.last, startDate, stopDate))
              cb && cb.apply(gunCtx, Array.prototype.slice.call(args).concat([data.last]))
          })
        })
      },

      on: function(cb) {
        var gunCtx = this

        gun.on.call(gunCtx, function(data) {
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

  function firstNode(data) {
    // This function takes a timepoint and recurses into it to find a ref to the first node.
    var isLastNode = false
    var lowestKey = null

    for (var key of Object.keys(data)) {
      if (key === '_')
        continue

      if (key === 'soul') {
        isLastNode = true
        continue
      }

      if (key < lowestKey)
        lowestKey = key

      // TODO: do until first(count), then break out of for.
      // Each key should at least contain one.. replace top level root items as we go along.

      // TODO: Stack overflow, Performant highly nested first/last $num items
      /*
      {
        2018: { // year
          12: { // month
            28: { // Day
              13: { someData }, // 24: hour
              14: { someData }, // 24: hour
              15: { someData }, // 24: hour
            },
            29: { // Day
              15: { someData }, // 24: hour
            },
            30: { // Day
              15: { someData }, // 24: hour
            },
          },
        },

        2019: { // year
          1: { // month
            1: { // Day
              16: { someData }, // 24-hour
            },
          },
        },
      }
      */
    }

    if (isLastNode)
      return lowestKeyRef

    // todo: may use a range array for this.

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
