# Validation Summary: How to Install Docker on Raspberry Pi OS (64-bit)

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker Compose
- Raspberry Pi OS 64-bit
- Debian Bookworm / ARM64
- systemd
- Docker daemon configuration
- Docker image manifests
- Docker container resource limits

## Sources Consulted
- Docker Docs: Install Docker Engine on Raspberry Pi OS (32-bit / armhf), including the note that 64-bit Raspberry Pi OS should use Debian `arm64` packages: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Docs: Install Docker Engine, supported platform matrix: https://docs.docker.com/engine/install/
- Docker Docs: Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall
- Docker Docs: Install the Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/
- Docker Docs: Docker daemon configuration overview and `data-root`: https://docs.docker.com/engine/daemon/
- Docker Docs: `dockerd` reference, `daemon.json`, `log-driver`, `storage-driver`, and `data-root`: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Resource constraints and memory flags for containers: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Prune unused Docker objects: https://docs.docker.com/engine/manage-resources/pruning/
- Docker convenience script source from https://get.docker.com
- Local Docker CLI help for `docker run`, `docker info`, and `docker manifest inspect`

## Issues Found
- The post called the Docker convenience script the recommended method for Raspberry Pi. Docker's current documentation says 64-bit Raspberry Pi OS should use Debian `arm64` packages and describes the convenience script as useful for development or test systems, not production. Updated the wording to match Docker's guidance.
- The package list installed by the convenience script omitted `docker-buildx-plugin` and `docker-compose-plugin`, while the post later relies on `docker compose`. Updated the package list to include both plugins.
- The ARM64 compatibility section said a `linux/amd64`-only image will not run on the Pi. That is only true natively by default; emulation can be configured separately. Updated the wording to say it will not run natively by default.
- The daemon configuration paragraph said it set default resource limits, but the JSON snippet configures logging and the storage driver only. Updated the wording to describe conservative logging defaults.
- The Docker data directory migration section did not mention current Docker Engine behavior where fresh Docker Engine 29+ installations may store image contents and container snapshots under containerd's root, which is not moved by Docker's `data-root`. Added a caveat after the verification command.
- The troubleshooting section recommended deleting `/var/lib/docker/containers/*` directly. Docker documentation warns that Docker manages its data directory, and direct manipulation is not a supported cleanup method. Replaced it with `docker container prune` for use after Docker is running again.

## Review Notes
- The convenience-script workflow is acceptable for a lightweight Raspberry Pi tutorial after the development/test caveat, but Docker's apt repository method is still preferable for production systems.
- The SSD migration example assumes `/dev/sda1` is stable. A future improvement would be to use a filesystem UUID in `/etc/fstab` so device renumbering does not break the mount.
