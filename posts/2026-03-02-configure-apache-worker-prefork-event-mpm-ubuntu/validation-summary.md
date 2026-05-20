# Validation Summary: How to Configure Apache Worker vs Prefork vs Event MPM on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- Apache HTTP Server 2.4
- Apache Prefork, Worker, and Event MPMs
- Apache mod_status
- Apache HTTP/2 / mod_http2
- PHP-FPM and mod_php
- systemd service management

## Sources Consulted
- Apache HTTP Server 2.4 MPM overview: https://httpd.apache.org/docs/2.4/mpm.html
- Apache MPM Prefork documentation: https://httpd.apache.org/docs/2.4/mod/prefork.html
- Apache MPM Worker documentation: https://httpd.apache.org/docs/2.4/mod/worker.html
- Apache MPM Event documentation: https://httpd.apache.org/docs/2.4/mod/event.html
- Apache common MPM directives: https://httpd.apache.org/docs/2.4/mod/mpm_common.html
- Apache HTTP/2 guide: https://httpd.apache.org/docs/current/howto/http2.html
- Apache mod_status documentation: https://httpd.apache.org/docs/2.4/mod/mod_status.html
- Apache apachectl documentation: https://httpd.apache.org/docs/2.4/programs/apachectl.html
- Ubuntu Server Apache2 installation documentation: https://ubuntu.com/server/docs/how-to/web-services/install-apache2/
- Ubuntu Server Apache2 modules documentation: https://ubuntu.com/server/docs/how-to/web-services/use-apache2-modules/
- Ubuntu Server PHP documentation: https://ubuntu.com/server/docs/how-to/web-services/install-php/
- Ubuntu package metadata for apache2, libapache2-mod-php8.3, and php8.3-fpm via apt-cache

## Issues Found
- Prefork was described as "Not compatible with HTTP/2." Apache's current HTTP/2 guide says HTTP/2 is supported in all bundled MPMs, but Prefork has severe restrictions. Updated the wording to say Prefork is severely limited with HTTP/2 and that Worker or Event should be used for production HTTP/2.
- Event MPM was described as "Required for HTTP/2." Apache recommends Event for HTTP/2-capable setups, but does not describe it as strictly required. Updated the wording to "Recommended for HTTP/2."
- The Prefork `ServerLimit` comment incorrectly described it as controlling how long Apache waits for a client request. Updated it to describe `ServerLimit` as the hard limit for `MaxRequestWorkers` in Prefork.
- The Event MPM example used `ServerLimit 4` with `ThreadsPerChild 25` and `MaxRequestWorkers 150`, which is inconsistent because `ServerLimit` must be at least `MaxRequestWorkers / ThreadsPerChild`. Updated `ServerLimit` to `6`.
- The Event MPM `ThreadsPerChild` comment said it included the listener thread. Apache's Event documentation says each child creates the configured server threads plus a listener thread. Updated the comment accordingly.
- The Event MPM `MaxRequestWorkers` comment described maximum concurrent connections. For Event MPM, this is better described as concurrent active request workers because keep-alive handling can be asynchronous. Updated the comment.
- The memory sizing command used `ps aux | grep apache2`, which includes the grep process and can skew results. Replaced it with `ps -o rss= -C apache2`.
- The traffic calculation command claimed to count requests per second but actually counted requested paths. Replaced it with an access-log timestamp aggregation by second.
- The closing sentence said to reload configuration after switching MPMs, but MPM switches require a restart. Updated it to say restart Apache.

## Review Notes
The remaining guidance is broadly accurate for Ubuntu 22.04/24.04 style Apache deployments using PHP 8.3 examples. The PHP version in commands should still be adjusted by readers to match their installed Ubuntu release and PHP packages.
