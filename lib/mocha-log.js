console._log = console.log
console.log = function(data, useOldLine, ...args) {
  //console._log(arguments)
  if (arguments[0] === '%s: %sms') {
    return mocha.logPerf(arguments[2])
  }

  console.lastArgs = arguments
  console._log.apply(this, arguments)
}

const mocha = {
  log: function(...args) {
    let lastArgs = console.lastArgs
    if (!lastArgs)
      return console.log.apply(null, args)

    let data = lastArgs[0] + ' ' + args.shift()
    console.log.apply(null, [data, '\033[A' + lastArgs[1], ...args])
    console.log('\033[2K\033[A\r')
  },

  colors: {
    green: '\u001b[32m',
    red: '\u001b[31m',
    off: '\u001b[0m',
  },

  logPerf: function(num) {
    if (num < this.timeout)
      this.log(this.colors.off + this.colors.green + '(%dms)' + this.colors.off, num)
    else
      this.log(this.colors.off + this.colors.red + '(%dms)' + this.colors.off, num)
  },

  perf: function(description, perfFn) {
    it(description, function(done) {
      console.time(description)
      perfFn(function() {
        done()
        console.timeEnd(description)
      })
    })
  },

  timeout: 500,
}

module.exports = mocha
