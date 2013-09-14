// clear previous values
function clearFields() {
    $('#eventdate').empty();
    $('#title').val('');
    $('#allDay').prop('checked', false);
}


// Load calendar data from user storage
function loadRemote () {
  this.status('Loading cal', true);
  that = this;
  var user = window.user;
  
  $.getJSON(this.getCalendarURI(window.user) , function(data){

    document.app.eventList = [];
    for(var prop in data) {
      if(data.hasOwnProperty(prop)) {
        if (!data[prop]['http://purl.org/dc/elements/1.1/title']) continue;
        if (!data[prop]['http://purl.org/NET/c4dm/timeline.owl#start']) continue;
        if (!data[prop]['http://purl.org/NET/c4dm/timeline.owl#end']) continue;
        
        var title = data[prop]['http://purl.org/dc/elements/1.1/title'][0]['value'];
        var start = data[prop]['http://purl.org/NET/c4dm/timeline.owl#start'][0]['value'];
        var end = data[prop]['http://purl.org/NET/c4dm/timeline.owl#end'][0]['value'];
        start = $.fullCalendar.parseISO8601(start);
        end = $.fullCalendar.parseISO8601(end);
        
        if (data[prop]['http://www.w3.org/ns/ui#color']) {
          var color = data[prop]['http://www.w3.org/ns/ui#color'][0]['value'];
        } else {
          color = '#3366CC';
        }
        if ( (end.getTime() - start.getTime()) % 86400000 == 0 ) {
          var allDay = true;
        } else {
          var allDay = false;
        }
        var event = {"start" : start, "end": end, "title": title, "color" : color, "id" : prop, "allDay" : allDay };
        document.app.eventList.push( event );
      }
    }

    that.render();
    that.status('Loading cal', false);
  }).error(function(data){
    that.status('Loading cal', false);
  });
}
    
// Save calendar data to user storage
function saveEvent () {  
    // DEBUG
    console.log(mywebid);
    console.log('allDay='+$('#allDay').prop('checked'));
    console.log('startDay='+$('#startDayVal').val());
    console.log('endDay='+$('#endDayVal').val());
    console.log('startHour='+$('#startHour').val());
    console.log('endHour='+$('#endHour').val());
    console.log('title='+$('#title').val());
    console.log('color='+$('#checkedImg').attr('alt'));

    var title = $('#title').val();    
    var color = $('#checkedImg').attr('alt');
    var allDay = $('#allDay').prop('checked');

    var startHour = (parseInt($('#startHour').val().slice(0,2)) * 60) + parseInt($('#startHour').val().slice(-2));
    var endHour   = (parseInt($('#endHour').val().slice(0,2)) * 60) + parseInt($('#endHour').val().slice(-2));
    var startDay = parseInt($('#startDayVal').val());
    startDay = new Date(startDay + startHour).toISOString();
    var endDay = parseInt($('#endDayVal').val());
    if (endDay) {
        endDay = new Date(endDay + endHour).toISOString();
        console.log(endDay);
    }
    console.log(startDay);
    // save the data in a graph
//    var id = this.getCalendarURI(mywebid) + '#';
    g = $rdf.graph();
    var frag = '#event';
    // add this triple to the user's profile
    g.add($rdf.sym(frag),
            $rdf.sym('http://purl.org/NET/c4dm/timeline.owl#start'),
            $rdf.lit(startDay));
    // add these triples to the profile document
    if (endDay) {
        g.add($rdf.sym(frag),
                $rdf.sym('http://purl.org/NET/c4dm/timeline.owl#end'),
                $rdf.lit(endDay));
    }
    if (allDay) {
        g.add($rdf.sym(frag),
            $rdf.sym('http://purl.org/NET/c4dm/timeline.owl#allDay'),
            $rdf.lit(allDay));
    }
    g.add($rdf.sym(frag),
            $rdf.sym('http://purl.org/dc/elements/1.1/title'),
            $rdf.lit(title));
    g.add($rdf.sym(frag),
            $rdf.sym('http://www.w3.org/ns/ui#color'),
            $rdf.lit(color));
    g.add($rdf.sym(frag),
            $rdf.sym('http://xmlns.com/foaf/0.1/maker'),
            $rdf.sym(mywebid));
    var data = new $rdf.Serializer(g).toN3(g);
    console.log(data);
        

    /*    
    // TODO work out why this is sometimes null

    var event = { "http://purl.org/NET/c4dm/timeline.owl#start" : [ { "value" : start, "type" : "literal" } ],
                  "http://purl.org/NET/c4dm/timeline.owl#end" : [ { "value" : end, "type" : "literal" } ],  
                  "http://purl.org/dc/elements/1.1/title" : [ { "value" : title, "type" : "literal" }]  , 
                  "http://www.w3.org/ns/ui#color" : [ { "value" : color, "type" : "literal" }],
                  "http://xmlns.com/foaf/0.1/maker" : [ { "value" : window.user, "type" : "uri" }],  
                  "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" : [ { "value" : "http://purl.org/NET/c4dm/event.owl#Event", "type" : "uri" }]   
                };
    var id = this.getCalendarURI(user) + '#' + hex_sha1(JSON.stringify(jsonld.normalize(event)));
    body[""+id] = event;

     
  this.postFile(this.getCalendarURI(user), JSON.stringify(body));      
  this.status('Saving calendar...', false);
  */
  $('#editevent').hide();
}

// ----- RENDER -------
function render(authd) {
    if (authd)
        var events = dummy_events;
    else
        var events = [];
        
	var calendar = $('#calendar').fullCalendar({
		header: {
			left: 'prev,next today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		},
		selectable: true,
		selectHelper: true,
        eventClick: function(calEvent, jsEvent, view) {
            clearFields();

            var startDay = $.fullCalendar.formatDate(calEvent.start, 'ddd, MMMM dd yyyy');
            var endDay = $.fullCalendar.formatDate(calEvent.end, 'ddd, MMMM dd yyyy');
            if (calEvent.end && startDay != endDay)
                var period = '<div id="startDay" class="right">'+startDay+' to</div>'+
                            '<input type="hidden" id="startDayVal" value="'+calEvent.start.getTime()+'" />'+
                            '<div id="endDay">'+endDay+'</div>'+
                            '<input type="hidden" id="endDayVal" value="'+calEvent.end.getTime()+'" />';
            else
                var period = '<div id="startDay" class="right">'+startDay+'</div>'+
                            '<input type="hidden" id="startDayVal" value="'+calEvent.start.getTime()+'" />';
            $('#eventdate').html(period);
            $('#title').val(calEvent.title);
            setColor(calEvent.color);
            // time
            var startHour = $.fullCalendar.formatDate(calEvent.start, 'HH:mm');
            // set 1h interval by default if no end hour is set
            if (calEvent.allDay == false) {
                var endHour = parseInt(startHour.slice(0, startHour.indexOf(':')))+1;
                var endHour = endHour+':00';
            } else if (calEvent.end) {
                var endHour = $.fullCalendar.formatDate(calEvent.end, 'HH:mm');
            } else {
                var endHour = '00:00';
            }
            
            $('#timepicker').html('');
            $('#timepicker').append('<span class="span-left cell inline-block">Event starts</span>'+
                            '<div class="left cell inline-block">'+timeSelector('startHour', startHour)+'</div>');
            $('#timepicker').append('<div class="left cell inline-block">'+timeSelector('endHour', endHour)+'</div>');

            if (calEvent.allDay == true) {
                $('#allDay').prop('checked', true);
                $('#startHour').prop('disabled', true);
                $('#endHour').prop('disabled', true);
            }

            // show editor
            showEditor(jsEvent);
		},
		select: function(start, end, allDay, jsEvent) {
		    clearFields();
            setColor();
            startDay = $.fullCalendar.formatDate(start, 'ddd, MMMM dd yyyy');
            endDay = $.fullCalendar.formatDate(end, 'ddd, MMMM dd yyyy');
            if (startDay != endDay)
                var period = '<div id="startDay" class="right">'+startDay+'</div> to '+
                            '<input type="hidden" id="startDayVal" value="'+start.getTime()+'" />'+
                            '<div id="endDay">'+endDay+'</div>'+
                            '<input type="hidden" id="endDayVal" value="'+end.getTime()+'" />';
//                            '<input type="hidden" id="endDayVal" value="'+$.fullCalendar.formatDate(end, 'yyyy-MM-dd')+'" />';
            else
                var period = '<div id="startDay" class="right">'+start.getTime()+'</div>';
            $('#eventdate').html(period);

            // time
            var startHour = $.fullCalendar.formatDate(start, 'HH:mm');
            if (allDay == true || !end) {
                var endHour = parseInt(startHour.slice(0, startHour.indexOf(':')))+1;
                var endHour = endHour+':00';
            } else {
                var endHour = $.fullCalendar.formatDate(end, 'HH:mm');
            }
                        
            $('#timepicker').html('');
            $('#timepicker').append('<span class="span-left cell inline-block">Event duration</span>'+
                            '<div class="left cell inline-block">'+timeSelector('startHour', startHour)+'</div>');
            $('#timepicker').append('<div class="left cell inline-block">'+timeSelector('endHour', endHour)+'</div>');

            if (allDay == true) {
                $('#allDay').prop('checked', true);
                $('#startHour').prop('disabled', true);
                $('#endHour').prop('disabled', true);
            }

            showEditor(jsEvent);
		},
		editable: true,
        events: events
	});
}

// Display the editor dialog
function showEditor(e) {
    // don't overflow
    e = window.event || e;
    var bottomOfViewport = $(window).scrollTop() + $(window).height();
    var bottomOfBox = e.pageY + $('#editevent').height();
    if ( bottomOfViewport <= bottomOfBox )
        var topVal = bottomOfViewport - 50 - $('#editevent').height();    
    else
        var topVal = e.clientY-50;
    var leftVal = e.clientX-200;
    // set the coords
    $('#editevent').css({
        top: topVal+'px',
        left: leftVal+'px'
    });
    $('#editevent').show();
}

// close editor
$(document).bind('keydown', function(e) {
    if (e.keyCode == 27) { // ESC
        $('#editevent').hide();
    }
});

function timeSelector (id, defValue) {
    if (!defValue || defValue == '')
        defValue = '10:00';
    var html = '<select id="'+id+'" class="'+id+'" name="'+id+'">';
    for(i = 0; i <= 23; i++) {
        if (i<10)
            i='0'+i;
        for (j=0; j<2; j++) {
            var m = (j == 0)?'00':'30';
            var txt = i+':'+m;
            var selected = txt == defValue ? ' selected="selected"' : '';
            html += '<option value="'+i+':'+m+'" '+selected+'>'+txt+'</option>';
        }
    }
    html += "</select>";

    return html;
}

// enable hour selector
function toggleHours () {
    if ($('#allDay').prop('checked') == false) {
        $('#startHour').prop('disabled', false);
        $('#endHour').prop('disabled', false);
    } else {
        $('#startHour').prop('disabled', true);
        $('#endHour').prop('disabled', true);
    }
}

function setColor (color) {
    var defClass;
    if (!color)
        color = '#5484ed'; // default
    switch (color) {
        case '#5484ed': defClass = 'Blue'; break;
        case '#e52127': defClass = 'Red'; break;
        case '#51b749': defClass = 'Green'; break;
        case '#fbd75b': defClass = 'Yellow'; break;
        case '#dbadff': defClass = 'Purple'; break;
        default: defClass = 'Blue';
    }
    $('#checkedImg').remove();
    var htmlChecked = '<img id="checkedImg" class="checkedImg" src="img/checked.png" title="'+defClass+'" alt="'+color+'" />';
    $('#'+defClass).html(htmlChecked);
}
