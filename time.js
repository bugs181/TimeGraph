;(function() {
  var Gun = (typeof window !== 'undefined') ? window.Gun : require('gun/gun')
  var ify = Gun.node.ify

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

      put: function(data, cb, as) {
        if (data && data['#'])
          return gun.put.apply(this, arguments) // Ref to another node, skip for timegraph, we will catch it later.

        var nodeData = (data && data._) || (data && as && as.data && as.data._) || (data && as && as.item && as.item.data)
        var timegraphSoul = nodeData && nodeData.soul || (this._ && this._.get)

        var proxyCall = gun.put.apply(this, arguments)
        var parent = proxyCall.back(1)

        parent.once(function(data, key) {
          var proxySoul = data && data._ && data._['#']

          if (!proxySoul)
            return console.log('Unknown error')

          // TODO: Allow over-riding a date, for migration and custom data.
          // This could be done via an over-ride type chain/function .dateFormatter(function)

          var timepoint = root.get('timegraph/' + proxySoul).put({ [timegraphSoul]: Date.now() })
          parent.get('timegraph').put(timepoint)
          root.get('timegraphs').put({ ['timegraph/' + proxySoul]: key })
        })

        return nodeProxyPoly(proxyCall, timeMethods)
      },

      once: function(cb, opts) {
        // Filter out timegraph objects
        var proxyCall = gun.once.call(this, opts, function(data, key) {
          if (key === 'timegraph')
            return

          // TODO: Filter startTime/stopTime
          cb && cb(data, key)
        })

        return nodeProxyPoly(proxyCall, timeMethods)
      },

      on: function(cb) {

      },
    }

    return nodeProxyPoly(gun, timeMethods)
  }

  // Shim for backward compatibility
  var origTimegraph = (typeof window !== 'undefined') ? window.Gun.chain.time : null
  if (!origTimegraph)
    Gun.chain.time = function(data, a, b){
      console.warn('This shim is provided by the new TimeGraph API, we recommend switching to that as it offers more features and better stability.')
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

}())
