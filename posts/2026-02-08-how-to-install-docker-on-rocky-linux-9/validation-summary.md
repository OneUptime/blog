# Validation Summary: How to Install Docker on Rocky Linux 9

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker Compose v2
- Rocky Linux 9
- RHEL-compatible RPM repositories
- DNF package management
- systemd
- SELinux bind mount labels
- firewalld
- Docker daemon configuration

## Sources Consulted
- Docker Engine install documentation for RHEL: https://docs.docker.com/engine/install/rhel/
- Docker Engine install documentation for CentOS: https://docs.docker.com/engine/install/centos/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker bind mounts and SELinux labels: https://docs.docker.com/engine/storage/bind-mounts/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker `dockerd` reference: https://docs.docker.com/reference/cli/dockerd/
- Docker logging driver configuration: https://docs.docker.com/engine/logging/configure/
- Docker packet filtering and firewalld integration: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Compose plugin installation: https://docs.docker.com/compose/install/linux/
- Docker `system df` CLI reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker resource pruning documentation: https://docs.docker.com/engine/manage-resources/pruning/
- Rocky Linux Docker Engine documentation: https://docs.rockylinux.org/gemstones/containers/docker/
- Rocky Linux Podman documentation: https://docs.rockylinux.org/gemstones/containers/podman/

## Issues Found
- The post used `yum-utils` and `yum-config-manager`. Docker's current RHEL/CentOS documentation uses `dnf-plugins-core` and `dnf config-manager`, so the package and command were updated.
- The post configured Docker's CentOS RPM repository. Rocky Linux documentation now points Rocky systems to Docker's RHEL repository, so the repository URL was changed to `https://download.docker.com/linux/rhel/docker-ce.repo`.
- The conflicting package removal command omitted `runc`, which Docker's RHEL documentation lists as a conflicting package. The command was updated to remove `runc`.
- The removal text said Podman, Buildah, and related tools must be removed. Docker's RHEL documentation lists Podman and runc, not Buildah, so the wording and command were narrowed.
- The `groupadd docker` command could fail after Docker installation because Docker packages create the `docker` group. It was changed to `groupadd -f docker`.
- The firewalld section advised moving `docker0` into the trusted zone. Docker's official documentation says Docker creates a `docker` firewalld zone and places bridge interfaces such as `docker0` there, so this was changed to a zone-check command and corrected explanation.

## Review Notes
The guide is technically valid after the fixes. Docker's `exec-opts` cgroup driver setting is accepted, but on cgroup v2 hosts with systemd Docker defaults to the systemd cgroup driver when the option is omitted. The `json-file` log configuration is valid, though Docker currently recommends the `local` logging driver for many default logging setups because it rotates logs by default.
