# Validation Summary: How to Run Watchtower Alternative with Podman Auto-Update

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman auto-update
- Podman Quadlet
- systemd services and timers
- Rootless and rootful Linux containers
- Watchtower comparison

## Sources Consulted
- Podman auto-update documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-auto-update.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman generate systemd documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Local command check attempted with `podman --version` and `podman auto-update --help`; Podman is not installed in this review environment.

## Issues Found
- The post mixed Quadlet service names with legacy `podman generate systemd` service names. Quadlet files such as `nginx-web.container` generate `nginx-web.service`, while generated legacy files commonly use names such as `container-nginx-web.service`. Added separate Quadlet enable commands and clarified that moving `container-*.service` files applies only to the legacy method.
- The start commands after removing manually started containers only showed legacy service names. Added the correct Quadlet start commands and kept the legacy commands for readers using `podman generate systemd`.
- The rollback section incorrectly implied systemd itself restarts the previous image and showed a manual rollback that pulled a digest without changing the service image reference. Updated the section to state that `podman auto-update` rolls back by default when the unit restart fails, and showed a correct Quadlet manual rollback by pinning `Image=` to the previous digest, reloading systemd, and restarting the service.

## Review Notes
- The Quadlet examples correctly use `AutoUpdate=registry`, which is the documented Quadlet equivalent for configuring Podman auto-update.
- `podman generate systemd` is correctly identified as deprecated, and the recommendation to use Quadlet is consistent with current Podman documentation.
- The post uses fully qualified image references for registry auto-update examples, which is required by Podman for the `registry` policy.
