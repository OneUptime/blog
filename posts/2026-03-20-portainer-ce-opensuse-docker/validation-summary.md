# Validation Summary: Installing Portainer CE on openSUSE with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- openSUSE Leap
- openSUSE Tumbleweed
- Docker Engine
- Portainer CE
- firewalld
- AppArmor

## Sources Consulted
- Portainer Documentation: Install Portainer CE with Docker on Linux — https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer Documentation: Lifecycle policy — https://docs.portainer.io/start/lifecycle
- Portainer Documentation: Requirements and prerequisites — https://docs.portainer.io/start/requirements-and-prerequisites
- Docker Docs: Linux post-installation steps for Docker Engine — https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: AppArmor security profiles for Docker — https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Packet filtering and firewalls — https://docs.docker.com/engine/network/packet-filtering-firewalls/
- openSUSE User Documentation Project: Updating, upgrading, snapshots and best practices — https://doc.opensuse.org/documentation/tumbleweed/updating_upgrading_reverting/
- openSUSE Wiki: Docker — https://en.opensuse.org/Docker
- openSUSE Wiki: Lifetime — https://en.opensuse.org/Lifetime
- openSUSE Security and Hardening Guide: Masquerading and firewalls — https://doc.opensuse.org/documentation/leap/security/html/book-security/cha-security-firewall.html

## Issues Found
- The prerequisite list included `openSUSE Leap 15.5+`, but Leap 15.5 is end-of-life. I updated this to `openSUSE Leap 15.6 or newer, or openSUSE Tumbleweed` so the post no longer points readers at an unsupported release.
- The system update step used `zypper update` for both Leap and Tumbleweed. On Tumbleweed, official guidance is to use `zypper dup`, so I split the step into separate Leap and Tumbleweed commands.
- The Portainer deployment and update commands used the floating `latest` tag. I changed them to `portainer/portainer-ce:sts` to match Portainer's current Docker installation documentation.
- The Docker socket troubleshooting advice used `chmod 666 /var/run/docker.sock`, which is insecure and not the documented non-root setup. I replaced it with the supported `docker` group workflow using `usermod -aG docker` and `newgrp docker`.
- The AppArmor troubleshooting advice used `aa-complain /etc/apparmor.d/docker`, which is not a reliable or documented fix for current Docker setups. I replaced it with supported diagnostic commands using `aa-status` and `dmesg`.
- The firewall section was phrased as a blanket required step. I adjusted the wording so it is presented as conditional host-firewall configuration, which better matches Docker's firewalld integration.

## Review Notes
- Portainer's current Linux Docker install page uses the `sts` image tag, while its lifecycle policy recommends LTS releases for production workloads. The post now matches the install documentation, but a future revision could explicitly explain the STS versus LTS tradeoff.
- As of April 24, 2026, openSUSE Leap 15.6 is the last supported Leap 15.x release and is near the end of its maintenance window, so readers using Leap should plan for an upgrade path.
