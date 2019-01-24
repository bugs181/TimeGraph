/* eslint-disable no-console */
/* eslint-disable no-undef */

const gun = Gun()
let chatroom = gun.get('chatroom').timegraph()

/* Filter functions used to show only timepoints in the Graph section. */
function filter(obj, predicate) {
  return Object.keys(obj)
    .filter(key => predicate(key))
    .reduce(function(res, key) {
      return (res[key] = obj[key], res)
    }, {})
}

function timepointFilter(key) {
  if (key.startsWith('timepoint/'))
    return true

  return false
}
/* End filter functions */


chatroom.time((data, key, time) => { //listen setup
  gun.get(data['#']).once((d, id) => {
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).attr('title', 'soul: ' + data['#'] + '\n' + key).appendTo('ul')
    if (li) {
      $(li).empty().append(d.message + ' - ' + moment(time).format('lll'))
    } else
      $(li).hide()

    // Update visual graph tree
    var graphView = document.getElementById('json').childNodes[0]
    graphView.replaceWith(renderjson(filter(gun._.graph, timepointFilter)))
  })
})

$('#enterchat').on('keyup', function(e) {
  e = e || window.event
  if (e.keyCode == 13) {
    let text = $('#enterchat').val()
    if (!text)
      return alert('You must enter some text.')

    chatroom.time({ alias: 'alias', message: text }) //push here to time update listen set from top.
    $('#enterchat').val('')

    // Update visual graph tree
    var graphView = document.getElementById('json').childNodes[0]
    graphView.replaceWith(renderjson(filter(gun._.graph, timepointFilter)))
  }
})
