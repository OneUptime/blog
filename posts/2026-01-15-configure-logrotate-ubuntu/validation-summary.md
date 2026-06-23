# Validation Summary: How to Configure Logrotate for Log Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- logrotate
- Ubuntu / Debian system administration
- cron and systemd timers
- gzip / xz compression
- nginx and Docker log handling

## Sources Consulted
- logrotate(8) man page (https://man7.org/linux/man-pages/man8/logrotate.8.html)
- Ubuntu/Debian default `/etc/logrotate.conf` shipped by the `logrotate` package
- nginx documentation on log file reopening via `USR1` signal (https://nginx.org/en/docs/control.html)
- Docker `json-file` logging driver documentation (https://docs.docker.com/config/containers/logging/json-file/)

## Issues Found
- **Inaccurate "Default content" of `/etc/logrotate.conf`**: The post presented `dateext` and `compress` as active default directives. On Ubuntu/Debian, both are **commented out** in the shipped default config (Ubuntu does not compress rotated logs by default), and the file includes an `su root adm` directive. Presenting compression as enabled by default could mislead readers into thinking no further action is needed. Fixed the snippet to comment out `dateext` and `compress` and to include the `su root adm` line, matching the real Ubuntu default.

## Review Notes
- All other directives are valid and current: `compresscmd`, `compressoptions`, `dateformat`, `dateyesterday`, `extension`, `minsize`/`maxsize`, `size`, `copy`/`copytruncate`, `rotate 0`, `firstaction`/`lastaction`, `prerotate`/`postrotate`, `sharedscripts`, `mailfirst`/`maillast`.
- The nginx `kill -USR1 $(cat /run/nginx.pid)` postrotate signal is correct for reopening log files.
- The state file path `/var/lib/logrotate/status` and CLI flags (`-d` debug/dry-run, `-f` force, `-v` verbose) are accurate.
- Version caveat (not changed): On recent Ubuntu releases logrotate can also be driven by a systemd timer (`logrotate.timer`) in addition to `/etc/cron.daily/logrotate`. The post's cron-based description still applies on Ubuntu, which retains the `cron.daily` entry, so this was left as-is but is worth noting for future updates.
