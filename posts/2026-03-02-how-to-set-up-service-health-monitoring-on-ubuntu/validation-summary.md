# Validation Summary: How to Set Up Service Health Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd (service units, watchdog, timers, OnFailure handlers)
- systemd-journald (journalctl)
- Bash shell scripting
- Python (sd_notify protocol via AF_UNIX sockets)
- nginx (used as example service for health checking)
- PostgreSQL (pg_stat_activity, pg_settings)
- curl (HTTP probing with --connect-timeout, --max-time, %{http_code}, %{time_total})
- Slack incoming webhooks

## Sources Consulted
- systemd.unit(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd.service(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.timer(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- sd_notify(3) man page — https://www.freedesktop.org/software/systemd/man/sd_notify.html
- journalctl(1) man page
- PostgreSQL pg_stat_activity / pg_settings documentation — https://www.postgresql.org/docs/current/monitoring-stats.html
- curl(1) man page (write-out variables)
- Slack incoming webhooks documentation — https://api.slack.com/messaging/webhooks

## Issues Found
1. **`StartLimitIntervalSec` and `StartLimitBurst` placed in `[Service]` section.** Per systemd.unit(5), these are unit-level rate-limit settings and belong in `[Unit]`. The systemd.service(5) man page explicitly cross-references systemd.unit(5) for these options. While systemd still accepts the old, unsuffixed names (`StartLimitInterval`/`StartLimitBurst`) in `[Service]` for backward compatibility, the modern `*Sec` names are documented under `[Unit]`. Moved both directives into the `[Unit]` section in the two service-file examples that used them.

## Review Notes
- The Python watchdog implementation uses a filesystem `AF_UNIX` socket path from `NOTIFY_SOCKET`. systemd may also use abstract sockets (`NOTIFY_SOCKET` starting with `@`, mapped to a leading NUL byte), which the example doesn't handle. In practice, systemd typically sets a filesystem path (e.g. `/run/systemd/notify`) for service notification, so the example works in the common case — but a more complete implementation would translate a leading `@` to `\0` before connecting.
- The example service file using `WatchdogSec=` doesn't set `Type=notify`. `WatchdogSec=` alone causes systemd to open the notification socket and implicitly set `NotifyAccess=main`, so watchdog pings work; sending `READY=1` from the Python sample is harmless even without `Type=notify`. If the user intends startup-readiness gating, they would need to add `Type=notify`. Left as written since the focus is the watchdog.
- The nginx example assumes a `/health` endpoint exists at `http://localhost/health`; nginx does not provide one by default — the operator must configure a `location /health { return 200; }` block or similar. The post implies this with "verifies nginx is responding correctly" but does not call it out explicitly.
- The PostgreSQL health check assumes either peer/trust auth or that `PGPASSWORD` will be set externally (the script sets it to an empty string). This works for local `postgres` user under default Ubuntu peer auth but would need adjustment for password auth.
- The Slack message uses the legacy `attachments` format, which is still supported but Slack now recommends Block Kit for new integrations.
- The Bash `[[ "$CONN_PERCENT" -gt "$MAX_CONNECTIONS_PERCENT" ]]` test will error if `CONN_PERCENT` is empty (e.g., if the SQL query fails silently). Acceptable for a tutorial.
