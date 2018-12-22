# Work in Progress

# TimeGraph
TimeGraph library for the [Gun TimeGraph bounty](https://gun.eco/docs/Bounty#-5k-reward-for-timegraph)

# Info:
This module goes a little further than the original TimeGraph library by providing methods to work with time-data, streamed to normal gun operations.

# Features:
* TimeGraphs can be synced across peers. Can build a wire adapter to filter them out if you so desire.
* No special methods needed, works with all Gun methods (what users are used to)
* Leaves nested user data unmodified, building upon a single timegraph property in that node.
* TimePlots allow you to discover and traverse TimeGraphs very quickly with highly interconnected data.
* Subset of special API methods for filtering and working with TimeGraphs. Can be built upon further.
* Can be used in conjunction with other Date/Time libraries like [moment.js](http://momentjs.com)

<br>

# Pre-requisits:

    var node = gun.get('app')

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
    'parentNode': {
      'timegraph': [
        dataNodeSoul,
        dataNodeSoul
      ],

      dataNode: {
        props
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

    const app = gun.get('app').time()
    app.get('people').set({ name: 'Levi' })
    app.get('people').set({ name: 'Mark' })
    
## Retrieve data from TimeGraph

    const app = gun.get('app').time()
    app.get('people').map().once(console.log)

## Insert valid data (inside of time bounds filter)

    const app = gun.get('app').time(Date.now())
    app.get('people').set({ name: 'Levi' })
    app.get('people').set({ name: 'Mark' })

## Insert invalid data (outside of time bounds filter)

    var today = new Date()
    var yesterday = new Date(today.setDate(today.getDate() - 1))
    
    const app = gun.get('app').time(null, yesterday)
    app.get('people').set({ name: 'Levi' })
    app.get('people').set({ name: 'Mark' })

## More examples coming soon
