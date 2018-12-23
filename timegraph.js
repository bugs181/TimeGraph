;(function() {
	var Gun = (typeof window !== "undefined") ? window.Gun : require('gun/gun')
  var ify = Gun.node.ify, u

	Gun.chain.timegraph = function(startDateOpt, stopDateOpt) {
    "use strict"
    var gun = this, root = gun.back(-1)

    var startDate, stopDate
    if (startDateOpt && (startDateOpt instanceof Date || typeof startDateOpt === 'number' || typeof startDateOpt === 'string'))
      startDate = new Date(startDateOpt).getTime()

    if (stopDateOpt && (stopDateOpt instanceof Date || typeof stopDateOpt === 'number' || typeof stopDateOpt === 'string'))
      stopDate = new Date(stopDateOpt).getTime()

    var timeMethods = {

      /* BEGIN UN-NEEDED METHODS */
      get: function() {
        var proxyCall = gun.get.apply(this, arguments)
        return nodeProxyPoly(proxyCall, timeMethods)
      },

      map: function() {
        // TODO: find all functions inside nodeProxyPoly and proxy them with timeMethods. We don't need map; filtering is taken care of in .on and .once
        var proxyCall = gun.map.apply(this, arguments)
        return nodeProxyPoly(proxyCall, timeMethods)
      },
      /* END UN-NEEDED METHODS */

      set: function(data, cb) {
        // TODO: We may not need this if we just allow all data to be .put, and don't create a TimeGraph if its outside of bounds.
        // Because data has the possibility of being synced from other peers with a delay.

        if (!data._)
          console.log(arguments)
        else
          console.log('Found Gun obj')

        console.log('Set called')

        // TODO: FIXME: isData needs modified, need to check whether it's a node or not..
        // thought we could handle this logic inside .put, but doesn't seem like it. Data is still propagated to gun._.graph
        // return false // This works by blocking

        // FIXME: Handle .set(node) also
        // need a way to find Gun.node.is(node).data
        // IMPORTANT: Because Set did not succeed, the new item is not returned for this..

        var isData = (data && data._ && data._.put && !data._.put.timegraphSoul)
        if (!isData)
          return nodeProxyPoly(gun.set.apply(this, arguments), timeMethods)

        if (!withinDate(Date.now(), startDate, stopDate)) {
          console.log('here 1 set')
          return this
        }

        return nodeProxyPoly(gun.set.apply(this, arguments), timeMethods)
      },

      put: function(data, cb) {
        var isData = (data && data._ && data._.put && !data._.put.timegraphSoul)
        if (!isData)
          return nodeProxyPoly(gun.put.apply(this, arguments), timeMethods)

        console.log('Put called')
        if (!withinDate(Date.now(), startDate, stopDate)) {
          console.log('here 1')
          return this
        }

        console.log('here 2')

        var timegraphSoul = data._.soul
        var proxyCall = gun.put.apply(this, arguments)

        var parent = proxyCall.back(1)
        var timegraph = nodeProxyPoly(parent.get('timegraph'), timeMethods)

        if (timegraphSoul) {
          addTimegraph(timegraph, timegraphSoul)
        } else {
          // If we don't already have a soul, get it.
          proxyCall.once(function(data, key) {
            var timegraphSoul = Gun.node.soul(data)
            addTimegraph(timegraph, timegraphSoul)
          })
        }

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
  Gun.chain.time = function(data, a, b){
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

  function addTimegraph(node, timegraphSoul) {
    if (timegraphSoul)
      node.set({ timegraphSoul, date: Date.now() })

    // TODO: unique nodeName for this set.
    // For the set
    // timegraph:timegraphUUID

    // For the items in set
    // timepoint:timegraphSoul
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

}());
