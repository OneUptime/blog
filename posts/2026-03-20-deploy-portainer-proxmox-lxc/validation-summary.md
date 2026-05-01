# Validation Summary: How to Deploy Portainer in a Proxmox LXC Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Proxmox VE
- LXC
- Docker Engine
- Portainer CE
- Ubuntu 22.04

## Sources Consulted
- Proxmox VE Administration Guide: https://pve.proxmox.com/pve-docs/pve-admin-guide.pdf
- Proxmox `pct(1)` manual: https://pve.proxmox.com/pve-docs/pct.1.html
- Proxmox `pveam(1)` manual: https://pve.proxmox.com/pve-docs/pveam.1.html
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Portainer CE install on Docker for Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- LXC container configuration manual: https://linuxcontainers.org/lxc/manpages/man5/lxc.container.conf.5.html

## Issues Found
- The post hard-coded a specific Ubuntu 22.04 LXC template filename. Proxmox documents that the available template list is updated daily, so I changed the instructions to list current Ubuntu 22.04 templates with `pveam available --section system | grep ubuntu-22.04` and then download the current filename.
- The `pct create` example only enabled `nesting=1`. Proxmox documents `keyctl=1` as required for Docker in unprivileged containers, so I updated the feature list to `nesting=1,keyctl=1`.
- The Docker install step piped the convenience script directly to `sh`. I changed it to Docker's documented download-then-run flow for the same script.
- The Portainer deployment command exposed port `9000` by default and used the `latest` image tag. Portainer's current Linux install guide uses port `9443` by default, treats `9000` as legacy-only, and documents `portainer/portainer-ce:lts`, so I updated the command accordingly.
- The summary section still described Docker enablement as `nesting=1` only. I corrected it to reflect the required `keyctl=1` setting and the updated Portainer port/tag details.

## Review Notes
- The custom LXC config (`lxc.apparmor.profile: unconfined`, `lxc.cgroup2.devices.allow: a`, and `lxc.cap.drop:`) is syntactically valid, but it reduces container isolation to make Docker work more reliably.
- Docker's convenience script is officially supported, but Docker recommends repository-based installation for production environments. The post's home-lab framing makes the convenience-script approach acceptable here.
- Proxmox documents that containers offer lower overhead than full VMs, but a VM remains the better choice when maximum isolation is a priority.
