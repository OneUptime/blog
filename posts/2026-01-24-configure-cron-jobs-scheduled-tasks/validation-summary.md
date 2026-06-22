# Validation Summary: How to Configure cron Jobs for Scheduled Tasks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Linux cron
- crontab syntax and management
- Shell redirection and Bash scripting
- PostgreSQL pg_dump
- systemd service and timer units

## Sources Consulted
- crontab(5) local man page and man7.org: https://man7.org/linux/man-pages/man5/crontab.5.html
- cron(8) local man page and man7.org: https://man7.org/linux/man-pages/man8/cron.8.html
- crontab(1) local man page
- GNU Bash Reference Manual, Pipelines: https://www.gnu.org/software/bash/manual/html_node/Pipelines.html
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL Backup and Restore documentation: https://www.postgresql.org/docs/current/backup.html
- systemd.timer(5) local man page and man7.org: https://man7.org/linux/man-pages/man5/systemd.timer.5.html
- systemd.service(5) local man page and freedesktop.org: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The "Log stdout to file, email stderr" cron example redirected both stdout and stderr to the log file with `2>&1`. Changed the command to only append stdout, leaving stderr available for cron mail handling.
- The backup script used `pg_dump -U "$DB_USER" "$DB_NAME" | gzip > ...` inside an `if` statement without `pipefail`. In Bash, a pipeline normally returns the status of the last command, so a `pg_dump` failure could be hidden if `gzip` succeeded. Added `set -o pipefail` so the backup fails when any command in the pipeline fails.

## Review Notes
- Cron spool paths and service names vary by distribution; the post uses common Debian/Ubuntu and RHEL/CentOS examples and notes log-location variation where relevant.
- `systemd-analyze calendar '*-*-* 02:00:00'` accepted the timer expression. Direct stdin verification of the service snippet was not completed because `systemd-analyze verify /dev/stdin` rejected the stdin filename in this environment.
