console._log = console.log
console.log = function() {
  //console._log(arguments)
  if (arguments[0] === '%s: %sms') {
    return mocha.logPerf(arguments[2])
  }

  console.lastArgs = arguments
  console._log.apply(this, arguments)
}

const mocha = {
  log: function(...args) {
    let lastArgs = Array.from(console.lastArgs)
    if (!lastArgs || lastArgs.length < 2)
      return console.log.apply(null, args)

    if (lastArgs[0].indexOf('(%dms)') > 1)
      return

    let data = lastArgs[0] + ' ' + args.shift()
    let param = '\033[A' + lastArgs[1]
    lastArgs = lastArgs.slice(2)

    console._log.apply(null, [data, param, ...lastArgs, ...args])
    console._log('\033[K\033[A\r')
  },

  colors: {
    green: '\u001b[32m',
    red: '\u001b[31m',
    off: '\u001b[0m',
  },

  logPerf: function(num, includeSlow) {
    if (num <= this.slow)
      this.log(this.colors.off + this.colors.green + '(%dms)' + this.colors.off, num)
    else
      includeSlow && this.log(this.colors.off + this.colors.red + '(%dms)' + this.colors.off, num)
  },

  perf: function(description, perfFn) {
    it(description, function(done) {
      let rnd = Math.random()
      console.time(description + rnd)
      perfFn(function() {
        done()
        console.timeEnd(description + rnd)
      })
    })

    let perfDetails = {
      description,
      perf: function() { perfFn(function(){}) },
    }

    return {
      ...perfDetails,
      add: function() {
        mocha.tests.push(perfDetails)
      }
    }
  },

  slow: 500,
  tests: [],

  apply: function(ctx) {
    this.slow = ctx._slow
  }
}

module.exports = mocha
