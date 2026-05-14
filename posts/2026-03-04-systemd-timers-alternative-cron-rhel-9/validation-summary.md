# Validation Summary: How to Use systemd Timers as a Modern Alternative to Cron on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd timer units
- systemd service units
- systemctl
- systemd-analyze
- journalctl
- cron migration concepts

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing systemd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- RHEL 9 systemd.timer(5) manual, systemd 252: https://redhat-plumbers.github.io/systemd-rhel9/systemd.timer.html
- freedesktop.org systemd.timer(5), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.timer.html
- freedesktop.org systemd.time(7), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.time.html
- freedesktop.org systemd-analyze(1), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd-analyze.html
- freedesktop.org systemd.service(5), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.service.html
- freedesktop.org systemd.resource-control(5), systemd 252: https://www.freedesktop.org/software/systemd/man/252/systemd.resource-control.html
- Local system man pages for systemd.timer(5), systemd.time(7), systemd.service(5), systemd.resource-control(5), systemctl(1), journalctl(1), and systemd-analyze(1)

## Issues Found
- The `systemd-analyze calendar` example said the command shows the next five trigger times, but `--iterations=` defaults to 1. Changed the comment and explanatory text to say it shows the next trigger time, and noted that `--iterations=5` shows five trigger times.
- The `OnUnitActiveSec=` comment said it runs relative to when the timer was last activated. The directive is relative to when the unit activated by the timer was last activated, so the comment now says "service."
- The `RandomizedDelaySec=` explanation implied a stable per-system random offset. The systemd default is to choose a random delay before each iteration unless `FixedRandomDelay=true` is used. Updated the wording to say systemd chooses a new random delay for each firing by default.

## Review Notes
The remaining timer unit syntax, service unit syntax, calendar expressions, monotonic timer directives, persistent timer behavior, resource control directives, and management/debugging commands were checked against the referenced documentation and local command/man-page output. The examples assume the referenced users, groups, paths, and application log directories exist on the target host.
