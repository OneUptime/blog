# Validation Summary: How to Configure Auto-Update Rollback in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman auto-update
- Podman Quadlet `.container` units
- systemd service readiness notifications
- Podman health checks

## Sources Consulted
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman `podman-systemd.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-container-inspect(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html

## Issues Found
- The testing commands inspected a container named `webapp`, but a Quadlet file named `webapp.container` defaults the Podman container name to `systemd-webapp`. Added `ContainerName=webapp` to the `[Container]` section so the configured container name matches the `podman inspect webapp` commands.

## Review Notes
- The rollback behavior, `AutoUpdate=registry`, `Notify=healthy`, health check keys, `Type=notify`, `TimeoutStartSec`, and `podman auto-update` usage align with current Podman documentation.
- `Notify=healthy` requires a working Podman health check, and the sample `HealthCmd` assumes the image contains `curl`.
