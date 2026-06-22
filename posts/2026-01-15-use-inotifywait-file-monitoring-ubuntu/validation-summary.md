# Validation Summary: How to Use inotifywait for File Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux inotify
- inotify-tools / inotifywait
- Bash scripting
- systemd service units
- sysctl configuration
- rsync, git, jq, GNU parallel, logger

## Sources Consulted
- inotifywait(1) Linux manual page: https://man7.org/linux/man-pages/man1/inotifywait.1.html
- inotify(7) Linux manual page: https://man7.org/linux/man-pages/man7/inotify.7.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- Local Ubuntu package metadata for `inotify-tools` via `apt-cache show inotify-tools`
- Local systemd manuals and `systemd-analyze verify`

## Issues Found
- The first `inotifywait /var/log/syslog` example watched all events and could exit on `OPEN` before a `MODIFY` event. Changed it to `inotifywait -e modify /var/log/syslog` so the shown output matches the command.
- The event table was labeled complete but omitted `move_self`, and the `move` row did not explain that `move` is a filter alias whose output uses `moved_to` / `moved_from`. Added `move_self` and clarified `move`.
- The CSV example used a comma-separated custom `--format`, which is not the documented CSV mode. Changed it to `--csv`.
- The `-qq` description incorrectly said it outputs events without headers. The manual says double quiet suppresses event output except fatal errors, so the text was corrected.
- Several scripts parsed `%w%f %e` with `read -r file event`, which breaks when paths contain spaces. Changed those examples to use a `|` delimiter with `IFS='|' read -r file event`.
- The advanced systemd snippet used `Type=notify`, `NotifyAccess=main`, and `WatchdogSec=60` without changing the Bash monitor to send readiness/watchdog notifications. Removed the notify type from the resource-limit example and left `WatchdogSec` commented with the required `systemd-notify` / `sd_notify` caveat.
- The basic systemd unit placed `StartLimitIntervalSec` and `StartLimitBurst` in `[Service]`, which current systemd rejects there. Moved them to `[Unit]`.

## Review Notes
- Standalone Bash script blocks with shebangs passed `bash -n`.
- Complete systemd snippets were checked with `systemd-analyze verify`; the remaining verification warning is expected because `/opt/file-monitor/monitor.sh` is an example path and does not exist in this workspace.
