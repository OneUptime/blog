# Validation Summary: How to Install Podman on Rocky Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rocky Linux 8 and 9
- Podman
- Buildah
- Skopeo
- podman-compose
- Rootless containers
- SELinux
- systemd and Quadlet
- firewalld

## Sources Consulted
- Rocky Linux Podman guide: https://docs.rockylinux.org/guides/containers/podman_guide/
- Red Hat Enterprise Linux 8 container tools documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/building_running_and_managing_containers/index
- Podman installation documentation: https://podman.io/docs/installation
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman system migrate documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman generate documentation: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman run documentation for SELinux volume labels: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network reload documentation: https://docs.podman.io/en/latest/markdown/podman-network-reload.1.html

## Issues Found
- `podman-compose` was installed without enabling EPEL. Rocky Linux documentation states that `podman-compose` comes from EPEL, so I added `sudo dnf install -y epel-release` before installing it.
- The rootless setup changed `/etc/subuid` and `/etc/subgid` mappings but did not apply the updated mappings to Podman. I added `podman system migrate`, which is the documented command to migrate containers after user namespace mapping changes.
- The systemd service example used `podman generate systemd`, which current Podman documentation marks as deprecated. I replaced it with a Quadlet `.container` file while keeping the same Nginx service behavior.
- The DNS troubleshooting example focused on restarting `systemd-resolved`, which is not the right general fix for current Podman networking on Rocky/RHEL systems. I replaced it with `podman network ls`, `podman network inspect podman`, and `podman network reload --all`, matching Podman's documented network management and firewall-reload recovery commands.

## Review Notes
The core installation commands for Podman on Rocky Linux are correct. Rocky Linux and RHEL documentation both support installing Podman from the distribution repositories, and RHEL 8 documentation supports the `container-tools` module approach. The SELinux `:Z` volume labeling examples are consistent with Podman documentation, but users should be careful using `:Z` on shared host paths because it applies private labels for one container.
