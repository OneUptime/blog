# Validation Summary: How to Schedule Recurring Tasks with cron and systemd Timers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- cron / cronie
- crontab files
- systemd service units
- systemd timer units
- systemd-run
- journalctl and systemctl

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Automating System Tasks": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 9 "Managing systemd" documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- systemd.timer(5), systemd 249 upstream documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.timer.html
- systemd.time(7), systemd 249 upstream documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.time.html
- crontab(5), Linux manual page / cronie documentation: https://www.man7.org/linux/man-pages/man5/crontab.5.html
- Local system man pages for crontab(1), crontab(5), systemd.timer(5), systemd.time(7), systemd.service(5), and systemd-run(1)

## Issues Found
- The first `backup.service` example omitted `Type=oneshot` while describing a timer-triggered script with `TimeoutStartSec=3600`. With the default service type, systemd treats the service as started immediately after launching the process, so `TimeoutStartSec` does not clearly express a timeout for the whole job. Added `Type=oneshot` so the timer job is modeled as a finite task and the timeout applies to the command completing.
- The comparison table said cron has no built-in random delay. RHEL uses cronie, whose crontab format supports the `RANDOM_DELAY` environment variable. Updated the table to mention cron's `RANDOM_DELAY` and clarified that systemd provides `RandomizedDelaySec` per timer.
- The "When to Use systemd Timers" guidance implied random delay itself was unique to systemd. Updated it to recommend systemd when per-timer random delays are desired.

## Review Notes
- The cron examples, `/etc/cron.d/` user-field format, `MAILTO` behavior, `cron.allow` / `cron.deny` access control, systemd `OnCalendar` expressions, `Persistent=true`, `RandomizedDelaySec`, `systemd-analyze calendar`, `systemctl list-timers`, `journalctl`, and `systemd-run --on-active` / `--on-calendar` examples were checked and are technically sound.
- The post uses RHEL as the target platform. Cron availability can depend on the `cronie` package being installed and the `crond` service being enabled, but the scheduling examples themselves are valid for RHEL systems with cron installed.
