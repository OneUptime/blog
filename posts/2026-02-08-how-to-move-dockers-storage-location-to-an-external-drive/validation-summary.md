# Validation Summary: How to Move Docker's Storage Location to an External Drive

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker daemon configuration
- containerd
- Linux filesystems and mounts
- systemd mount units
- Docker Desktop

## Sources Consulted
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker `docker system df` CLI reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker OverlayFS storage driver documentation: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- systemd mount unit documentation: https://www.freedesktop.org/software/systemd/man/256/systemd.mount.html
- Linux fstab manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- Local command help/man pages for `docker system df`, `docker info`, `rsync`, `mount`, and `systemctl`

## Issues Found
- The post stated that Docker stores all data in `/var/lib/docker` and that `data-root` moves all Docker data. Docker's current documentation notes that fresh Docker Engine 29.0 and later installations using the containerd image store keep image contents and container snapshots under `/var/lib/containerd`, and `data-root` does not move that data. I updated the explanation, disk-usage check, migration commands, cleanup commands, and summary to account for containerd-backed installations.
- The systemd "bind mount" example was not actually a bind mount; it mounted `/dev/sdb1` directly on `/var/lib/docker`. I changed the unit to bind mount `/mnt/external-docker/docker` onto `/var/lib/docker` with `Type=none` and `Options=bind`, and added `RequiresMountsFor=/mnt/external-docker/docker` so the source mount is required.

## Review Notes
- The daemon `data-root` configuration, `docker system df`, `docker info | grep "Docker Root Dir"`, `rsync -aP`, `/etc/fstab` UUID example, and Docker Desktop disk image location guidance match the consulted documentation.
- For XFS, Docker's `overlay2` driver requires `d_type=true` / `ftype=1`; the post correctly treats XFS as a good choice, but future improvements could mention verifying this before formatting or using an existing XFS filesystem.
