# Validation Summary: How to Configure Local-Based Auto-Updates in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman auto-update
- Podman Quadlet `.container` units
- systemd user services and timers
- Containerfile-based image builds

## Sources Consulted
- Podman `podman-auto-update(1)` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman `podman-systemd.unit(5)` / Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-build(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html

## Issues Found
- The post described local auto-update as comparing image IDs for a tag. Official Podman documentation describes local auto-update as comparing the image used by the container with the image in local storage for the same raw image name, with newer documentation referring to the image digest. Updated the wording to avoid the inaccurate image-ID claim.
- The Quadlet example later used `podman inspect myapp`, but Quadlet defaults to a generated container name with a `systemd-` prefix. Added `ContainerName=myapp` so the verification commands match the configured container.
- The post enabled only `podman-auto-update.timer`, but Podman auto-update requires containers to run inside systemd units. Added `systemctl --user daemon-reload` and `systemctl --user enable --now myapp.service` before enabling the timer.

## Review Notes
- The local workspace does not have the `podman` binary installed, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
- The comparison table is directionally correct. Registry auto-update checks the remote registry and may pull images, while local auto-update depends on an external build or pull process updating local image storage.
