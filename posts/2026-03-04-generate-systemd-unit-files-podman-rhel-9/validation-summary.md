# Validation Summary: How to Generate systemd Unit Files for Podman Containers on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- systemd unit files
- Rootless and rootful containers
- Quadlet

## Sources Consulted
- Podman `podman-generate-systemd(1)` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman `podman-systemd.unit(5)` Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Red Hat Enterprise Linux 9 container documentation: https://docs.redhat.com/en-us/documentation/red_hat_enterprise_linux/9/pdf/building_running_and_managing_containers/Red_Hat_Enterprise_Linux-9-Building_running_and_managing_containers-en-US.pdf
- Red Hat Enterprise Linux 9.4 release notes, deprecated functionality: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/9.4_release_notes/deprecated-functionality

## Issues Found
- Clarified that rootful `sudo podman generate systemd --name webserver --new --files` must be run against a container that exists in the root container store. Rootless and rootful Podman use separate container stores, so a container created as a regular user is not available to `sudo podman` by name.
- Added `mkdir -p ~/.config/containers/systemd/` before writing the Quadlet `.container` file. The documented rootless Quadlet path is correct, but the redirection would fail if the directory did not already exist.

## Review Notes
The post correctly notes that `podman generate systemd` is deprecated in favor of Quadlet while still available. Red Hat documents Quadlet as available beginning with Podman v4.6, and RHEL 9.4 release notes mark `podman generate systemd` as deprecated. Podman was not installed in the local workspace, so command validation was performed against official Podman and Red Hat documentation rather than local `--help` output.
