# Validation Summary: How to Handle Log Rotation with logrotate

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- logrotate
- Linux system administration
- systemd timers
- cron
- Nginx log reopening
- Docker container logs
- Bash monitoring scripts

## Sources Consulted
- logrotate 3.21.0 local `logrotate(8)` manual and `logrotate --help`
- Official logrotate manual source: https://github.com/logrotate/logrotate/blob/main/logrotate.8.in
- man7 logrotate manual page: https://man7.org/linux/man-pages/man8/logrotate.8.html
- Nginx official control documentation: https://nginx.org/en/docs/control.html
- Docker official JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/

## Issues Found
- The workflow diagram showed `copytruncate` after renaming and compression before `postrotate`. Updated it so `copytruncate` copies and truncates the original instead of renaming/creating a replacement, and so `postrotate` runs before compression.
- The default configuration example mentioned both `wtmp` and `btmp` while only showing `wtmp`. Updated the comment to match the snippet.
- The custom app example said it sent `SIGUSR1`, but the command used `systemctl reload`. Updated the comment to describe service reload behavior.
- The Nginx example said it would reload Nginx after testing the config, but the command sends `USR1` to reopen log files. Updated the comment to match the command and Nginx documentation.
- The Docker example said external logrotate "must" use `copytruncate`. Clarified that this applies when rotating Docker log files externally; Docker also supports built-in log rotation through logging driver options.
- The high-volume example described `maxage` as unconditional deletion. Updated the comment to note that `maxage` is checked when the log is rotated.
- The monitoring script piped `echo` into a `mail` command that also used a here-document, so the echoed line would not be part of the message body. Removed the ineffective pipe and kept the here-document as the mail body.

## Review Notes
- Most directives and command-line flags in the article are valid for current logrotate releases.
- The default `/etc/logrotate.conf`, timer unit location, and status file path can vary by Linux distribution, but the post already frames several of these as examples or notes alternate paths.
