# Validation Summary: How to Set Up and Manage Containers for the RHCSA Exam on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHCSA container-management tasks
- Podman
- UBI 9 container images
- systemd user services
- SELinux bind-mount labeling

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Podman upstream documentation for `podman generate systemd`: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Local `systemctl --help` and `loginctl --help` output for user service and lingering command syntax.

## Issues Found
- The post started a `web` container bound to host port `8080`, then later started `web-persistent` on the same host port without stopping the first container. I added `podman rm -f web` before creating `web-persistent` so the bind mount example can run without a port-allocation conflict.

## Review Notes
- The commands and explanations are consistent with Red Hat's RHEL 9 container documentation, including rootless user services under `~/.config/systemd/user`, `systemctl --user`, `loginctl enable-linger`, and `:Z` SELinux labeling for private container access.
- Upstream Podman documentation marks `podman generate systemd` as deprecated in favor of Quadlet, with no current removal plan. Red Hat's RHEL 9 documentation still documents `podman generate systemd`, so the RHCSA-focused example remains technically valid, but future RHEL-oriented content may want to mention Quadlet where it is relevant to the target exam version.
