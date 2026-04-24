# Validation Summary: How to Install Portainer CE on Arch Linux with Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Arch Linux
- pacman
- Docker Engine
- Docker Compose
- Portainer CE
- systemd
- nftables
- AUR
- yay

## Sources Consulted
- https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- https://docs.portainer.io/start/upgrade/docker
- https://docs.portainer.io/start/requirements-and-prerequisites
- https://docs.docker.com/engine/install/linux-postinstall
- https://docs.docker.com/engine/network/packet-filtering-firewalls/
- https://archlinux.org/packages/extra/x86_64/docker/
- https://archlinux.org/packages/extra/x86_64/docker-compose/
- https://man.archlinux.org/man/makepkg.8.en
- https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=portainer-bin
- https://aur.archlinux.org/cgit/aur.git/plain/portainer.service?h=portainer-bin

## Issues Found
- The post used `portainer/portainer-ce:latest` for install and update commands. I changed both to `portainer/portainer-ce:sts` to match Portainer's current official Docker installation guidance.
- The firewall section suggested opening ports with `ufw` as though that would reliably govern Docker-published ports. Docker's official firewall documentation warns that published container ports can bypass `ufw`, so I replaced that with a note and an `nftables` example instead.
- The `nftables` example appended an incomplete `table inet filter` block to `/etc/nftables.conf`, which could duplicate or break an existing ruleset. I replaced it with a rule-add command against an existing input chain and a note to persist the equivalent rule in the existing config.
- The IP lookup command returned CIDR-formatted addresses like `192.168.1.10/24`. I changed it to strip the prefix length so the resulting value matches the `https://<ip>:9443` example.

## Review Notes
- The `docker` and `docker-compose` package names are current in Arch's official repositories as of April 24, 2026.
- The AUR `portainer-bin` package exists and installs a `portainer.service` unit, so the optional AUR workflow is still valid.
- Portainer's validated configuration matrix currently lists Docker versions up to `29.2.1`, while Arch's `docker` package is newer (`29.4.1-1` on April 24, 2026). That does not mean the guide is broken, but readers on Arch should re-check Portainer's requirements page after major Docker upgrades.
