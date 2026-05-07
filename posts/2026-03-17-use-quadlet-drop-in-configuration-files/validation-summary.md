# Validation Summary: How to Use Quadlet Drop-In Configuration Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- systemd unit drop-in files
- Container environment configuration

## Sources Consulted
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container unit documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman run `--userns` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- systemd.unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html

## Issues Found
- The environment-specific override examples used generated service drop-ins under `~/.config/systemd/user/webapp.service.d/` with `[Service] Environment=NODE_ENV=...`. That sets environment variables for the service process running Podman, not the application environment inside the container. Changed those examples to Quadlet source drop-ins under `~/.config/containers/systemd/webapp.container.d/` with `[Container] Environment=...`, which Quadlet translates to Podman `--env`.

## Review Notes
- The generated `.service.d` drop-ins shown for systemd-level settings are valid for overriding service behavior such as dependencies, `RestartSec=`, `ExecStartPre=`, `ExecStopPost=`, and process limits.
- For settings that should affect the container creation command, such as container environment variables, Quadlet `.container.d` drop-ins are the more accurate mechanism.
