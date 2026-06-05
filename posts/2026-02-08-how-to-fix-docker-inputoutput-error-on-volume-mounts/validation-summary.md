# Validation Summary: How to Fix Docker 'Input/Output Error' on Volume Mounts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker volumes and bind mounts
- Docker Compose
- Linux filesystems and fsck
- NFS mounts
- SELinux
- GNU/Linux disk and inode utilities

## Sources Consulted
- Docker Docs: Bind mounts and SELinux labels, https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Storage drivers, https://docs.docker.com/engine/storage/drivers/
- Docker Docs: Select a storage driver, https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: Containerd image store, https://docs.docker.com/engine/storage/containerd/
- Docker Docs: Device Mapper storage driver deprecation/removal, https://docs.docker.com/engine/storage/drivers/device-mapper-driver/
- Docker Docs: Compose volumes reference, https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Prune unused Docker objects, https://docs.docker.com/engine/manage-resources/pruning/
- Linux man-pages: fsck(8), https://www.man7.org/linux/man-pages/man8/fsck.8.html
- Linux man-pages: nfs(5), https://www.man7.org/linux/man-pages/man5/nfs.5.html
- systemd manual: systemd-fsck@.service kernel command line options, https://man.archlinux.org/man/core/systemd/systemd-fsck.8.en
- GNU Coreutils manual for df inode reporting, https://www.gnu.org/software/coreutils/manual/coreutils.html
- Local CLI/man-page checks: Docker 29.4.2 `docker --help`, `docker system prune --help`, `docker volume prune --help`, `df --help`, `find --help`, and local fsck man page output.

## Issues Found
- The post recommended `sudo touch /forcefsck` to schedule a filesystem check. This is outdated on systemd-based systems, so it was replaced with the current `fsck.mode=force fsck.repair=yes` kernel-parameter guidance.
- The post broadly recommended NFS `soft` mounts for production. Linux NFS documentation treats `soft` as an option that can return errors to applications after retransmission limits, so the text now limits this advice to non-critical or read-mostly data and warns that critical writes should usually keep hard-mount behavior unless the application safely handles interrupted operations.
- The Compose snippet included the obsolete top-level `version: "3.8"` field. It was removed so the example matches the current Compose Specification style.
- The storage-driver section listed `devicemapper` as a current Docker storage driver and described `overlay2` as the default on most systems. Docker Engine 25 removed `devicemapper`, and Docker Engine 29 fresh installs use the containerd image store by default. The section now refers to the storage layer, classic drivers, and containerd snapshotters accurately.
- The quick reference and conclusion repeated the overly broad NFS `soft` recommendation. These were updated to advise reviewing NFS timeout behavior instead of universally switching production mounts to `soft`.

## Review Notes
The remaining commands and snippets are generally valid for Linux Docker hosts. Some examples are intentionally destructive, such as `docker system prune -a --volumes` and `docker volume prune -f`, but the post already presents them as cleanup or high-caution operations.
