# Validation Summary: How to Deploy Portainer in a Proxmox LXC Container - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Proxmox VE
- LXC containers
- Docker Engine
- Portainer CE
- Linux container configuration
- Proxmox backup tooling

## Sources Consulted
- Proxmox `pct(1)` man page: https://pve.proxmox.com/pve-docs/pct.1.html
- Proxmox `pveam(1)` man page: https://pve.proxmox.com/pve-docs/pveam.1.html
- Proxmox `vzdump(1)` man page: https://pve.proxmox.com/pve-docs/vzdump.1.html
- Proxmox Container Toolkit chapter: https://pve.proxmox.com/pve-docs/chapter-pct.html
- Proxmox template index: https://download.proxmox.com/images/system/
- Docker Engine install on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker daemon reference: https://docs.docker.com/reference/cli/dockerd/
- Docker OverlayFS storage driver docs: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker storage driver selection docs: https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- LXC container config reference: https://man7.org/linux/man-pages/man5/lxc.container.conf.5.html
- Portainer CE Docker install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux

## Issues Found
- The post said a privileged container was required for Docker. I corrected that to say `--unprivileged 0` creates a privileged container and that Docker can also run in an unprivileged container with the right LXC settings, because Proxmox documents Docker-related `keyctl` support for unprivileged containers.
- The heredoc example for `/etc/pve/lxc/300.conf` omitted `lxc.mount.auto: proc:rw sys:rw`, so it did not match the manual edit example. I added the missing line so both methods apply the same configuration.
- The Docker installation step used `curl` without installing it first. I added `ca-certificates` and `curl` before invoking Docker's convenience script.
- The storage-driver section said "If overlay2 fails, use a different storage driver" but then configured `overlay2`, and it recommended `fuse-overlayfs` for this rootful setup. I rewrote that section to match Docker's current docs: `overlay2` is the preferred/default classic driver, it should be verified with `docker info`, and `fuse-overlayfs` was removed from the fallback guidance because Docker documents it for rootless mode.
- The Portainer deployment used the moving `latest` tag and exposed legacy HTTP port `9000` by default. I updated the image to `portainer/portainer-ce:sts` and clarified that `9443` is the current UI port, `8000` is for the tunnel server / Edge Agents, and `9000` is only for legacy HTTP access.
- The comparison table described LXC live migration as "Limited". I changed this to "Restart migration only" because Proxmox documents that running containers cannot be live-migrated and instead support restart migration.
- The introduction included a specific RAM-overhead number that was not documented by the official sources I checked. I changed it to the accurate, non-quantified statement that LXCs use less RAM than full VMs.

## Review Notes
- Docker's official Ubuntu installation docs prefer the `apt` repository for long-term maintenance. The convenience script used in the post is still valid, but Docker documents it as best suited to testing, development, or quick provisioning.
- `vzdump 300 --compress zstd --storage local --mode snapshot` is valid in this guide's example because the container root disk is placed on `local-lvm`, which supports snapshot-based backups.
- The Ubuntu 22.04 template filename used in the post is still present in Proxmox's template index as of April 24, 2026, so no change was needed there.
