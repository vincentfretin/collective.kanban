// IE 9 supports only text and url
// Setting getData('text', value) will actually set types[0]='text/plain' in FF and Chrome!
var issueDNDType = 'text/x-issue'; // set this to something specific to your site

var issue_template = ['<div data-allowedstates="$allowedstates" id="issue-$issue" draggable="true" class="issue">',
  '<div class="issue-inner issue-type-$type" data-issue="$issue">',
  '<a href="$issue" class="issue-num">#$issue</a>',
  '<span class="issue-actions">',
    '<a href="$issue/edit" target="_blank"><img src="edit.gif"></a>',
  '</span>',
  '<p class="issue-title">$title</p>',
  '<span class="complexity">$complexity</span>',
  '<span class="owner">$owner</span>',
  '</div>',
'</div>'].join('\n');

var issue_overlay_params = {
    subtype: 'ajax',
    filter: '.documentFirstHeading,.modification-info,.issue-details,.steps-to-reproduce,.issue-attachment,.issue-referencedoc,.issue-tasks,.response-reply,.response-clarification,.response-additional'};

function allowDrop(ev) {
  // we can force the dropEffect here
  if (!(ev.dataTransfer.types === undefined)) {
    // don't force it for IE 9 so we get the default link dropEffect
    ev.dataTransfer.dropEffect = 'move';
  }
  // if we don't and have effectAllowed='all',
  // then on FF and Chrome we get move, a copy or Opera and link on IE
  // This is actually good for IE 9, so the selected text doesn't disappear...
  // excepted with IE 9, the user can change the dropEffect:
  // shift for move, ctrl for copy and ctrl+shift for link
  // This allows to do something different in the drop event according to the dropEffect
  // Table of the default dropEffect:
  //          FF    Chrome  Opera  IE
  // all      move  move    copy   link
  // linkMove move  move    link   link
  // copyLink link  copy    copy   link
  // copyMove move  move    copy   copy

  // IE 9 doesn't have types
  // In Chrome 20, types is an Array (support indexOf, don't support contains)
  // In Firefox 17 and Opera 12, types is a DOMStringList (don't support indexOf, support contains)
  // Chrome 20 and Opera 12 support the items api
  // Only Opera 12 supports dropzone
  // In Safari 6, types[0] is a dyn... mime type, our issueDNDType is on types[1]
  if (ev.dataTransfer.types === undefined
      || (ev.dataTransfer.types.indexOf && ev.dataTransfer.types.indexOf(issueDNDType) != -1) 
      || (ev.dataTransfer.types.contains && ev.dataTransfer.types.contains(issueDNDType))) {
    ev.preventDefault();
    var column = $(ev.target).closest('.column');
    column.addClass('dnd-over');
//    if (column.hasClass('dnd-allowed')) {
//      column.addClass('dnd-over');
//      ev.preventDefault();
//    }
  }
}

function drag(ev) {
  // we can drag the issue from the issue number link or the edit link
  // or for IE 9 from a text selection!
  var target = $(ev.target).closest('.issue');
  var items = [target.attr('id')];
  if (target.hasClass('issue-selected')) {
    // If the current dragged issue is selected, drag the selection,
    target.siblings('.issue-selected').each(function(){
      items.push(this.id);
    });
  } else {
    // else remove the selection.
    target.siblings('.issue-selected').removeClass('issue-selected');
  }
  var data = items.join('\n');
  // Chrome defines types=null, FF is an empty DOMStringList
  // types is undefined for IE 9
  if (ev.dataTransfer.types === undefined) {
    ev.dataTransfer.setData('text', data); // For IE 9
  } else {
    ev.dataTransfer.setData(issueDNDType, data);
  }
  ev.dataTransfer.effectAllowed = 'all';

  var selector = [];
  var column = target.closest('.column');
  var source_state = column.attr('data-state');
  var allowedstates = target.attr('data-allowedstates')+' '+source_state;
  $.each(allowedstates.split(' '), function(idx, v) {
    selector.push('.state-'+v);
  });
  selector = selector.join(',');
  $(selector).addClass('dnd-allowed');
  localStorage.setItem('dnd-allowed', selector);
  // move all issues to the dragged one to update the feedback image
  target.append(target.siblings('.issue-selected').find('.issue-inner'));
  target.css({"z-index": 999, transform: "scale(1.1)"});
  target.find('.issue-inner').css({"box-shadow": "10px 10px 5px #888888"});
}

function cancel_drag(issue) {
    // move back the inner div to its wrapper
    var issue_id = issue.attr('id');
    var issue_inner = $("div[data-issue="+issue_id.substring(6)+"]");
    issue.append(issue_inner);
    issue_inner.css({"box-shadow": "none"});
    issue.css({transform: "scale(1.0)"});
}

function dragEnd(ev) {
  // Chrome 20, FF 17 and Opera 12 have the correct dropEffect defined by the user.
  // IE 9 has none here.
  var issues = get_dropped_issues(ev);
  if (ev.dataTransfer.dropEffect == 'none') {
    $(ev.target).closest('.issue').css({transform: "scale(1.0)"});
  }
  $.each(issues, function(idx, issue_id) {
    var issue_inner = $("div[data-issue="+issue_id.substring(6)+"]");
    issue_inner.css({"box-shadow": "none"});
    // if we cancelled the drag, move inner back to its place
    if (ev.dataTransfer.dropEffect == 'none') {
      $('#'+issue_id).append(issue_inner);
    }
  });
  localStorage.setItem('drag-end', 'drag-end');
  $(".column").removeClass('dnd-allowed');
}

$(window).bind('storage', function (ev) {
  var event = ev.originalEvent;
  if (event.key && event.newValue) {
    // event.key is null when we clear the localStorage
    // event.newValue is null when we remove an item
    localStorage.removeItem(event.key);
  }
  if (event.newValue) {
    if (event.key == 'moved-issue') {
      var data = JSON.parse(event.newValue);
      var issue = $('#issue-'+data.issue);
      if (issue.length) {
        var selector = 'div[data-release="'+data.release+'"] div[data-area="'+data.area+'"] div[data-state="'+data.state+'"]';
        var column = $(selector);
        if (column.length) {
          move_and_update_issue(issue, data, column);
        } else {
          issue.remove();
        }
      } else {
        create_issue(data, column);
      }
      update_total();
    } else if (event.key == 'update-issue') {
      var data = JSON.parse(event.newValue);
      var issue = $('#issue-'+data.issue);
      if (issue.length) {
        issue.find('.owner').text(data.owner);
        issue.find('.complexity').text(data.complexity);
        issue.find('.issue-title').text(data.title);
        issue.find('.issue-inner').attr('class', 'issue-inner issue-type-'+data.type);
        update_total();
      }
    } else if (event.key == 'dnd-allowed') {
      var selector = event.newValue;
      $(selector).addClass('dnd-allowed');
    } else if (event.key == 'drag-end') {
      $(".column").removeClass('dnd-allowed');
    }
  }
});

function get_dropped_issues(ev) {
  if (ev.dataTransfer.types === undefined) {
    var data = ev.dataTransfer.getData("text");
  } else {
    var data = ev.dataTransfer.getData(issueDNDType);
  }
  var issues = data.split('\n');
  return issues;
}

function blink_column(column) {
  column.addClass('dnd-not-allowed');
  column.delay(200).fadeOut(200, function() {
    column.removeClass('dnd-not-allowed');
  }).fadeIn(200);
}

function move_and_update_issue(issue, data, column) {
  // move the wrapper
  column.append(issue);
  // and move back the inner to the wrapper
  issue.append($("div[data-issue="+issue.attr('id').substring(6)+"]"))
  issue.attr('data-allowedstates', data.allowedstates);
  issue.find('.owner').text(data.owner);
  issue.removeClass('issue-selected');
  issue.find('.issue-inner').css({animation: "animated_div 2s"}
          ).parent().css({transform: "scale(1.0)"});
}

function create_issue(data, column) {
  html = issue_template.replace(/\$([a-z]+)/gi, function(match) {
    match = match.replace('$', '');
    return (data[match])
  });
  column.append(html);
  $('#issue-'+data.issue+' .issue-num').prepOverlay(issue_overlay_params);
  $('#issue-'+data.issue).find('.issue-inner').css({animation: "animated_div 2s"});
}

function drop(ev) {
  // FF 17 and Opera 12 have the correct dropEffect defined by the user,
  // but Chrome 20 and IE 9 have none here.
  var column = $(ev.target).closest('.column')
  column.removeClass('dnd-over');
  ev.preventDefault(); // prevent default behavior for img that diplay alone.
  if (ev.stopPropagation) {
    ev.stopPropagation();
  }
  var url = $("base").attr("href") + "@@kanban-change-issue-state";
  var issues = get_dropped_issues(ev);
  // Move inner div right away,
  // we will put it back to its wrapper if the drop fails.
  $.each(issues, function(idx, issue_id) {
    var s = $("div[data-issue="+issue_id.substring(6)+"]");
    if (s.length) {
      column.append(s);
    }
  });
  $.each(issues, function(idx, issue_id) {
    // source can be null if we dropped an issue from a different window
    var new_release = $(ev.target).parents('.release').attr('data-release');
    var new_area = $(ev.target).parents('.area').attr('data-area');
    var new_state = column.attr('data-state');
    var source = $('#'+issue_id);
    if (source.length) {
      var source_state = source.closest('.column').attr('data-state');
      var allowedstates = source.attr('data-allowedstates')+' '+source_state;
      if (allowedstates.indexOf(new_state) < 0) {
        cancel_drag(source);
        blink_column(column);
        return;
      }
      var old_release = source.parents('.release').attr('data-release');
      var old_area = source.parents('.area').attr('data-area');
      var old_state = source.parents('.column').attr('data-state');
      if (old_area == new_area && old_state == new_state && old_release == new_release) {
        cancel_drag(source);
        return;
      }
    }
    formData = {
      issue: issue_id.substring(6),
      state: new_state,
      area: new_area,
      targetRelease: new_release
    }
    $.ajax({
        type: 'POST',
        url: url,
        data: formData,
        success: function(data){
          if (data.status == "ok") {
            if (source.length) {
              move_and_update_issue(source, data, column);
            } else {
              create_issue(data, column);
            }
            localStorage.setItem('moved-issue', JSON.stringify(data));
          } else {
            if (source.length) {
                // move back the inner div to its wrapper
                source.append($("div[data-issue="+source.attr('id').substring(6)+"]"));
            }
            var infobox = $('#kssPortalMessage');
            infobox.html(data.message);
            infobox.show();
            blink_column(column);
          }
        },
        error: function() {
            if (source.length) {
                // move back the inner div to its wrapper
                source.append($("div[data-issue="+source.attr('id').substring(6)+"]"));
            }
        },
        dataType: 'json'
    });
    setTimeout(update_total, 4000);
  });
}

function dragenter(ev) {
}

function dragleave(ev) {
  $(ev.target).closest('.column').removeClass('dnd-over');
}

function update_total() {
  $('.issue-inner').css({animation: "none"});
  // calculate state
  $('#kanban h3').each(function() {
    var res = 0;
    $(this).parent().find('.complexity').each(function() {
      var v = parseInt($(this).text());
      if (!isNaN(v)) {
        res += v;
      }
    });
    $(this).find('span').text(' ('+res+')');
  });
  // calculate area
  $('#kanban h2').each(function() {
    var res = 0;
    $(this).next('.area').find('.complexity').each(function() {
      var v = parseInt($(this).text());
      if (!isNaN(v)) {
        res += v;
      }
    });
    $(this).find('span').text(' ('+res+')');
  });
  // calculate release
  $('#kanban h1').each(function() {
    var res = 0;
    // next is the meter, so get the next of the next
    var release = $(this).next().next('.release');
    var total_issues = release.find('.issue').length;
    release.find('.complexity').each(function() {
      var v = parseInt($(this).text());
      if (!isNaN(v)) {
        res += v;
      }
    });
    $(this).find('span').text(' ('+total_issues+' tickets, complexité '+res+')');
    // progress bar
    if (res !== 0) {
        var bar = $(this).next('.meter');
        // work-done resolved tests-ok part
        var total_done = 0;
        release.find('.state-work-done .complexity,.state-resolved .complexity,.state-tests-ok .complexity,.state-closed .complexity').each(function() {
          var v = parseInt($(this).text());
          if (!isNaN(v)) {
            total_done += v;
          }
        });
        var percent = 100 * total_done / res;
        bar.find('.done').css({width: percent+'%'}).text(Math.round(percent)+' %');
        // in progress part
        var total_done = 0;
        release.find('.state-in-progress .complexity').each(function() {
          var v = parseInt($(this).text());
          if (!isNaN(v)) {
            total_done += v;
          }
        });
        var percent = 100 * total_done / res;
        bar.find('.in-progress').css({width: percent+'%'}).text(Math.round(percent)+' %');
    }
  });
}

$(document).ready(function(){
  update_total();
  var localStorage_events = ['moved-issue', 'dnd-allowed', 'drag-end'];
  $(localStorage_events).each(function(idx, k) {
    localStorage.removeItem(k);
  });

  $('.issue-num').prepOverlay(issue_overlay_params);

  $('#kanban h1').click(function() {
    $(this).next().next(".release").toggle();
  });
  
  $('#kanban h2').click(function() {
    $(this).next(".area").toggle();
  });

  $('#kanban h2').each(function() {
    if ($(this).next('.area').find('.issue').length === 0) {
      $(this).next(".area").hide();
    }
  });

  $('.column').delegate('.issue', 'click', function(e) {
    if (e.ctrlKey) {
      // deselect item from other columns
      $(this).parent().siblings().find('.issue-selected').removeClass('issue-selected');
      $(this).toggleClass('issue-selected');
    }
    if (e.shiftKey) {
      // deselect item from other columns
      $(this).parent().siblings().find('.issue-selected').removeClass('issue-selected');
      if ($(this).siblings('.issue-selected').length > 0) {
        if ($(this).nextAll('.issue-selected').length > 0) {
          var stop = false;
          $(this).nextAll('.issue').each(function(){
            if (stop) {
              return;
            }
            if ($(this).hasClass('issue-selected')) {
              stop = true;
            } else {
              $(this).addClass('issue-selected');
            }
          });
        } else {
          var stop = false;
          $(this).prevAll('.issue').each(function(){
            if (stop) {
              return;
            }
            if ($(this).hasClass('issue-selected')) {
              stop = true;
            } else {
              $(this).addClass('issue-selected');
            }
          });
        }
      }
      $(this).addClass('issue-selected');
    }
  });

});
