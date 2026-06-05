# Validation Summary: How to Install Docker on FreeBSD Using Linux Emulation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine and Docker CLI
- FreeBSD
- FreeBSD Linux binary compatibility / Linuxulator
- bhyve and vm-bhyve
- Alpine Linux
- Podman on FreeBSD
- FreeBSD Jails
- ZFS
- NFS
- Docker Machine

## Sources Consulted
- FreeBSD Handbook: Linux Binary Compatibility: https://docs.freebsd.org/en/books/handbook/book/#linuxemu
- FreeBSD Handbook: Jails and Containers: https://docs.freebsd.org/en/books/handbook/jails/
- vm-bhyve README and quick start: https://github.com/freebsd/vm-bhyve/blob/master/README.md
- Docker Docs: Configure remote access for Docker daemon: https://docs.docker.com/engine/daemon/remote-access/
- Docker Docs: Docker CLI reference and DOCKER_HOST / SSH / TCP usage: https://docs.docker.com/reference/cli/docker/
- Docker Docs: Protect the Docker daemon socket: https://docs.docker.com/engine/security/protect-access/
- Podman installation docs for FreeBSD: https://podman.io/docs/installation
- Alpine Linux downloads and release information: https://www.alpinelinux.org/downloads/ and https://www.alpinelinux.org/releases/
- Alpine Linux Docker wiki: https://wiki.alpinelinux.org/wiki/Docker
- FreshPorts sysutils/docker: https://www.freshports.org/sysutils/docker/
- FreshPorts sysutils/docker-machine: https://www.freshports.org/sysutils/docker-machine/
- FreshPorts sysutils/podman: https://www.freshports.org/sysutils/podman/

## Issues Found
- The vm-bhyve setup omitted installing sample templates before using `vm create -t alpine`. Added the template copy command after `vm init`.
- The Alpine ISO referenced version 3.19, which is no longer current. Updated the example to Alpine 3.23.4, the current stable release as of the review date.
- The Alpine OpenRC command used the `boot` runlevel for Docker. Changed it to `rc-update add docker default`, matching common Alpine Docker setup guidance.
- The Docker remote access section presented unauthenticated TCP as the primary method. Changed the main recommendation to SSH-based `DOCKER_HOST` and left TCP as an explicitly insecure alternative.
- The Linuxulator description incorrectly described syscall emulation as happening at the userspace level. Revised it to describe FreeBSD's Linux ABI support in the kernel and its lack of some Linux-specific system management features.
- The Docker CLI static binary download example wrote a `.tgz` archive directly to `/compat/linux/usr/local/bin/docker` before extracting it. Removed the incorrect download-to-binary command and kept the proper extract-and-copy flow.
- The Podman section was too broad about Docker image compatibility and omitted FreeBSD-specific setup requirements. Added `fdescfs` and `service podman enable`, changed the example to a FreeBSD-native image, and clarified Linux image limitations.
- The jail example used `jail -c` without `persist` or a command, which is not a reliable standalone "start" example. Added `persist` for the minimal persistent jail example.

## Review Notes
The post is technically relevant and salvageable. Docker still does not run natively on FreeBSD; running a Linux VM remains the most practical Docker Engine approach. Podman on FreeBSD is experimental and improving, but it should still be presented with FreeBSD-native OCI images as the best fit and Linux images as compatibility-dependent.
