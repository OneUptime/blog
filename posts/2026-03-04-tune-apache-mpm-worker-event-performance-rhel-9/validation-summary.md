# Validation Summary: How to Tune Apache MPM Worker and Event for Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache HTTP Server 2.4
- Apache Multi-Processing Modules: event, worker, prefork
- Apache configuration directives
- mod_status, mod_deflate, mod_expires
- ApacheBench
- Linux process and memory inspection commands

## Sources Consulted
- Apache HTTP Server 2.4 MPM overview: https://httpd.apache.org/docs/current/en/mpm.html
- Apache HTTP Server 2.4 event MPM documentation: https://httpd.apache.org/docs/2.4/mod/event.html
- Apache HTTP Server 2.4 worker MPM documentation: https://httpd.apache.org/docs/2.4/mod/worker.html
- Apache HTTP Server 2.4 prefork MPM documentation: https://httpd.apache.org/docs/2.4/mod/prefork.html
- Apache HTTP Server 2.4 common MPM directives: https://httpd.apache.org/docs/2.4/mod/mpm_common.html
- Apache HTTP Server 2.4 httpd command documentation: https://httpd.apache.org/docs/2.4/programs/httpd.html
- Apache HTTP Server 2.4 apachectl documentation: https://httpd.apache.org/docs/2.4/programs/apachectl.html
- Apache HTTP Server 2.4 ab documentation: https://httpd.apache.org/docs/2.4/programs/ab.html
- Apache HTTP Server 2.4 mod_status documentation: https://httpd.apache.org/docs/current/mod/mod_status.html
- Apache HTTP Server 2.4 mod_deflate documentation: https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache HTTP Server 2.4 mod_expires documentation: https://httpd.apache.org/docs/current/mod/mod_expires.html
- Red Hat RHEL 9 web server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/
- Red Hat JBoss Core Services Apache HTTP Server Connectors and Load Balancing Guide, MPM appendix: https://docs.redhat.com/en/documentation/red_hat_jboss_core_services/2.4.57/html/apache_http_server_connectors_and_load_balancing_guide/

## Issues Found
- Corrected the event MPM comment that described `MaxRequestWorkers` as maximum simultaneous connections. Apache documents it as the limit on simultaneous requests served, and for threaded or hybrid MPMs as the total request worker threads available to serve clients. Event MPM can also hold asynchronous keepalive connections beyond active request worker threads.
- Replaced the oversimplified `MaxRequestWorkers = ServerLimit * ThreadsPerChild` formula with the correct constraint that `MaxRequestWorkers` should be an integer multiple of `ThreadsPerChild` and `ServerLimit` must be at least `MaxRequestWorkers / ThreadsPerChild`.
- Fixed the memory sizing command so it does not include the `grep` process or divide by a bogus extra line. The updated command uses `ps -C httpd -o rss=` and guards against zero matching processes.
- Updated the sizing example to state that `ServerLimit` must also be raised when choosing a higher `MaxRequestWorkers` value.
- Replaced `ps aux | grep httpd | wc -l`, which counts the `grep` process, with `pgrep -c httpd`.
- Corrected the summary wording from `MaxRequestWorkers` as total concurrent connections to total request worker threads.

## Review Notes
The Apache commands and configuration snippets are otherwise consistent with Apache HTTP Server 2.4 and RHEL-style paths. The local review environment did not have `httpd` installed, so command behavior was verified against official Apache and Red Hat documentation rather than local `httpd --help` output.
