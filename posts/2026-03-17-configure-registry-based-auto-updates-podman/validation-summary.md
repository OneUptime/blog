# Validation Summary: How to Configure Registry-Based Auto-Updates in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman auto-update
- Quadlet / podman-systemd units
- systemd user services and timers
- Container registry authentication

## Sources Consulted
- Podman official documentation: podman-auto-update, https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman official documentation: podman-systemd.unit / Quadlet, https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman official documentation: podman-login, https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html

## Issues Found
- The Quadlet example did not set `ContainerName=api`, but the later verification command used `podman inspect api`. Quadlet-generated containers are not guaranteed to have that plain name by default, so the example now explicitly names the container `api`.
- The post configured a Quadlet file but did not reload the user systemd manager or start the generated service before relying on auto-update. Added `systemctl --user daemon-reload` and `systemctl --user enable --now api.service`, matching Podman's documented Quadlet workflow.
- The tag strategy section said version tags and digests "will never update." Digests are fixed, but tags only fail to update when they are treated as immutable and not moved. Updated the wording to avoid the incorrect absolute claim.

## Review Notes
Podman was not installed in the local environment, so CLI checks were performed against the official Podman command documentation rather than local `--help` output.
