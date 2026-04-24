# Validation Summary: How to Fix Missing CPU/Memory Stats in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI and Docker Engine API
- Linux cgroups v1 and v2
- Raspberry Pi OS
- Proxmox VE / LXC
- cAdvisor

## Sources Consulted
- Docker CLI `docker container stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker runtime metrics and cgroup v1/v2 guidance: https://docs.docker.com/engine/containers/runmetrics/
- Docker Engine API versioning: https://docs.docker.com/reference/api/engine/
- Docker daemon reference (`dockerd`, cgroup driver, `--validate`): https://docs.docker.com/reference/cli/dockerd/
- Docker resource constraints and kernel capability checks: https://docs.docker.com/engine/containers/resource_constraints/
- Docker deprecated features (`cgroup v1` deprecation notice): https://docs.docker.com/engine/deprecated/
- Portainer Docker socket connection docs: https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer Agent installation docs: https://docs.portainer.io/admin/environments/add/docker/agent
- Proxmox Linux Container docs: https://pve.proxmox.com/wiki/Linux_Container
- Proxmox `pct(1)` reference: https://pve.proxmox.com/pve-docs/pct.1.html
- Linux kernel cgroup v1 memory controller docs: https://docs.kernel.org/admin-guide/cgroup-v1/memory.html
- Linux kernel cgroup v2 docs: https://docs.kernel.org/next/admin-guide/cgroup-v2.html
- cAdvisor upstream README / quick start: https://github.com/google/cadvisor
- Raspberry Pi official forum thread on newer cmdline path / cgroup behavior: https://forums.raspberrypi.com/viewtopic.php?t=389843

## Issues Found
- The original cgroup-memory check assumed the cgroup v1 path `/sys/fs/cgroup/memory/memory.stat` existed on all Linux hosts. That is incorrect on cgroup v2 systems, so I changed the post to detect cgroup version first and scoped the boot-parameter workaround to cgroup v1 hosts.
- The cgroup v2 section overwrote `/etc/docker/daemon.json` and implied `native.cgroupdriver=systemd` always needed to be set manually. Docker’s current docs say `systemd` is already the default cgroup driver on cgroup v2 when systemd is available, so I changed the post to check `docker info`, merge config instead of overwriting it, and validate `daemon.json` before restart.
- The Raspberry Pi section used a single hardcoded boot cmdline path and Pi-specific kernel flags as if they were universally required. I changed this to use an `<active-cmdline-file>` placeholder, noted the common path difference between older and newer Raspberry Pi OS releases, and aligned the kernel-argument guidance with the broader Docker/Linux cgroup documentation.
- The Proxmox/LXC section prescribed blanket low-level LXC config lines that are not what Proxmox currently documents as the standard first step. I replaced that with the documented `nesting=1,keyctl=1` features toggle and added Proxmox’s recommendation to run Docker inside a QEMU VM instead of directly in LXC.
- The Docker stats API example hardcoded API version `v1.44`, which is version-sensitive and outdated. I changed it to instruct the reader to use the server API version reported by `docker version`.
- The Portainer Agent example used `portainer-agent`, while Portainer’s documented Docker deployment examples use `portainer_agent`. I corrected the container name in the commands.
- The kernel-update section hardcoded `linux-generic-hwe-22.04`, which is version-specific and no longer a generally correct recommendation for 2026. I replaced it with Docker’s documented cgroup v2 kernel support guidance and kept the upgrade advice generic.
- The cAdvisor example used the old `gcr.io/cadvisor/cadvisor:latest` image and omitted mounts and flags present in the current upstream quick start. I updated it to the current `ghcr.io/google/cadvisor` workflow with the required device/mount options.

## Review Notes
- Docker Engine v29 deprecates cgroup v1 support, so the cgroup v1 boot-parameter workaround in this post remains useful for older hosts but is increasingly a legacy-path fix.
- The post is now technically sound for Linux-based Portainer/Docker environments. Rootless Docker, Windows containers, and non-Linux hosts are not covered here and may require different troubleshooting paths.
