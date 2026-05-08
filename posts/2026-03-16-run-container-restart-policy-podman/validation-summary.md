# Validation Summary: How to Run a Container with a Restart Policy in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman restart policies
- Podman CLI
- Podman Quadlet
- systemd user services
- PostgreSQL and nginx container examples

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman update` documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman generate` documentation: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman `podman events` documentation: https://docs.podman.io/en/v4.3/markdown/podman-events.1.html

## Issues Found
- The restart policy table omitted `never`, which current Podman documents as a synonym for `no`. Updated the table and summary to include `no` / `never`.
- The `unless-stopped` description was too Docker-like for current Podman wording. Updated it to describe the documented Podman behavior around explicit user stops and boot-time restarts via `podman-restart.service`.
- The Quadlet section said "recommended since Podman 4.7". Official docs confirm Quadlet is current and `podman generate systemd` is deprecated, but the specific version claim was not supported by the consulted docs. Removed the unsupported version-specific claim.
- The Quadlet example used `systemctl --user enable --now production-web.service`. Podman Quadlet documentation says generated services are handled by the generator and the `[Install]` section, so the example now starts the generated service with `systemctl --user start production-web.service`.

## Review Notes
Podman is not installed in this local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output. The remaining examples use documented flags and Go-template inspect/event patterns.
