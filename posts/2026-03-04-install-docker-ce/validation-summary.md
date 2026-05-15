# Validation Summary: How to Install Docker CE on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Docker CE / Docker Engine
- DNF package management
- systemd
- firewalld
- Docker daemon configuration

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL, https://docs.docker.com/engine/install/rhel/
- Docker Docs: Linux post-installation steps for Docker Engine, https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker daemon configuration overview, https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd CLI reference, https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Configure logging drivers, https://docs.docker.com/engine/logging/configure/
- Docker Docs: Packet filtering and firewalls, https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Red Hat Documentation: Building, running, and managing containers in RHEL 9, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers

## Issues Found
- The introduction said Docker CE could be installed alongside Podman. Docker's RHEL installation instructions list `podman` as a conflicting package, and Red Hat documents Docker as unsupported in RHEL 9. Changed the wording to describe Docker CE as an upstream, unsupported alternative to Podman.
- The conflicting-package removal command omitted several packages Docker documents for RHEL and removed packages not listed in Docker's current RHEL instructions. Updated the command to match Docker's documented conflicting package list.
- The repository setup used `yum-utils` and `yum-config-manager`. Docker's current RHEL instructions use `dnf-plugins-core` and `dnf config-manager`. Updated the commands accordingly.
- The firewall section instructed users to add `docker0` to the `trusted` firewalld zone. Docker's current documentation says Docker creates its own `docker` firewalld zone and adds Docker bridge interfaces to it when firewalld is enabled. Replaced the commands with a verification command.

## Review Notes
- Adding a user to the `docker` group is technically correct, but Docker documents that this grants root-level privileges. Future revisions could add a brief security note.
