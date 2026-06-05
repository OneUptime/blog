# Validation Summary: How to Install Docker on Arch Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Docker Buildx
- Arch Linux
- pacman
- systemd
- Docker storage drivers
- Docker networking, DNS, iptables, nftables, and firewalld

## Sources Consulted
- Arch Linux package: docker - https://archlinux.org/packages/extra/x86_64/docker/
- Arch Linux package: docker-compose - https://archlinux.org/packages/extra/x86_64/docker-compose/
- Arch Linux package: docker-buildx - https://archlinux.org/packages/extra/x86_64/docker-buildx/
- Arch Linux docker-compose file list - https://archlinux.org/packages/extra/x86_64/docker-compose/files/
- Docker Docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Docker daemon configuration overview - https://docs.docker.com/engine/daemon/
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: BTRFS storage driver - https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- ArchWiki: Docker - https://wiki.archlinux.org/title/Docker
- ArchWiki: systemd-resolved - https://wiki.archlinux.org/title/Systemd-resolved

## Issues Found
- The Docker Compose section incorrectly said `docker-compose` only installs the standalone binary and that `docker-buildx` is needed for `docker compose`. Updated it to say Arch's `docker-compose` package installs both `/usr/bin/docker-compose` and the Docker CLI plugin, while `docker-buildx` is for BuildKit-based image builds.
- The storage driver section claimed Docker defaults to `overlay2` and suggested switching to `btrfs` on btrfs root filesystems. Updated it for current Docker releases, where new installations use the containerd image store by default, and clarified that Docker's btrfs storage driver is optional and generally not required just because the host root filesystem is btrfs.
- The DNS section claimed Arch uses `systemd-resolved` by default and that Docker containers cannot use `127.0.0.53`. Updated it to explain that some Arch installations use `systemd-resolved`, Docker normally handles the sole `127.0.0.53` case, and explicit DNS configuration is only needed when container DNS resolution actually fails.
- The DNS `daemon.json` example could overwrite the earlier storage-driver configuration. Added a note to merge settings into the existing JSON object instead of replacing the file.
- The IP forwarding section implied users must always enable forwarding manually. Updated it to match Docker's current behavior: with the default iptables backend, Docker enables the relevant sysctl settings when the daemon starts, while manual checking remains useful when networking fails or when using the experimental nftables backend.
- The firewalld section suggested manually trusting `docker0` as the normal setup. Updated it to reflect Docker's current firewalld integration, which creates a `docker` zone and inserts bridge interfaces automatically when iptables integration is enabled.
- The summary repeated the overly broad recommendations to always enable IP forwarding, configure DNS, and set a storage driver. Updated it to recommend checking or changing these only when needed.

## Review Notes
The guide remains technically relevant and useful. Future improvements could add a security warning that membership in the `docker` group is root-equivalent, but the existing command is correct and current.
