# Validation Summary: How to Configure Restart Policies in Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd services
- systemd unit rate limiting
- Container health checks

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman run health-check documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- systemd.service documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html

## Issues Found
- `StartLimitIntervalSec` and `StartLimitBurst` were shown in a `[Service]` section in one example and described as `[Service]` settings in the summary. These are systemd unit-level rate-limit settings, so the example and summary were updated to place and describe them under `[Unit]`.
- The phrase "Backoff Limits" implied backoff behavior, but the example configures systemd start rate limiting. The heading and summary wording were changed to "Rate Limits" and "rate limiting."
- The `on-failure`, `on-success`, and `always` policy descriptions were oversimplified. They were updated to match systemd's documented restart behavior for clean exits, non-zero exit codes, signals, timeouts, and watchdog failures.
- The production health-check example did not specify an action when the container becomes unhealthy. Added `HealthOnFailure=kill`, which Podman documents as integrating with systemd restart policy by killing the unhealthy container so systemd can restart the service.

## Review Notes
The `systemctl --user` and `journalctl --user` commands are valid for user-level Quadlet services. The generated service name shown in the examples is consistent with a `webapp.container` Quadlet file generating `webapp.service`.
