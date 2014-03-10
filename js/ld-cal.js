// clear previous values
function clearFields() {
    $('#title').val('');
    $('#id').val('');
    $('#allDay').prop('checked', false);
}

dirname = function(path) {
    return path.replace(/\\/g, '/').replace(/\/[^\/]*\/?$/, '');
}

// build the full path up to the calendar resource
// granularity: year/month/day/
function getCalPath(day, granularity, resource) {
    var path = window.location.protocol+'//'+
            window.location.host+
            dirname(window.location.pathname);

    path += (granularity)?$.fullCalendar.formatDate(day, granularity)+resource:'/'+resource;
    return path;
}

/// REMOVE
var test;
// Load calendar data from user storage
var calEvents = []; // store all events
function loadRemote(URI) {
    $('#spinner').show();
    var g = $rdf.graph();
    var f = $rdf.fetcher(g);
    // add CORS proxy
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;    
    // fetch user data
    f.nowOrWhenFetched(URI,undefined,function(){
        // get all event IDs
        t = g;

        var EVENTS  = $rdf.Namespace('http://purl.org/NET/c4dm/event.owl#');
        var TIME = $rdf.Namespace('http://purl.org/NET/c4dm/timeline.owl#');
        var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/');
        var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
        var UI = $rdf.Namespace('http://www.w3.org/ns/ui#');
        var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

        var evs = g.statementsMatching(undefined,
            RDF('type'),
            EVENTS('Event'),
            $rdf.sym(URI));

        if (evs != undefined) {
            for (var e in evs) {
                var id = evs[e]['subject']['value'];
                var start = g.anyStatementMatching(evs[e]['subject'], TIME('start'));
                var end = g.anyStatementMatching(evs[e]['subject'], TIME('end'))
                var title = g.anyStatementMatching(evs[e]['subject'], DC('title'));
                var color = g.anyStatementMatching(evs[e]['subject'], UI('color'));
                var maker = g.anyStatementMatching(evs[e]['subject'], FOAF('maker'));
                var allDay = g.anyStatementMatching(evs[e]['subject'], TIME('allDay'))

                var event = {
                    id: id.slice(id.indexOf('#'), id.length),
                    start: (start)?$.fullCalendar.parseISO8601(start['object']['value']):undefined,
                    end: (end)?$.fullCalendar.parseISO8601(end['object']['value']):undefined,
                    allDay: (allDay)?true:false,
                    title: (title)?title['object']['value']:undefined,
                    color: (color)?color['object']['value']:undefined,
                    maker: (maker)?maker['object']['value']:undefined
                };
                calEvents.push(event);
            }

            render(calEvents);
        }
        $('#spinner').hide();
    });
    test = f;

}

function putRemote(uri, data) {
    $.ajax({
        type: "PUT",
        url: uri,
        contentType: "text/turtle",
        data: data,
        processData: false,
        statusCode: {
            200: function() {
                console.log("200 Success");
            },
            401: function() {
                console.log("401 Unauthorized");
            },
            403: function() {
                console.log("403 Forbidden");
            },
            406: function() {
                console.log("406 Contet-type unacceptable");
            },
            507: function() {
                console.log("507 Insufficient storage");
            },
        },
        complete: function() {
            $('#spinner').hide();
        }
    });
}

// Save calendar data to user storage
function saveEvent (path) {
    $('#editevent').hide();
    // date picker
    var $pickerStart = $('#pickerStart').pickadate();
    var ps = $pickerStart.pickadate('picker').get('highlight');
    var $pickerEnd = $('#pickerEnd').pickadate();
    var pe = $pickerEnd.pickadate('picker').get('highlight');

    var id = $('#id').val();
    var title = $('#title').val();
    var color = $('#checkedImg').attr('alt');
    var allDay = $('#allDay').prop('checked');

    var start = $('#startHour').val();
    var hourS = parseInt(start.slice(0, start.indexOf(':'))) * 60;
    var minsS = parseInt(start.slice(start.indexOf(':')+1, start.length));
    var startHour = parseInt((hourS + minsS) * 60000);

    var end = $('#endHour').val();
    var hourE = parseInt(end.slice(0, end.indexOf(':'))) * 60;
    var minsE = parseInt(end.slice(end.indexOf(':')+1, end.length));
    var endHour = parseInt((hourE + minsE) * 60000);

    var startDay = new Date(parseInt(ps.pick) + parseInt(startHour));

    var endDay = parseInt(pe.pick);
    if (endDay) {
        endDay = new Date(endDay + endHour);
    }

    // prepare the ID
    var exists = false;
    if (id) {
        exists = true;
    } else {
        var blob = title+color+allDay+startHour+endHour+startDay+endDay;
        id = '#'+hex_sha1(blob);
    }

    var event = {
            id: id,
            start: (startDay)?startDay:undefined,
            end: (endDay)?endDay:undefined,
            allDay: allDay,
            title: (title)?title:undefined,
            color: (color)?color:undefined,
            maker: (mywebid)?mywebid:undefined
        };

    // save event locally
    if (exists) {
        for (var i in calEvents) {
            // update by removing the existing event
            if (calEvents[i].id == id)
                calEvents.splice(i, 1);
        }
    }
    // add event to array
    calEvents.push(event);
    // transform to RDF so we can save remotely
    var data = eventsToRDF();

    // finally write the data remotely
    putRemote(storageURI, data);

    // if updating, first we clear event from calendar in case it exists
    if (exists)
        $('#calendar').fullCalendar('removeEvents', [id]);

    $('#calendar').fullCalendar('renderEvent', event)
    $('#calendar').fullCalendar('unselect');
}

function eventsToRDF() {
    var RDF = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
    var EVENTS  = $rdf.Namespace('http://purl.org/NET/c4dm/event.owl#');
    var TIME = $rdf.Namespace('http://purl.org/NET/c4dm/timeline.owl#');
    var DC = $rdf.Namespace('http://purl.org/dc/elements/1.1/');
    var FOAF = $rdf.Namespace('http://xmlns.com/foaf/0.1/');
    var UI = $rdf.Namespace('http://www.w3.org/ns/ui#');
    // save the data in a graph
    g = $rdf.graph();

    for (var i in calEvents) {
        var event = calEvents[i];

        // set triples
        g.add($rdf.sym(event['id']),
                RDF('type'),
                EVENTS('Event'));
        g.add($rdf.sym(event['id']),
                TIME('start'),
                $rdf.lit(event['start'].toISOString(), '', $rdf.Symbol.prototype.XSDdateTime));
        if (event['end']) {
            g.add($rdf.sym(event['id']),
                    TIME('end'),
                    $rdf.lit(event['end'].toISOString(), '', $rdf.Symbol.prototype.XSDdateTime));
        }
        if (event['allDay']) {
            g.add($rdf.sym(event['id']),
                TIME('allDay'),
                $rdf.lit(event['allDay']));
        }
        g.add($rdf.sym(event['id']),
                DC('title'),
                $rdf.lit(event['title']));
        g.add($rdf.sym(event['id']),
                UI('color'),
                $rdf.lit(event['color']));
        g.add($rdf.sym(event['id']),
                FOAF('maker'),
                $rdf.sym(event['maker']));
    }
    return new $rdf.Serializer(g).toN3(g);
}

function updateEvent(event) {
    // transform to RDF so we can save remotely
    var data = eventsToRDF();

    // finally write the data remotely
    putRemote(storageURI, data);
}

function deleteEvent() {
    var id = $('#id').val();

    // hide UI
    $('#editevent').hide()

    // remove event from display
    $('#calendar').fullCalendar('removeEvents', [id]);
    // remove event from events
    for (var event in calEvents) {
        if (calEvents[event].id == id)
            calEvents.splice(event, 1);
    }

    // transform to RDF so we can save remotely
    var data = eventsToRDF();

    // finally write the data remotely
    putRemote(storageURI, data);

    return;
}

// ----- RENDER -------
function render(events) {
    $('#spinner').show();
	var calendar = $('#calendar').fullCalendar({
		header: {
			left: 'prev,next today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		},
		firstDay: 1,
		height: 600,
		selectable: true,
		selectHelper: true,
        eventClick: function(calEvent, jsEvent, view) { // for existing events
            clearFields();
            $('#id').val(calEvent.id);

            var startDay = $.fullCalendar.formatDate(calEvent.start, 'ddd, MMMM dd yyyy');
            var endDay = (!calEvent.end)?$.fullCalendar.formatDate(calEvent.start, 'ddd, MMMM dd yyyy'):$.fullCalendar.formatDate(calEvent.end, 'ddd, MMMM dd yyyy');

            // date picker
            var $pickerStart = $('#pickerStart').pickadate();
            var ps = $pickerStart.pickadate('picker').set('select', $.fullCalendar.parseDate(startDay));
            var $pickerEnd = $('#pickerEnd').pickadate();
            var pe = $pickerEnd.pickadate('picker').set('select', $.fullCalendar.parseDate(endDay));

            $('#title').val(calEvent.title);
            setColor(calEvent.color);
            // time
            var startHour = $.fullCalendar.formatDate(calEvent.start, 'HH:mm');
            // set 1h interval by default if no end hour is set
            if (calEvent.allDay == false && !calEvent.end) {
                var endHour = parseInt(startHour.slice(0, startHour.indexOf(':')))+1;
                var endHour = endHour+':00';
            } else if (calEvent.end) {
                var endHour = $.fullCalendar.formatDate(calEvent.end, 'HH:mm');
            } else {
                var endHour = '00:00';
            }

            $('#timepicker').html('');
            $('#timepicker').append('<span class="span-left cell inline-block">Event time</span>'+
                            '<div class="left cell inline-block">'+timeSelector('startHour', startHour)+'</div>');
            $('#timepicker').append('<div class="left cell inline-block">'+timeSelector('endHour', endHour)+'</div>');

            if (calEvent.allDay == true) {
                $('#allDay').prop('checked', true);
                $('#startHour').prop('disabled', true);
                $('#endHour').prop('disabled', true);
            }

            // show editor
            showEditor(jsEvent);
            $('#title').focus();
		},
		select: function(start, end, allDay, jsEvent) { // for new events
		    clearFields();
            setColor();
            startDay = $.fullCalendar.formatDate(start, 'ddd, MMMM dd yyyy');
            endDay = $.fullCalendar.formatDate(end, 'ddd, MMMM dd yyyy');

            // setting the values for date picker
            var $pickerStart = $('#pickerStart').pickadate();
            var ps = $pickerStart.pickadate('picker').set('select', $.fullCalendar.parseDate(start));
            var $pickerEnd = $('#pickerEnd').pickadate();
            var pe = $pickerEnd.pickadate('picker').set('select', $.fullCalendar.parseDate(end));

            // hour:minutes
            var startHour = $.fullCalendar.formatDate(start, 'HH:mm');
            var endHour = $.fullCalendar.formatDate(end, 'HH:mm');

            // set default start/end hours
            if (startHour == '00:00') {
                startHour = '10:00';
                endHour = '11:00';
            }

            // time selector
            $('#timepicker').html('');
            $('#timepicker').append('<span class="span-left cell inline-block">Event time</span>'+
                            '<div class="left cell inline-block">'+timeSelector('startHour', startHour)+'</div>');
            $('#timepicker').append('<div class="left cell inline-block">'+timeSelector('endHour', endHour)+'</div>');

            if (allDay == true) {
                $('#allDay').prop('checked', true);
                $('#startHour').prop('disabled', true);
                $('#endHour').prop('disabled', true);
            }

            showEditor(jsEvent);
            $('#title').focus();
		},
		eventDrop: function(event,dayDelta,minuteDelta,allDay,revertFunc) {
		    // update after dragging an event
            if (!confirm("Are you sure about this change?")) {
                revertFunc();
            } else {
                updateEvent(event);
            }
        },
        eventResize: function(event,dayDelta,minuteDelta,revertFunc) {
            // update after resizing an event (in week/day view)
            if (!confirm("Are you sure about this change?")) {
                revertFunc();
            } else {
                updateEvent(event);
            }

        },
		editable: true,
        events: events
	});
	$('#spinner').hide();
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
        $('#registration').hide();
        $('#help').hide();
    }
});

// displays HH:mm
function timeSelector (id, defValue) {
    if (!defValue || defValue == '')
        defValue = '10:00';
    var html = '<select id="'+id+'" class="'+id+'" name="'+id+'"';
    html += (id == 'startHour')?' onchange="updateHour()">':'>';
    for(i = 0; i <= 23; i++) {
        if (i<10)
            i='0'+i;
        for (j=0; j<2; j++) {
            var m = (j == 0)?'00':'30';
            var txt = i+':'+m;
            var selected = (txt == defValue)?' selected="selected"' : '';
            html += '<option value="'+txt+'" '+selected+'>'+txt+'</option>';
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

// update end hour selector based on start hour value
function updateHour(){
    var startHour = $('#startHour').val();
    var hour = parseInt(startHour.slice(0, startHour.indexOf(':')))+1;
    hour = (hour.toString().length < 2)?'0'+hour:hour.toString();
    var mins = startHour.slice(startHour.indexOf(':'), startHour.length);
    hour = hour+mins;
	$('#endHour').val(hour);
}

function escapeHtml(html) {
    return html.replace(/</g, '&lt;').replace(/\>/g, '&gt;');
}

function registerTriples() {
    var webapp = $rdf.Namespace("http://ns.rww.io/wapp#");
    var rdfs = $rdf.Namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#');

    var endpoint = $('#endpoint').val().trim();
    var frag = '#ld-cal';

    // prepare graph
    g = $rdf.graph();

    // add these triples to the profile document
    g.add($rdf.sym(frag),
            rdfs('type'),
            webapp('app'));
    g.add($rdf.sym(frag),
            webapp('name'),
            $rdf.lit('LD-Cal'));
    g.add($rdf.sym(frag),
            webapp('serviceId'),
            $rdf.sym(appName));
    g.add($rdf.sym(frag),
            webapp('endpoint'),
            $rdf.sym(endpoint));
    g.add($rdf.sym(frag),
            webapp('description'),
            $rdf.lit('Simple Linked Data calendar with agenda.'));

    var data = new $rdf.Serializer(g).toN3(g);
    console.log(data);
    var html = '<textarea>'+escapeHtml(data)+'</textarea>';

    $('#triples').html(html);
}

// dirty hack to get the User header for login
function authenticate(uri) {
    new $.ajax({
        type: 'HEAD',
        url: uri,
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        },
        complete: function(request, textStatus) {
            // check if the user is authenticated
            user = request.getResponseHeader('User');
            if ((user) && (user.slice(0, 4) == 'http')) {
                mywebid = user;
                userInfo(user);
                once_authenticated(user);
            } else {
                // not authenticated
                mywebid = user;
                var html = $('<div class="user left"><a href="#" class="white" onclick="authenticate(\''+AUTH_PROVIDER+'\')">WebID login</a></div>'+
                            '<div class="user-pic right">'+
                                '<img src="img/nouser.png" title="unknown user" class="login-photo img-border" />'+
                            '</div>');
                $('#me').empty()
                $('#me').html(html);
                $('#registration').show();
            }
            // render the calendar
            if (textStatus == 'error')
                render();
        }
    });
}

// get endpoint location from the user's WebID
function once_authenticated(webid) {
    var webapp = $rdf.Namespace("http://ns.rww.io/wapp#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var g = $rdf.graph();
    var f = $rdf.fetcher(g);
    // add CORS proxy
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    var docURI = webid.slice(0, webid.indexOf('#'));
    var webidRes = g.sym(webid);

    // fetch user data
    f.nowOrWhenFetched(docURI,undefined,function(){
        var apps = g.statementsMatching(undefined, 
                    $rdf.sym('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'), 
                    webapp('app'), 
                    $rdf.sym(docURI));
        if (apps.length>0) {
            for (var i in apps) {
                var app = apps[i]['subject'];
                var service = g.any(app, webapp('serviceId'));
                var endpoint = g.any(app, webapp('endpoint'));
                // check if the user registered the app
                if ((service) && (service.value == appName)) {
                    storageURI = endpoint.value;
                    loadRemote(storageURI);
                    $('#registration').hide()
                    $('#calendar').empty();
                    return true;
                }
            }
        } else {
            render();
            $('#registration').show();
        }
        return false;
    });
}

// ----- USER INFO -------
function userInfo (webid) {
    var RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
    var FOAF = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
    var g = $rdf.graph();
    var f = $rdf.fetcher(g);
    // add CORS proxy
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    var docURI = webid.slice(0, webid.indexOf('#'));
    var webidRes = $rdf.sym(webid);

    // fetch user data
    f.nowOrWhenFetched(docURI,undefined,function(){
        // export the user graph
        mygraph = g;
        // get some basic info
        var name = g.any(webidRes, FOAF('name'));
        var pic = g.any(webidRes, FOAF('img'));
        var depic = g.any(webidRes, FOAF('depiction'));

        if (name == undefined)
            name = 'Unknown';
        else
            name = name.value;

        if (name.length > 22)
            name = name.slice(0, 18)+'...';

        if (pic == undefined) {
            if (depic)
                pic = depic.value;
            else
                pic = 'img/nouser.png';
        } else {
            pic = pic.value;
        }

        // main divs      
        var html = $('<div class="user left">Welcome, <strong><a href="'+webid+'" target="_blank">'+name+'</a></strong></div><div class="user-pic right"><img src="'+pic+'" title="'+name+'" class="login-photo img-border" /></div>');
        $('#me').empty()
        $('#me').html(html);
    });
}
