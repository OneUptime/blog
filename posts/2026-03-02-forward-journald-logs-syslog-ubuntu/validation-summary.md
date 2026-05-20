# Validation Summary: How to Forward journald Logs to syslog on Ubuntu

## Status
validated

## Post Type
Tutorial / System administration guide

## Technologies Covered
- Ubuntu
- systemd-journald
- journald.conf
- rsyslog
- rsyslog imuxsock, imjournal, and omfwd modules
- syslog-ng
- syslog forwarding over UDP, TCP, and TLS

## Sources Consulted
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd-journald.service manual: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html
- Local Ubuntu systemd configuration via `systemd-analyze cat-config systemd/journald.conf`
- rsyslog imuxsock module documentation: https://docs.rsyslog.com/doc/configuration/modules/imuxsock.html
- rsyslog imjournal module documentation: https://docs.rsyslog.com/doc/configuration/modules/imjournal.html
- rsyslog imjournal UsePid parameter documentation: https://docs.rsyslog.com/doc/reference/parameters/imjournal-usepid.html
- rsyslog omfwd module documentation: https://docs.rsyslog.com/doc/configuration/modules/omfwd.html
- rsyslog queue documentation: https://www.rsyslog.com/doc/concepts/queues.html
- rsyslog filter documentation: https://www.rsyslog.com/doc/configuration/filters.html
- syslog-ng systemd-journal source documentation: https://syslog-ng.github.io/admin-guide/060_Sources/190_systemd-journal/000_systemd-journal_options
- syslog-ng systemd-syslog socket documentation: https://syslog-ng.github.io/admin-guide/060_Sources/200_systemd-syslog/README.html
- Ubuntu package metadata for `rsyslog-gnutls` and `syslog-ng-mod-journal`
- Local command manuals and validation output for `logger`, `nc`, and `rsyslogd -N1`

## Issues Found
- The post incorrectly described rsyslog's default Ubuntu path as either `imjournal` or `imuxsock` reading from journald's socket. `imuxsock` consumes `/run/systemd/journal/syslog`; `imjournal` reads journal files through the journal API. Updated the relationship section and rsyslog configuration section to distinguish these paths.
- The rsyslog module snippet used `SysSock.Use="off"` while saying rsyslog should listen on the journald syslog socket. That setting disables the system socket listener. Replaced it with `module(load="imuxsock")` and moved `imjournal` into an alternate configuration path for structured journal metadata.
- The forwarding-status command checked only `/etc/systemd/journald.conf`, which misses package and local drop-ins. Replaced it with `systemd-analyze cat-config systemd/journald.conf | grep -i Forward`.
- The syslog-ng section said the shown `systemd-journal()` source reads from the journald socket. That source reads from the systemd journal; `systemd-syslog()` is the socket driver. Updated the wording to match the snippet.
- The test command used plain `grep` on `/var/log/syslog`, which can fail for non-privileged users on Ubuntu. Changed it to `sudo grep`.
- The troubleshooting command used `systemctl show systemd-journald | grep Forward`, which is not a reliable way to display journald forwarding settings. Replaced it with `systemd-analyze cat-config`.
- The remote connectivity check used TCP-only netcat syntax. Added a UDP variant for UDP syslog forwarding.

## Review Notes
The rsyslog examples were syntax-checked with `rsyslogd -N1` on the local Ubuntu environment. The TLS example uses anonymous authentication as shown in rsyslog documentation, but production deployments should normally use certificate validation and permitted peers.
