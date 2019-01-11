var fs = require('fs')
var path = require('path')
var data = fs.readFileSync(path.resolve(__dirname + '/data.json'), 'utf-8')
data = JSON.parse(data)

function withinDate(checkDate, startDate, stopDate) {
  // If startDate and stopDate are provided, check within bounds
  //console.log(checkDate, startDate, stopDate)

  if (startDate && stopDate)
    if (checkDate >= startDate && checkDate <= stopDate)
      return true
    else
      return false

  // If startDate only provided
  if (startDate && startDate > checkDate) {
    return false
  }

  // if stopDate only provided
  if (stopDate && stopDate < checkDate) {
    return false
  }

  return true
}

function get(key, callback) {
  if (callback)
    return callback(data[key])
}

module.exports = {
  data: data,
  get: get,
  withinDate: withinDate,
}
