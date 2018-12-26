;(function() {
  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')

  if (!Gun)
    throw new Error('TimeGraph is meant to be used with Gun')

  Gun.chain.timegraph = function(startDateOpt, stopDateOpt) {
    'use strict'

    var gun = this, root = gun.back(-1)
    var opts = gun && gun._ && gun._.root && gun._.root.opt
    var enforceData = opts.enforceData

    /*var startDate, stopDate
    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      stopDate = new Date(stopDateOpt).getTime()
    */

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

      put: function() {
        var proxyCall = gun.put.apply(this, arguments)

        proxyCall.get(function(data) {
          var proxySoul = data.put._['#']

          // Prevent recursion from timegraph .put
          if (data.put.timegraph)
            return

          var parentSoul = data.via && data.via.soul || data.$._.dub
          var parent = gun.get(proxySoul).back(1)

          var timepoint = root.get('timegraph/' + parentSoul).put({ [proxySoul]: Date.now() })
          parent.get('timegraph').put(timepoint)
          root.get('timegraphs').put({ ['timegraph/' + parentSoul]: parent._.get })
        })

        return nodeProxyPoly(proxyCall, timeMethods)
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

    // for each newNode.get,put, nodeProxyPoly() that too.
    // then in each of the proxiedFunctions, we just return timeMethods

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
  var origTimegraph = (typeof window !== 'undefined') ? window.Gun.chain.time : null
  if (origTimegraph)
    return console.warn('Warning: Original .time() API detected! Please remove it from your project to use the new API.')

  Gun.chain.time = function(data, a, b) {
    if (b)
      console.warn('Warning: Detected that you are still using the old TimeGraph API, we recommend switching to the new API syntax for more features and better stability.')

    return Gun.chain.timegraph.apply(this, data, a)
  }

}())
