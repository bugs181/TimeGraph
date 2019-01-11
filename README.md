# !!! Work in Progress !!!

# TimeGraph
TimeGraph library for the [Gun TimeGraph bounty](https://gun.eco/docs/Bounty#-5k-reward-for-timegraph)

# Notes:
* Adds special TimeGraph indexes to the root of data.
* This addition goes a little further than the original TimeGraph library by providing methods to work with time-data, streamed to normal gun operations.
* Shim provided for Backwards compatibility with existing API
* May cause problems for multiple chained `.time()` API (needs testing)

# Features:
* TimeGraphs can be synced across peers. Can build a wire adapter to filter them out if you so desire.
* No special methods needed, works with all Gun methods (what users are used to)
* Leaves user data unmodified, building upon a single timegraph property for that node.
* Discover and traverse TimeGraphs very quickly with highly interconnected data due to decoupling.
* Subset of special API methods for filtering and working with TimeGraphs. Can be built upon further.
* Can be used in conjunction with other Date/Time libraries like [moment.js](http://momentjs.com)
* Custom Date formatters/serializers (WIP) `dateFormatter` & `dateCompare`

<br>

# Prerequisits:

    var node = gun.get('list')

<br>

# Initializer:

    node.time(Optional startDate, Optional stopDate) 
    
Initialize a TimeGraph in node chain for events such as `.get`, `.put`, `.on`, `.once`

## Parameters: ##
* `startDate` : Filters out data that came before `startDate`
* `stopDate` : Filters out data that came after `stopDate`

## Examples: ##
* `node.time(startDate, stopDate)`
* `node.time(startDate, null)`
* `node.time(null, stopDate)`
* `node.time(null, null)`

<br>

# API Subset:
* `node.time().first(number)` : Grab first `$num` items in TimeGraph
* `node.time().last(number)` : Grab last `$num` items in TimeGraph
* `node.time().filter(function(graphItem))` : Additional TimeGraph filtering if needed
* `node.time().range` : Create a range for TimeGraph traversal. Uses the same semantics as `.time()`

<br>

# Events:
* `node.time().once` : Fires once for each piece of data in TimeGraph, filtering is done using timegraph methods
* `node.time().on` : Fires continuosly for each piece of data in TimeGraph, filtering is done using timegraph methods
* `node.time().time(callback)` : Subscribes to timegraph, returns `(data, key, time)`, where `data` is a node-ref.
* `node.time().off` : Gun safety ;)

<br>

# Range Events:
* `range().once` : Same as `node.time().once`
* `range().on` : Same as `node.time().on`
* `range().time` : Same as `node.time().time(callback)`
* `range().off` : Gun safety ;)

<br>

# Graphing:
* `node.time().get` : Retrieve data as normal with TimeGraph filtering if provided. Does not affect children nodes.
* `node.time().put` : Put data into TimeGraph index using filter, if outside of bounds nothing is pushed into gun if `enforceData` is provided via opts.
* `node.time().set` : Same as put
* `node.time().time(data)` : Proxy/Shim for `.set` to provide a drop-in replacement for existing API.

<br>

# TimeGraph Structure:
    'dataNode': {
       _: { '#': 'dataNodeSoul },
       prop1: 'value',
       prop2: 'value',
    }

    'timegraph/dataNodeSoul': {
        first: { '#': 'timepoint/dataNodeSoul' },
        last: { '#': 'timepoint/dataNodeSoul' },
        soul: 'dataNodeSoul',
        timepoint: { '#': 'timepoint/dataNodeSoul' },
    }

    'timepoint/dataNodeSoul': {
        '2019': { '#': 'timepoint/dataNodeSoul:2019' },
    }

    'timepoint/dataNodeSoul:2019': {
        '01': { '#': 'timepoint/dataNodeSoul:2019:01' }
    }
    
    ...timepoint/etc
    
# Example TimeGraph Structures:
## Code:
    const app = gun.get('app')
    const list = app.get('people').time()
    list.set({ name: 'Levi' })
    list.set({ name: 'Mark' })    

## Structure:
    { 
      jqg3tkqfEal1JtLWkn8V: { 
        _: { '#': 'jqg3tkqfEal1JtLWkn8V', ... },
        name: 'Mark',
      },

      jqg3tkqrA9XCHBE1Vd7s: { 
        _: { '#': 'jqg3tkqrA9XCHBE1Vd7s', ... },
        name: 'Levi',
      },
        
      jqg3tkqn3HtZtCCrOucM: { 
        _: { '#': 'jqg3tkqn3HtZtCCrOucM', ... },
        jqg3tkqfEal1JtLWkn8V: { '#': 'jqg3tkqfEal1JtLWkn8V' },
        jqg3tkqrA9XCHBE1Vd7s: { '#': 'jqg3tkqrA9XCHBE1Vd7s' },
      },

      'timegraph/jqg3tkqn3HtZtCCrOucM': { 
        _: { '#': 'timegraph/jqg3tkqn3HtZtCCrOucM', ... },
        first: { '#': 'timepoint/milli' },
        last: { '#': 'timepoint/milli' },
        soul: 'jqg3tkqn3HtZtCCrOucM',
        timepoint: { '#': 'timepoint/jqg3tkqn3HtZtCCrOucM' },
      },

      ...timepoint/jqg3tkqn3HtZtCCrOucM:2019:...,
        
      'timepoint/jqg3tkqn3HtZtCCrOucM:2019:01:03:04:22:16:128': {
        _: { '#': 'timepoint/jqg3tkqn3HtZtCCrOucM:2019:01:03:04:22:16:128', ... },
        soul: 'jqg3tkqfEal1JtLWkn8V',
      },

      'timepoint/jqg3tkqn3HtZtCCrOucM:2019:01:03:04:22:16:132:': { 
        _: { '#': 'timepoint/jqg3tkqn3HtZtCCrOucM:2019:01:03:04:22:16:132:', ... },
        soul: 'jqg3tkqrA9XCHBE1Vd7s', 
      },
    }

## Code:
    // Primitives work too, although not sure how meaningful the data would be?
    const app = gun.get('app').time()
    app.get('personId').put(Math.floor(Math.random() * 11))  

## Structure: (Out of date; has not been updated to reflect status)
    { 
      app: { 
        _: { '#': 'app', '>': { personId: 1545661692548, timegraph: 1545661692659.001 } },
        personId: 6,
        timegraph: { '#': 'timegraph/app' } 
      },
      
      'timegraph/app': { 
        _: { '#': 'timegraph/app', '>': { personId: 1545661692658 } },
        personId: 1545661692658 
      },
      
      timegraphs: { 
        _: { '#': 'timegraphs', '>': { 'timegraph/app': 1545661692660 } },
        'timegraph/app': 'app' 
      } 
    }

<br>

# Examples:
## Insert data into TimeGraph

    const app = gun.get('app')
    const list = app.get('people').time()
    list.set({ name: 'Levi' })
    list.set({ name: 'Mark' })
    
## Retrieve data from TimeGraph

    const app = gun.get('app')
    app.get('people').time().map().once(console.log)

## Insert valid data (inside of time bounds filter)

    const app = gun.get('app')
    const list = app.get('people').time(Date.now())
    list.set({ name: 'Levi' })
    list.set({ name: 'Mark' })

## Insert invalid data (outside of time bounds filter)

    var today = new Date()
    var yesterday = new Date(today.setDate(today.getDate() - 1))
    
    const app = gun.get('app')
    const list = app.get('people').time(null, yesterday)
    list.set({ name: 'Levi' })
    list.set({ name: 'Mark' })

## Backward compatibility shim

    app.get('people').get('timegraph').map().on((graphItem) => {
      console.log(graphItem.soul) // Soul/key of item
      console.log(graphItem.date) // Serializable UTC timestamp

      // Retrieve new item
      app.get('people').get(graphItem.soul).once(console.log)
    })

<br>

# TimePoint Structure:

    'timepoint/soul': {
      '2018': { // year
        '12': { // month
          '22': { // Day
            '10': { // Hour
              53: { // Min
                05: { // Sec
                  572: { // ms
                    soul: dataNodeSoul
                  }
                }
              },
              54: { // Min
                05: { // Sec
                  572: { // ms
                    soul: dataNodeSoul
                  }
                }
              },
            }
          }
        }
      }
    }

## More examples coming soon
