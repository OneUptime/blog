# Validation Summary: How to View Cron Logs and Debug Cron Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (cron daemon)
- rsyslog
- systemd / journalctl
- logrotate
- Bash scripting (output redirection, exec)
- grep / zgrep / tail / diff utilities

## Sources Consulted
- man cron(8) and crontab(5) — Debian/Ubuntu cron package documentation
- rsyslog documentation: https://www.rsyslog.com/doc/configuration/
- systemd journalctl(1) man page: https://www.freedesktop.org/software/systemd/man/journalctl.html
- logrotate(8) man page
- Ubuntu cron unit name verification (`cron.service` on Ubuntu, so `journalctl -u cron` is valid)
- GNU date(1) man page (verified `%e` produces space-padded day-of-month matching syslog format)
- GNU grep(1) man page (verified `--line-buffered` flag)

## Issues Found
- **Line 42 (Reading Cron Logs from syslog section)**: The follow-real-time example was broken:
  ```
  sudo grep --line-buffered CRON /var/log/syslog | tail -f /var/log/syslog
  ```
  This pipes grep output into `tail -f`, but `tail -f` reads the file path argument directly and ignores stdin, so the grep filter never applied — the user would see *all* syslog entries, not just CRON entries. Corrected to the proper pattern:
  ```
  sudo tail -f /var/log/syslog | grep --line-buffered CRON
  ```
  Also updated the comment that introduces the next variant from "Or more cleanly" to "Or more simply" since both forms are now equally clean.

## Review Notes
- The systemd unit name `cron` (`journalctl -u cron`) is correct for Ubuntu/Debian. On RHEL/CentOS/Fedora it would be `crond` — readers on those distros would need to adjust.
- On Ubuntu 24.04+ with default journald-only configuration, `/var/log/syslog` may not exist unless rsyslog is installed. The post does call this out by listing both syslog and journalctl paths.
- The rsyslog config snippet uses legacy syntax (`cron.*` selector and `& stop`), which works in rsyslog v7+ (Ubuntu's version). The newer RainerScript syntax also works but the legacy form is more familiar.
- `tail -f` may stop following after logrotate rotates the file by rename; `tail -F` (capital F) would handle rotation. Not strictly an error in the post but worth noting.
- The `date +'%b %e'` pattern correctly matches the traditional syslog timestamp format with space-padded single-digit days.
- The "Add this to the beginning of your crontab" phrasing is slightly misleading since cron entry order does not matter, but it is not technically wrong.
