# Validation Summary: How to Deploy Portainer on a Proxmox Virtual Machine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Proxmox VE
- Ubuntu Server 24.04 LTS
- Docker Engine
- Portainer CE
- QEMU Guest Agent
- containerd

## Sources Consulted
- Proxmox `qm` reference: https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE Administration Guide: https://pve.proxmox.com/pve-docs/pve-admin-guide.html
- Ubuntu 24.04.4 release directory: https://releases.ubuntu.com/noble/
- Ubuntu Server basic installation guide: https://ubuntu.com/server/docs/tutorial/basic-installation/
- Ubuntu installer screen-by-screen guide: https://canonical-subiquity.readthedocs-hosted.com/en/latest/tutorial/screen-by-screen.html
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker containerd image store documentation: https://docs.docker.com/engine/storage/containerd/
- Portainer CE install on Docker for Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux

## Issues Found
- The Ubuntu ISO download URL and VM CD-ROM filename referenced an outdated and inconsistent 24.04.1/24.04 image name. Updated both to the current Ubuntu 24.04.4 server ISO filename published by Canonical.
- The Proxmox CLI section was labeled `pvesh`, but the commands use `qm`. Renamed the section to match the actual CLI being used.
- The `qm create` example used deprecated boot syntax (`--boot c --bootdisk scsi0`). Updated it to current `qm` syntax with `--boot 'order=ide2;scsi0'` so the VM boots from the installer ISO first and then the disk.
- The Proxmox WebUI steps did not tell the reader to enable QEMU Guest Agent, even though the post later installs `qemu-guest-agent` inside Ubuntu. Added the required Proxmox-side setting.
- The Ubuntu install guidance said “Minimal installation”, which does not match the current Ubuntu Server installer flow. Reworded this to the default Ubuntu Server install and kept the OpenSSH guidance.
- The Docker service was only enabled, not guaranteed to be started. Changed `systemctl enable docker` to `systemctl enable --now docker`.
- The Portainer container command used `portainer/portainer-ce:latest` and exposed port `9000` by default. Updated it to Portainer’s current LTS install command using `portainer/portainer-ce:lts` and the documented default ports `8000` and `9443`.
- The snapshots section described snapshots as backups. Reworded it so the post no longer conflates a VM snapshot with a backup.
- The extra-disk section assumed the added disk would always be `/dev/sdb`. Replaced the hard-coded device references with a placeholder after discovery.
- The Docker data-disk section was incomplete for current fresh Docker Engine 29 installs, because Docker now uses the containerd image store by default and stores image/snapshot data under `/var/lib/containerd`. Updated the steps to move both Docker and containerd data, create the required config directories, and configure `/etc/containerd/config.toml` as well as `/etc/docker/daemon.json`.
- The extra-disk migration used `rsync` without ensuring it was installed. Added `sudo apt install -y rsync`.
- Standardized “Qemu guest agent” to “QEMU Guest Agent”.

## Review Notes
- The post still uses Docker’s convenience install script from `get.docker.com`. This is supported by Docker, but Docker documents the `apt` repository flow as the primary installation method and notes that the convenience script is mainly for testing and development environments.
