# Validation Summary: How to Troubleshoot Auto-Update Failures in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman auto-update
- Podman Quadlet
- systemd user services and timers
- journalctl
- container health checks

## Sources Consulted
- Podman auto-update official documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman Quadlet/systemd unit official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container inspect official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman image inspect official documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman healthcheck run official documentation: https://docs.podman.io/en/stable/markdown/podman-healthcheck-run.1.html
- Local systemctl help output for timer/status command syntax.
- Local journalctl help output for --since command syntax.

## Issues Found
- The health check log inspection command used `{{json .State.Health}}`, which is not the documented Podman container inspect field. Updated it to `{{json .State.Healthcheck}}`, matching Podman's documented container state structure.

## Review Notes
The article is technically accurate after the correction. Podman rollback detection depends on systemd unit restart failure; the official documentation notes that reliable failure detection is best achieved with sdnotify readiness signaling.
