LD-cal
======

LD-cal is a simple Linked Data calendar Web app. Here are some tips on how to use it.


When ``Month`` view is selected

* create long events by clicking and dragging over multiple days
* drag and drop events to change dates

When ``Week`` view is selected
* dropping the event to the top bar will turn it into a "Full day" event
* dropping the event back into a specific time interval will set its start hour

Installation
============

Simply copy the files to a public directory that is accessible by your Web server. You can basically host it anywhere, without worrying about server configuration.

Alternatively, if you do not have direct access to the Web server, you can use the ``deploy.sh`` script which will PUT the local files to the remote server.

To do so, you need to provide the URI of the remote directory where the app will be located, and optionally, a client certificate. For example, if you have write access to ``http://example.org/apps/``, then you can use ``http://example.org/apps/ld-cal/`` as a viable URI.
