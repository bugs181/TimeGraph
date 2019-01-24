/* eslint-disable no-console */
/* eslint-disable no-undef */

const gun = Gun()
let chatroom = gun.get('chatroom').timegraph()

chatroom.time((data, key, time) => { //listen setup
  gun.get(data['#']).once((d, id) => {
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).attr('title', 'soul: ' + data['#'] + '\n' + key).appendTo('ul')
    if (li) {
      $(li).empty().append(d.message + ' - ' + time)
    } else
      $(li).hide()
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
  }
})

// Resources:
// https://github.com/summerstyle/jsonTreeViewer
// http://summerstyle.github.io/jsonTreeViewer/
// https://github.com/caldwell/renderjson
