# Validation Summary: How to Configure /etc/logrotate.conf on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- Linux log rotation
- logrotate configuration
- systemd timers
- cron
- Gunicorn log handling
- Shell commands

## Sources Consulted
- Ubuntu logrotate(8) manpage: https://manpages.ubuntu.com/manpages/jammy/man8/logrotate.8.html
- Local `man logrotate` for logrotate 3.21.0
- Local `logrotate --help` and `logrotate --version`
- Local `logrotate.service` and `logrotate.timer` unit files
- Gunicorn signal handling documentation: https://gunicorn.org/signals/
- Gunicorn deployment logging documentation: https://docs.gunicorn.org/en/19.9.0/deploy.html#logging

## Issues Found
- The post said logrotate is typically called only by `/etc/cron.daily/logrotate`. Updated this to include the `logrotate.timer` systemd timer, which is used on systemd-based Ubuntu installations.
- The `size`, `minsize`, and `maxsize` descriptions were partially inaccurate. Updated them to reflect logrotate's documented behavior: `size` is mutually exclusive with time intervals and the last specified option wins, `minsize` requires both size and time criteria, and `maxsize` can rotate before the time interval is due.
- The high-volume app example used `size 100M` followed by `daily`, which would make the later `daily` directive take precedence. Changed the example to `daily` plus `maxsize 100M` to match the stated goal.
- The Gunicorn example recommended `copytruncate` because Gunicorn supposedly cannot reopen logs. Gunicorn supports `USR1` for reopening log files, so the example now uses a `postrotate` signal based on the documented Gunicorn approach.
- The post said `firstaction` and `lastaction` require `sharedscripts`. Removed that requirement because the logrotate manpage does not require `sharedscripts` for those directives.

## Review Notes
The process-substitution parser check was not valid because logrotate ignores non-regular config files under `/dev/fd`. The remaining examples were checked against the documented directive syntax and command options. The sample user, group, service, and PID names remain illustrative and must be adjusted for a real deployment.
