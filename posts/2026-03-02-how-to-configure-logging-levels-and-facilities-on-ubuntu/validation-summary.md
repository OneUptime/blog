# Validation Summary: How to Configure Logging Levels and Facilities on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu logging
- syslog facilities and severities
- rsyslog selector syntax and actions
- systemd journal and journald configuration
- util-linux logger
- Python syslog module
- Apache HTTP Server logging
- Nginx logging
- MySQL logging

## Sources Consulted
- RFC 5424: The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- IANA Syslog Parameters registry: https://www.iana.org/assignments/syslog-parameters/syslog-parameters.xhtml
- rsyslog filter/selector documentation: https://www.rsyslog.com/doc/configuration/filters.html
- rsyslog actions documentation: https://docs.rsyslog.com/doc/configuration/actions.html
- rsyslog omprog documentation: https://www.rsyslog.com/doc/modules/omprog.html
- rsyslog ompipe documentation: https://docs.rsyslog.com/doc/configuration/modules/ompipe.html
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/journalctl.html
- util-linux logger man page: https://manpages.debian.org/unstable/util-linux/logger.1.en.html
- Python syslog module documentation: https://docs.python.org/3/library/syslog.html
- Apache HTTP Server LogLevel documentation: https://httpd.apache.org/docs/current/en/mod/core.html#loglevel
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- MySQL log_error_verbosity documentation: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MariaDB error log documentation: https://mariadb.com/kb/en/error-log/
- Local command help/man pages for `logger`, `journalctl`, `rsyslogd`, `rsyslog.conf`, and `journald.conf`

## Issues Found
- The syslog facilities table omitted facility codes 12 through 15 while describing the standard facility list. Added `ntp`, `audit`, `alert`, and `clock` entries based on RFC 5424/IANA.
- The `journalctl -p warning` example was labeled as showing only warnings, but a single priority includes that level and more important levels. Updated the comment and added `journalctl -p warning..warning` for exact warning filtering.
- The journald `MaxLevelSyslog` comment incorrectly described disk storage behavior. Updated it to describe syslog forwarding.
- The MySQL/MariaDB section used `log_error_verbosity`, which is supported by MySQL but not MariaDB. Narrowed the heading to MySQL.
- The rsyslog alert example used named-pipe syntax with a shell script path. Replaced it with the documented `omprog` action and added `module(load="omprog")`.
- The `/var/log/syslog` `awk` example claimed to count by facility, but default syslog text output does not include facility in that field. Removed that command and kept the journal JSON approach using `SYSLOG_FACILITY`.

## Review Notes
The remaining examples are broadly correct for current Ubuntu-style rsyslog/systemd usage. Some service-specific paths can vary by package, version, or local configuration, so administrators should still confirm paths on their target Ubuntu release.
