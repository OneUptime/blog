# Validation Summary: How to Configure fail2ban Jails for SSH, Apache, and Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- fail2ban
- SSH / OpenSSH server logs
- Apache HTTP Server logs and fail2ban filters
- Nginx logs and fail2ban filters
- systemd service management
- SQLite

## Sources Consulted
- fail2ban upstream `jail.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- fail2ban upstream `fail2ban.conf`: https://github.com/fail2ban/fail2ban/blob/master/config/fail2ban.conf
- fail2ban upstream database implementation: https://github.com/fail2ban/fail2ban/blob/master/fail2ban/server/database.py
- Ubuntu `fail2ban-client(1)` manpage: https://manpages.ubuntu.com/manpages/resolute/man1/fail2ban-client.1.html
- `fail2ban-regex(1)` manpage: https://manpages.debian.org/testing/fail2ban/fail2ban-regex.1.en.html
- fail2ban upstream `nginx-botsearch` filter: https://github.com/fail2ban/fail2ban/blob/master/config/filter.d/nginx-botsearch.conf

## Issues Found
- The global default `backend = systemd` was incompatible with the many examples that explicitly use `logpath`; fail2ban documents that `logpath` is not valid with the systemd backend. Changed the default backend example to `backend = auto`.
- The `apache-noscript` jail used `/var/log/apache2/access.log`, but the upstream jail definition uses Apache's error log for this filter. Changed it to `/var/log/apache2/error.log`.
- The `nginx-botsearch` jail used `/var/log/nginx/access.log`, but the upstream jail definition uses Nginx's error log. Changed it to `/var/log/nginx/error.log`.
- The status command comment said it listed all banned IPs, but the command only queried the `sshd` jail. Updated the comment to say it lists banned IPs for the `sshd` jail.
- The SQLite query selected a non-existent `banned` column from the `bans` table. Updated it to select `timeofban`, which is part of the current fail2ban schema.
- The recidive section called a one-week ban "permanent." Updated the heading to describe longer bans and added `banaction = %(banaction_allports)s`, matching upstream recidive guidance for banning across all ports.

## Review Notes
The examples are generally correct for current fail2ban 1.x behavior after the fixes. Systems using journald-only logs can still use `backend = systemd`, but those jails should rely on the filter's `journalmatch` rather than a file `logpath`.
