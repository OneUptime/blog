# Validation Summary: How to Install Docker on Debian 12 Bookworm

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Debian 12 Bookworm
- apt package repositories and pinning
- Docker Compose
- systemd
- Docker daemon configuration
- UFW, iptables, and container networking

## Sources Consulted
- Docker Docs: Install Docker Engine on Debian - https://docs.docker.com/engine/install/debian/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Install Docker Compose standalone (Legacy) - https://docs.docker.com/compose/install/standalone/
- Debian Manpages: apt_preferences(5) for Debian bookworm - https://manpages.debian.org/bookworm/apt/apt_preferences.5.en.html
- GitHub API: Docker Compose latest release assets - https://api.github.com/repos/docker/compose/releases/latest

## Issues Found
- The old-package removal command did not match Docker's current official Debian removal list. Updated it to remove `docker.io`, `docker-doc`, `docker-compose`, `podman-docker`, `containerd`, and `runc`.
- The log rotation explanation implied all containers immediately use the new defaults after restarting Docker. Updated it to clarify that Docker applies daemon logging defaults to newly created containers, while existing containers do not automatically pick up the new configuration.
- The UFW section said setting `"iptables": false` makes Docker respect UFW. Docker's documentation says this only prevents Docker from creating most firewall rules, is not appropriate for most users, and can break container networking. Updated the wording accordingly.
- The apt pinning example pinned Docker `5:27.*`, which is stale for current Bookworm Docker packages. Replaced it with a snippet that reads the installed `docker-ce` and `docker-ce-cli` versions with `dpkg-query` and pins those exact versions.

## Review Notes
- Docker's current Debian documentation now uses a Deb822 `/etc/apt/sources.list.d/docker.sources` file. The post's one-line `/etc/apt/sources.list.d/docker.list` repository entry remains valid apt syntax, so it was left unchanged.
- The standalone `docker-compose` binary remains a legacy install path. The post already frames it as optional for legacy scripts and primarily recommends the Compose plugin through `docker compose`.
