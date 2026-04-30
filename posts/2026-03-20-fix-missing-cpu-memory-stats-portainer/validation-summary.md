# Validation Summary: How to Fix Missing CPU/Memory Stats in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Agent
- Docker Engine
- Docker CLI
- Linux cgroups
- Raspberry Pi OS
- Proxmox VE LXC

## Sources Consulted
- Docker CLI reference for `docker stats`: https://docs.docker.com/reference/cli/docker/container/stats/
- Docker runtime metrics and cgroup guidance: https://docs.docker.com/engine/containers/runmetrics/
- Docker daemon cgroup driver reference: https://docs.docker.com/reference/cli/dockerd/
- Docker daemon troubleshooting (`cgroup_enable=memory swapaccount=1`): https://docs.docker.com/engine/daemon/troubleshoot/
- Portainer Agent installation guide: https://docs.portainer.io/admin/environments/add/docker/agent
- Raspberry Pi documentation for `cmdline.txt` and boot partition paths: https://www.raspberrypi.com/documentation/configuration/config-txt/
- Raspberry Pi `config.txt` documentation noting `/boot/firmware/` on Bookworm and later: https://www.raspberrypi.com/documentation/computers/config_txt.html
- Proxmox VE Linux Container documentation: https://pve.proxmox.com/wiki/Linux_Container
- Proxmox container configuration reference (`features`, `keyctl`, `nesting`): https://pve.proxmox.com/pve-docs/pct.conf.5.html
- LXC container configuration reference for `lxc.cgroup2.*` keys: https://linuxcontainers.org/lxc/manpages/man5/lxc.container.conf.5.html

## Issues Found
- The Raspberry Pi instructions used `/boot/cmdline.txt` unconditionally. Current Raspberry Pi OS stores the boot partition at `/boot/firmware/`, so I updated the command and noted that older releases still use `/boot/cmdline.txt`.
- The Raspberry Pi kernel parameters were outdated and too specific. I replaced `cgroup_enable=memory cgroup_memory=1 cgroup_enable=cpuset` with the documented Docker guidance `cgroup_enable=memory swapaccount=1`.
- The verification step used `/proc/cgroups` as if it applied everywhere. Docker's documentation says `/proc/cgroups` is not meaningful on cgroup v2 hosts, so I kept the cgroup v1 check and added the correct cgroup v2 controller check.
- The Proxmox LXC example used `lxc.cgroup2.memory.limit_in_bytes`, which is not a valid cgroup v2 key. I removed that line and kept the documented Proxmox `features: nesting=1,keyctl=1` setting relevant to Docker in LXC.
- The Docker cgroup-driver section implied the field could be blank and recommended `cgroupfs`. Current Docker documentation says the default is `systemd` on cgroup v2 hosts and `cgroupfs` on cgroup v1 hosts, so I corrected the explanation and example to `systemd` for systemd-based hosts.
- The Portainer Agent example mounted `/proc` to `/host/proc`, which is not the documented host-management mount. I replaced it with the documented `-v /:/host` mount.

## Review Notes
- Proxmox recommends running Docker workloads inside a Proxmox QEMU VM when maximum isolation and compatibility are required; Docker inside LXC works with caveats.
- Current Debian-based distributions, including Raspberry Pi OS Bookworm-era systems, commonly use cgroup v2 by default, so cgroup v1-only checks can be misleading.
