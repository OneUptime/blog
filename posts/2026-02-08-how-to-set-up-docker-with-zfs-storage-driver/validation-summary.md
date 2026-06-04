# Validation Summary: How to Set Up Docker with ZFS Storage Driver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker ZFS storage driver
- OpenZFS / ZFS
- Linux systemd
- Ubuntu, Debian, Fedora, and RHEL-compatible distributions

## Sources Consulted
- Docker Docs: ZFS storage driver: https://docs.docker.com/engine/storage/drivers/zfs-driver/
- Docker Docs: Storage drivers: https://docs.docker.com/engine/storage/drivers/
- Docker Docs: Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Docker Docs: dockerd reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: containerd image store with Docker Engine: https://docs.docker.com/engine/storage/containerd/
- OpenZFS Documentation: Fedora installation: https://openzfs.github.io/openzfs-docs/Getting%20Started/Fedora/index.html
- OpenZFS Documentation: RHEL-based distributions: https://openzfs.github.io/openzfs-docs/Getting%20Started/RHEL-based%20distro/index.html
- OpenZFS Documentation: zfs-snapshot man page: https://openzfs.github.io/openzfs-docs/man/v2.2/8/zfs-snapshot.8.html
- OpenZFS Documentation: zfs-send man page: https://openzfs.github.io/openzfs-docs/man/v2.3/8/zfs-send.8.html
- OpenZFS Documentation: zfs-rollback man page: https://openzfs.github.io/openzfs-docs/man/v2.2/8/zfs-rollback.8.html
- OpenZFS Wiki: System Administration: https://openzfs.org/wiki/System_Administration

## Issues Found
- The Fedora/CentOS install command used an outdated Fedora `zfs-release` package URL and mixed Fedora and CentOS instructions. Updated the Fedora commands to match current OpenZFS Fedora documentation and added a note to use the Enterprise Linux repository package for RHEL/CentOS-compatible systems.
- The original flow mounted the ZFS dataset on `/var/lib/docker` before stopping Docker, backing up Docker data, and removing old storage-driver data. Docker's ZFS storage driver documentation requires stopping Docker, backing up/removing existing Docker data, then mounting the ZFS filesystem at `/var/lib/docker`. Changed the dataset creation to `mountpoint=none` and mounted it only after cleanup.
- The `/etc/docker/daemon.json` example contained JavaScript-style comments, which are invalid JSON. Removed the comments from the JSON block.
- Docker Engine 29.0 and later uses the containerd image store by default on fresh installations, while the ZFS guide configures a classic Docker storage driver. Added `containerd-snapshotter: false` to the daemon configuration and noted the classic storage-driver requirement.
- The container quota section said Docker does not expose per-container quotas directly. Docker's ZFS storage driver supports the `size` storage option for container writable-layer quotas. Added the supported `storage-opts` example while keeping the dataset quota example for total Docker storage.
- The text said `lsmod` should show specific modules such as `spl` and `zavl`. OpenZFS module names can vary by version and distribution, so the wording was generalized to related OpenZFS modules.
- The snapshot backup section used non-recursive `zfs snapshot` and `zfs send` commands while describing the whole Docker dataset. Docker creates descendant ZFS datasets for image and container layers, so the examples now use `zfs snapshot -r` and `zfs send -R`, and the rollback text now describes rolling back an individual dataset snapshot.

## Review Notes
- Docker's own ZFS storage driver documentation says the driver is not recommended for production use unless the operator has substantial ZFS on Linux experience. The post's production-oriented language is acceptable with that caveat in mind, but a future revision could make that warning more prominent.
