# Validation Summary: How to Install Portainer on Raspberry Pi 5 with Ubuntu Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Raspberry Pi 5
- Ubuntu Server 24.04 LTS
- Docker Engine
- containerd
- Portainer CE
- UFW
- Netplan
- CPU frequency scaling and Raspberry Pi utilities

## Sources Consulted
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Docker containerd image store: https://docs.docker.com/engine/storage/containerd/
- Portainer CE install on Docker (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CE install on Docker (current STS docs): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Ubuntu Server firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Netplan static IP documentation: https://netplan.readthedocs.io/en/1.0.1/using-static-ip-addresses/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Ubuntu package metadata for `libraspberrypi-bin`: https://packages.ubuntu.com/noble/libraspberrypi-bin
- Ubuntu file list for `libraspberrypi-bin`: https://packages.ubuntu.com/noble/arm64/libraspberrypi-bin/filelist
- Ubuntu package metadata for `cpufrequtils`: https://packages.ubuntu.com/noble/cpufrequtils
- Ubuntu on Raspberry Pi: https://ubuntu.com/download/raspberry-pi

## Issues Found
- The SSH example hardcoded `ubuntu@<pi-ip>` even though the post tells readers to set a username in Raspberry Pi Imager. I changed it to `ssh <your-username>@<pi-ip>` so it matches the documented setup flow.
- The Docker installation step used the convenience script piped to `sh`. Docker's current Ubuntu documentation recommends the official apt repository for managed installs, and the convenience script requires `root` or `sudo`. I replaced the block with the official apt-repository method.
- The NVMe storage section only moved Docker's `data-root`. On fresh Docker Engine 29 installs, image and container snapshot data is stored under containerd's image store by default, so changing `data-root` alone does not move all Docker storage. I updated the post to configure both Docker's `data-root` and containerd's `root`.
- The Portainer deployment exposed legacy HTTP port `9000` and used the `latest` image tag. Current Portainer install docs use `9443` by default, treat `9000` as legacy-only, and document `lts`/`sts` image tags. I updated the command to use `9443` and `portainer/portainer-ce:lts`.
- The UFW step implied that opening Portainer's Docker-published ports in UFW was meaningful. Docker's Ubuntu install docs explicitly warn that published container ports bypass UFW rules by default. I corrected the firewall section to allow SSH before enabling UFW and added the Docker/UFW caveat.
- The package name `rpi-utils` was not correct for Ubuntu 24.04 arm64. I replaced it with `libraspberrypi-bin`, which provides `vcgencmd`.
- The subsection title `Enable Hardware Acceleration for Pi 5` did not match the commands shown. I renamed it to reflect the actual task performed by that section.

## Review Notes
- The netplan example remains technically valid, but interface names can vary by installation. Readers still need to confirm whether `eth0` matches their system.
- The NVMe example still formats the whole NVMe device directly. That is workable for a dedicated lab disk, but using a partition and `UUID=` in `/etc/fstab` would be more resilient in a future revision.
- `newgrp docker` is still a valid documented way to refresh group membership immediately; logging out and back in is the other Docker-documented option.
- Portainer's optional Edge Agent tunnel port `8000` was intentionally not exposed because the post does not cover Edge Agents.
