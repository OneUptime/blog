# Validation Summary: How to Install Portainer on Banana Pi - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Banana Pi hardware
- Armbian
- Docker Engine
- Portainer Community Edition
- Docker Compose
- AdGuard Home
- WireGuard

## Sources Consulted
- Armbian Getting Started: https://docs.armbian.com/User-Guide_Getting-Started/
- Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer CE install with Docker on Linux (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer CE install with Docker on Linux (STS): https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer upgrade guidance for Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Banana Pi BPI-M5 official wiki: https://wiki.banana-pi.org/Banana_Pi_BPI-M5
- Banana Pi BPI-M7 official wiki: https://wiki.banana-pi.org/Banana_Pi_BPI-M7
- Banana Pi BPI-R3 official wiki: https://wiki.banana-pi.org/Banana_Pi_BPI-R3
- Banana Pi BPI-W3 official wiki: https://wiki.banana-pi.org/Banana_Pi_BPI-W3
- AdGuard Home Docker documentation: https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- LinuxServer WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/

## Issues Found
- The BPi-M7 specification listed a maximum of 16GB RAM, but the official Banana Pi documentation lists configurations up to 32GB. I corrected the hardware spec.
- The Armbian sentence claimed it had the "best" kernel support for Banana Pi boards. That is not a verifiable statement from official documentation, so I softened it to an accurate, supportable claim.
- The Docker post-install step used `usermod -aG docker $USER` even though the guide flow is running as `root`. That would add `root` to the `docker` group instead of the regular user created during first boot. I changed it to `usermod -aG docker <your-user>` and added the required re-login note based on Docker's post-install guidance.
- The Portainer install command used `portainer/portainer-ce:latest` and published port `9000` by default. Current Portainer documentation recommends channel tags such as `:lts` or `:sts`, serves the UI on `9443` by default, and treats `9000` as legacy HTTP access. I updated the command to `portainer/portainer-ce:lts`, published `9443` and `8000`, and noted that `9000` is optional for legacy use only.
- The eMMC section said `lsblk | grep mmcblk` checks whether eMMC is available. That command only lists MMC block devices and does not specifically identify eMMC. I corrected the wording so the command description matches what it actually does.
- The Docker storage note implied that setting `data-root` moves Docker storage in general. Current Docker documentation notes that on fresh Docker Engine 29+ installs, image and snapshot data may also live under `/var/lib/containerd`. I added that caveat.
- The Armbian CPU governor step said "Install armbian-config", but `armbian-config` is the management tool itself rather than an installation command in this context. I corrected the instruction to "Launch armbian-config".
- The example Compose file used the top-level `version: "3.8"` field. Docker's current Compose documentation marks the top-level `version` field as obsolete, so I removed it.

## Review Notes
- The Docker convenience script is still valid, but Docker recommends reviewing it before execution and using the package manager for future upgrades instead of re-running the script.
- On router/firewall hosts such as the BPi-R3, Docker's firewall behavior deserves extra care. Docker's networking documentation notes that enabling IP forwarding can affect forwarding policy on Linux router hosts.
- The Portainer `:lts` tag is intentionally a moving channel tag, so the exact deployed Portainer version will change over time while staying on the LTS line.
