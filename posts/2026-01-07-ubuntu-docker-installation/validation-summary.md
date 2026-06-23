# Validation Summary: How to Install Docker on Ubuntu (The Right Way)

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- Docker Engine
- Docker Compose v2
- Docker Buildx and BuildKit
- APT repositories and keyrings
- systemd services
- Docker daemon configuration
- Docker rootless mode
- UFW and iptables
- Docker logging and security practices

## Sources Consulted
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: BuildKit - https://docs.docker.com/build/buildkit/
- Docker Docs: Rootless mode - https://docs.docker.com/engine/security/rootless/
- Docker Docs: Rootless mode tips - https://docs.docker.com/engine/security/rootless/tips/
- Docker Docs: Rootless mode troubleshooting - https://docs.docker.com/engine/security/rootless/troubleshoot/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Canonical: Ubuntu 26.04 LTS Resolute Raccoon release announcement - https://canonical.com/blog/canonical-releases-ubuntu-26-04-lts-resolute-raccoon

## Issues Found
- The prerequisites listed Ubuntu 20.04 as supported. Docker's current official Ubuntu installation page lists 22.04, 24.04, 25.10, and 26.04. Updated the supported version list.
- The repository setup used the older one-line `.list` format and `docker.gpg`. Updated it to Docker's current `.sources` example with `/etc/apt/keyrings/docker.asc` and the `UBUNTU_CODENAME` fallback.
- The uninstall command omitted `docker-compose-v2`, which Docker lists as a conflicting package. Added it.
- The daemon configuration forced `overlay2` and described it as the recommended storage driver. Current Docker docs describe the containerd image store as the default on fresh Docker Engine 29.0+ installs and `overlay2` as a classic storage driver for many upgraded installs. Removed the forced storage driver and corrected the explanation.
- The daemon configuration used a `features.buildkit` block. BuildKit is now the default builder for Docker Engine users, so the post now explains that rather than configuring a stale daemon feature.
- The rootless setup only stopped the rootful Docker service. Docker's docs recommend disabling the service and socket and removing `/var/run/docker.sock` before setup. Updated the command and added the rootless extras package fallback.
- Rootless networking recommended VPNKit for better performance. Docker's current rootless troubleshooting docs describe VPNKit as legacy and list several user-mode networking options. Replaced the recommendation with a current RootlessKit driver note.
- Switching between rootful and rootless Docker only mentioned `DOCKER_HOST`. Current rootless setup creates a Docker context, so the post now includes `docker context use rootless` and `docker context use default`.
- The UFW section suggested setting `"iptables": true` to make Docker respect UFW. Docker documents that published ports can bypass UFW and recommends the `DOCKER-USER` chain for filtering. Removed the misleading daemon snippet and corrected the guidance.
- Troubleshooting used `netstat`, which is not installed by default on modern Ubuntu systems. Replaced it with `ss`.
- Troubleshooting attempted `docker info | grep "iptables"`, which is not a reliable Docker info field. Replaced it with an iptables chain check.
- The least-privilege resource-limit example used `alpine stress --cpu 1`, but `stress` is not included in the Alpine image. Replaced it with a command that works with Alpine while still demonstrating Docker resource flags.
- The Docker Scout command assumed the Scout CLI plugin is installed. Clarified that the command applies when the plugin is available.

## Review Notes
The tutorial is technically relevant and salvageable. Some optional production choices, such as public DNS servers in `daemon.json` and blanket Docker daemon examples that overwrite existing configuration, are context-dependent and should be used carefully, but they are not inherently incorrect after the fixes above.
