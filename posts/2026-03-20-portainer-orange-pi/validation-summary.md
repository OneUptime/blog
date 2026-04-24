# Validation Summary: How to Install Portainer on Orange Pi - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Orange Pi
- Ubuntu Server
- Docker Engine
- Portainer CE
- UFW
- Linux cgroups

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Runtime metrics / cgroup v2 notes - https://docs.docker.com/engine/containers/runmetrics/
- Docker Docs: `docker run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Ubuntu Server Docs: Firewall / UFW - https://documentation.ubuntu.com/server/how-to/security/firewalls/
- Orange Pi Wiki: Orange Pi 5 - https://www.orangepi.org/orangepiwiki/index.php?title=Orange_Pi_5
- Orange Pi Wiki: Orange Pi 5 Plus - https://www.orangepi.org/orangepiwiki/index.php/Orange_Pi_5_Plus
- Orange Pi Wiki: Orange Pi CM4 - https://www.orangepi.org/orangepiwiki/index.php/Orange_Pi_CM4

## Issues Found
- The description said the guide covered Ubuntu or Debian, but the Docker repository and package instructions were Ubuntu-specific. I corrected the description to match the actual commands.
- The introduction understated Orange Pi 5 memory capacity as up to 16GB. Orange Pi's official documentation lists configurations up to 32GB, so I corrected that figure.
- The prerequisites claimed `Ubuntu 22.04 or later` as the official Orange Pi image target. The official Orange Pi 5 documentation explicitly lists Ubuntu 20.04 and 22.04, so I narrowed this to Ubuntu 22.04 to avoid overclaiming support.
- The Docker repository line used only `VERSION_CODENAME`. Docker's current Ubuntu install docs use `${UBUNTU_CODENAME:-$VERSION_CODENAME}` for derivative Ubuntu images, so I updated the command for better compatibility with Orange Pi's Ubuntu-based images.
- The cgroup section incorrectly assumed GRUB and `update-grub` were the right mechanism on Orange Pi. Docker's docs only require the `systemd.unified_cgroup_hierarchy=1` kernel argument, and Orange Pi's Linux docs use `/boot/orangepiEnv.txt` with `extraargs=` for kernel arguments. I replaced the GRUB-specific instructions with Orange Pi-appropriate guidance and clarified that Ubuntu 22.04 normally already uses cgroup v2.
- The Portainer install command used `portainer/portainer-ce:latest` and exposed legacy port `9000` by default. Current Portainer docs use `portainer/portainer-ce:sts`, `--restart=always`, and `9443` as the default UI/API port, with `9000` only for legacy HTTP use. I updated the command accordingly.
- The firewall section implied that `ufw allow 9443` controls access to a Docker-published Portainer port. Docker's docs state that published container traffic is diverted before it reaches UFW's normal chains, so I corrected the section to explain that UFW does not gate `-p 9443:9443` by itself and that bind-address scoping is the reliable way to limit exposure.

## Review Notes
- The default Orange Pi Linux login behavior varies slightly by image, but official Orange Pi Linux documentation consistently shows `orangepi` and `root` accounts with the default password `orangepi`. The post's `ssh orangepi@...` example is acceptable for the intended Orange Pi Ubuntu images.
- The manual `overlay` and `br_netfilter` module-loading section is reasonable as a board-specific troubleshooting step, but newer Orange Pi images may already have the required modules and forwarding behavior enabled.
- Validation was performed against current official Docker, Portainer, Ubuntu, and Orange Pi documentation as of 2026-04-24.
