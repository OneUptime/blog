# Validation Summary: How to Tune Apache MaxClients and KeepAlive for IPv4 Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server 2.4
- Apache MPMs (`prefork`, `worker`, `event`)
- Apache core connection directives (`KeepAlive`, `KeepAliveTimeout`, `MaxKeepAliveRequests`)
- Linux process inspection with `ps`
- Linux socket inspection with `ss`

## Sources Consulted
- Apache HTTP Server 2.4 MPM overview: https://httpd.apache.org/docs/current/en/mpm.html
- Apache `prefork` MPM: https://httpd.apache.org/docs/current/en/mod/prefork.html
- Apache `worker` MPM: https://httpd.apache.org/docs/current/en/mod/worker.html
- Apache `event` MPM: https://httpd.apache.org/docs/current/en/mod/event.html
- Apache MPM common directives: https://httpd.apache.org/docs/current/en/mod/mpm_common.html
- Apache core directives (`KeepAlive`, `KeepAliveTimeout`, `MaxKeepAliveRequests`): https://httpd.apache.org/docs/current/en/mod/core.html
- Apache `mod_status`: https://httpd.apache.org/docs/current/mod/mod_status.html
- Apache `apachectl` program reference: https://httpd.apache.org/docs/current/en/programs/apachectl.html
- Debian `apache2ctl(8)` man page: https://manpages.debian.org/testing/apache2/apache2ctl.8.en.html
- `ps(1)` manual page: https://man7.org/linux/man-pages/man1/ps.1.html
- `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html

## Issues Found
- The `ps` example used a header-bearing output format and averaged the RSS column directly, which could skew the result. I changed it to `ps -C apache2 -o rss=` and added a guard so the `awk` expression only prints an average when matching processes exist.
- The `MaxConnectionsPerChild` comment described the directive as restarting workers after a number of requests. Apache documents it as a per-child-process connection limit, so I corrected the wording to child processes and connections in the prefork example and the takeaway.
- The monitoring section used `apachectl status | head -30` as if it were a direct machine-readable connection view. Apache documents `apachectl status/fullstatus` as depending on `mod_status` plus a text browser, while `server-status?auto` is the machine-readable interface, so I replaced the command with `curl -s http://127.0.0.1/server-status?auto | head -30`.
- The `ss -tn` example counted all TCP sockets on the host and included the header row, which did not match the surrounding Apache-specific guidance. I replaced it with an IPv4-only command that filters ports `80` and `443`, suppresses the header, and counts by TCP state.

## Review Notes
- The post is technically valid after the fixes above.
- The examples are Debian/Ubuntu-flavored (`/etc/apache2`, `apache2ctl`, `apache2` process name). Equivalent paths and service names differ on RHEL-family systems.
- Apache-specific command behavior was validated against upstream Apache documentation because Apache binaries were not installed in the workspace. The `ps`, `ss`, and `curl` command syntax was checked locally.
