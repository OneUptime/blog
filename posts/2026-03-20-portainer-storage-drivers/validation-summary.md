# Validation Summary: How to Configure Portainer for Different Container Storage Drivers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker storage drivers (`overlay2`, `fuse-overlayfs`, `btrfs`, `zfs`, `vfs`)
- Docker `containerd` image store
- Linux filesystems (`xfs`, Btrfs, ZFS)

## Sources Consulted
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Deprecated features - https://docs.docker.com/engine/deprecated/
- Docker Docs: BTRFS storage driver - https://docs.docker.com/engine/storage/drivers/btrfs-driver/
- Docker Docs: ZFS storage driver - https://docs.docker.com/engine/storage/drivers/zfs-driver/
- Docker Docs: containerd image store - https://docs.docker.com/engine/storage/containerd/
- Docker Docs: Rootless mode troubleshooting - https://docs.docker.com/engine/security/rootless/troubleshoot/
- Docker Docs: `docker system info` - https://docs.docker.com/reference/cli/docker/system/info/
- Docker Docs: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs: `docker system prune` - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: `docker container export` - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Docs: `docker image save` - https://docs.docker.com/reference/cli/docker/image/save/
- Portainer Docs: Host details - https://docs.portainer.io/user/docker/host/details

## Issues Found
- The post treated classic Docker storage drivers as the current default for modern Docker installs. I added a note that fresh Docker Engine 29.0 and later installations use the `containerd` image store by default, so the guide is now scoped correctly.
- The supported-drivers table included `devicemapper`, which Docker deprecated in v18.09, disabled by default in v23.0, and removed in v25.0. I removed it from the supported list and replaced the configuration section with a migration warning.
- The support matrix was too broad and partially inaccurate. I updated the requirements for `overlay2`, `fuse-overlayfs`, `btrfs`, `zfs`, and `vfs` to match current Docker documentation.
- The Portainer navigation path was outdated. I corrected it to `Host > Details` and updated the monitoring section to reflect the engine details Portainer actually exposes there.
- The `overlay2` prerequisites were incomplete. I changed the checks to target Docker's data-root backing filesystem and added the required `xfs ftype=1` validation.
- The ZFS example did not follow Docker's documented mount flow. I updated it to create the pool with `-m /var/lib/docker`.
- The migration section used `docker export` in a way that could imply it preserves full container data. I corrected this by clarifying that `docker export` does not include volume data and that volumes must be backed up separately.

## Review Notes
- The guide is accurate for Linux hosts using classic Docker storage drivers. It does not apply to Docker Desktop, and fresh Docker Engine 29.0+ installs use the `containerd` image store unless configured otherwise.
- `fuse-overlayfs` is primarily relevant for rootless Docker on hosts where rootless `overlay2` is unavailable.
