# Validation Summary: How to Use systemd Timers Instead of Cron on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd timer units
- systemd service units
- systemctl
- systemd-analyze
- journalctl / journald
- cron migration
- Bash scripting

## Sources Consulted
- systemd.timer(5) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd.time(7) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- systemd.service(5) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit(5) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.exec(5) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.resource-control(5) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- systemd-analyze(1) official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html
- journalctl(1) official man page: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local Ubuntu systemd 255 command output for `systemd-analyze --help`, `systemd-analyze calendar`, `systemctl --help`, and `journalctl --help`.

## Issues Found
- The post stated that systemd does not support "last day" calendar expressions. Updated the example to use the official `~` syntax: `OnCalendar=*-*~01 00:00:00`.
- The post used `systemd-analyze calendar --timezone=America/New_York`, but systemd 255 does not support a `--timezone` option. Updated the command to include the timezone in the calendar expression: `systemd-analyze calendar "daily America/New_York"`.
- The sample `systemd-analyze calendar` output had incorrect weekdays for January 20-24, 2026. Corrected the weekday labels and skipped the weekend for the weekday-only schedule.
- The post implied `Persistent=true` generally catches up all downtime-related timer triggers. Clarified that persistence applies to missed `OnCalendar` runs.
- The conditional execution example placed `ConditionACPower=true` on the timer while saying it controls timer triggers. Updated the text and example so the condition controls whether the timer-activated service runs.
- The cron migration table listed `weekly` as equivalent to a Sunday cron schedule. Removed that equivalence because systemd's `weekly` shorthand means Monday at midnight.
- The troubleshooting section implied persistent timers can run once for every missed interval. Corrected it to explain that persistence catches up missed calendar events with a single activation, and that multiple post-boot runs usually come from overlapping triggers.

## Review Notes
- The remaining timer, service, logging, and management commands are consistent with current systemd documentation and Ubuntu systemd 255 behavior.
- Several examples reference site-specific scripts or services such as `/usr/local/bin/my-task.sh`, `nginx`, `postgresql`, and `certbot`; these are valid illustrative examples but require those programs and paths to exist on the target host.
