# Validation Summary: How to Configure systemd Watchdog for Service Health Checks on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd service units
- systemd watchdogs
- sd_notify notifications
- systemd-notify
- Bash
- Python
- python3-systemd
- Linux hardware watchdogs

## Sources Consulted
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd-system.conf official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html
- sd_notify official documentation: https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html
- systemd-notify official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-notify.html
- python-systemd daemon module documentation: https://www.freedesktop.org/software/systemd/python-systemd/daemon.html
- Local Ubuntu systemd 255 man pages for systemd.service, systemd-system.conf, systemd.unit, and systemd-notify
- Local Ubuntu python3-systemd package metadata and installed systemd.daemon module

## Issues Found
- The post stated that `Type=notify` is required for watchdog support. systemd requires sd_notify watchdog keepalives for `WatchdogSec=`, but `Type=notify` is specifically needed when the service reports readiness with `READY=1`. Updated the wording in the unit configuration notes and summary.
- The post claimed the effective watchdog timeout is `WatchdogSec * 2/3`. Official systemd documentation says the service fails if the time between `WATCHDOG=1` notifications is larger than the configured timeout. Updated the text to recommend sending keepalives more frequently than `WatchdogSec`.
- The Bash example left `PING_INTERVAL` unset when `WATCHDOG_USEC` was absent or zero, which would make `sleep "$PING_INTERVAL"` fail. Added a default value of `1`.
- The `python3-systemd` example imported `Notification`, but Ubuntu's `python3-systemd` binding exposes `systemd.daemon.notify(status, ...)` and does not provide that enum. Updated the example to call `notify("READY=1")` and `notify("WATCHDOG=1")`.
- The `python3-systemd` example could reference `ping_interval` before assignment when `WATCHDOG_USEC` was unset or zero. Added a safe default and only sends watchdog notifications when watchdog support is configured.
- The hardware watchdog section referred to `systemd-watchdog` as if it were the interface. Updated the wording to refer to systemd manager watchdog settings, which is how `RuntimeWatchdogSec=`, `RebootWatchdogSec=`, and `WatchdogDevice=` are configured.

## Review Notes
The examples use placeholder functions such as `process_tasks()` and `do_work()`, which is acceptable for a tutorial but would need real application health checks in production. The PostgreSQL unit snippet is a conceptual pattern and may need adjustment for Ubuntu's packaged PostgreSQL service layout.
