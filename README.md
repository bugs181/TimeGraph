# !!! Work in Progress !!!

# TimeGraph
TimeGraph library for the [Gun TimeGraph bounty](https://gun.eco/docs/Bounty#-5k-reward-for-timegraph)

# Notes:
* Adds special TimeGraph indexes to the root of data.
* This addition goes a little further than the original TimeGraph library by providing methods to work with time-data, streamed to normal gun operations.
* Shim provided for Backwards compatibility with existing API
* May cause problems for multiple chained `.time()` API (needs testing)
* Does not rely on the `state` property. Although currently is UTC + lexicon, is not a requirement and allows for other deterministic state libs.

# Features:
* TimeGraphs can be synced across peers. Can build a wire adapter to filter them out if you so desire.
* No special methods needed, works with all Gun methods (what users are used to)
* Leaves user data unmodified, building upon a single timegraph property in that node.
* TimePlots allow you to discover and traverse TimeGraphs very quickly with highly interconnected data.
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

<br>

# Events:
* `node.time().once` : Fires once for each piece of data in TimeGraph, filtering is done using timegraph methods
* `node.time().on` : Fires continuosly for each piece of data in TimeGraph, filtering is done using timegraph methods

<br>

# Graphing:
* `node.time().get` : Retrieve data as normal with TimeGraph filtering if provided. Does not affect children nodes.
* `node.time().put` : Put data into TimeGraph index using filter, if outside of bounds nothing is pushed into gun.
* `node.time().set` : Same as put

<br>

# Plotting:
Plotting is primarily useful for highly interconnected data. TimePlots are hoisted to the root level for all nested data and provide filtering methods. What seperates this from normal TimeGraphs is how the data is structured for very fast lookups in large sets of data.

## API:
* `node.time().plot()` : Adds a plot point for next `.put()` or `.set()`
* `node.time(startDate, stopStop).plot().once()` : Discover all points that fall between the dates
* `node.time().plot().filter(function).once()` : Discover plots with a filter function for data you're not interested in. (Good use of Schema here)

# TimeGraph Structure:
    'dataNode': {
       timegraph: { '#': 'timegraph/dataNodeSoul' }
    }

    'timegraph/dataNodeSoul': {
      'propSoul': Date,
      'propSoul': Date,
    }

    'timegraphs': {
      'timegraph/dataNodeSoul': 'dataNodeKey'
    }
    
# Example TimeGraph Structures:
## Code:
    const app = gun.get('app')
    const list = app.get('people').time()
    list.set({ name: 'Levi' })
    list.set({ name: 'Mark' })    

## Structure:
    {
      jq2dykdyNPvoebSHLnI7:{
        _: { '#': 'jq2dykdyNPvoebSHLnI7', '>': { name: 1545659838647 } },
        name: 'Levi'
      },

      jq2dyke5Kw3O9gWM94rF: {
        _: { '#': 'jq2dyke5Kw3O9gWM94rF', '>': { name: 1545659838653.001 } },
        name: 'Mark'
      },

      app: {
        _: { '#': 'app', '>': { people: 1545659847659 } },
        people: { '#': 'jq2dyrccFc77MBuLKb8c' }
      },

      jq2dyrccFc77MBuLKb8c: {
        _: { '#': 'jq2dyrccFc77MBuLKb8c', '>': { jq2dykdyNPvoebSHLnI7: 1545659847658, jq2dyke5Kw3O9gWM94rF: 1545659847659, timegraph: 1545659847862 } },
        jq2dykdyNPvoebSHLnI7: { '#': 'jq2dykdyNPvoebSHLnI7' },
        jq2dyke5Kw3O9gWM94rF: { '#': 'jq2dyke5Kw3O9gWM94rF' },
        timegraph: { '#': 'timegraph/jq2dyrccFc77MBuLKb8c' }
      },

      'timegraph/jq2dyrccFc77MBuLKb8c': {
        _: { '#': 'timegraph/jq2dyrccFc77MBuLKb8c', '>': { jq2dykdyNPvoebSHLnI7: 1545659847760, jq2dyke5Kw3O9gWM94rF: 1545659847861 } },
        jq2dykdyNPvoebSHLnI7: 1545659847760,
        jq2dyke5Kw3O9gWM94rF: 1545659847861
      },

      timegraphs: {
        _: { '#': 'timegraphs', '>': { 'timegraph/jq2dyrccFc77MBuLKb8c': 1545659847862.002 } },
        'timegraph/jq2dyrccFc77MBuLKb8c': 'people'
      }
    }

## Code:
    // Primitives work too, although not sure how meaningful the data would be?
    const app = gun.get('app').time()
    app.get('personId').put(Math.floor(Math.random() * 11))  

## Structure:
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

# TimePlot Structure:

    'timeplot': {
      '2018': { // year
        '12': { // month
          '22': { // Day
            '10': { // Hour
              53: { // Min
                dataNodeSoul,
                dataNodeSoul,
              },
              54: { // Min
                dataNodeSoul,
                dataNodeSoul,
              }
            }
          }
        }
      }
    }

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

## More examples coming soon
