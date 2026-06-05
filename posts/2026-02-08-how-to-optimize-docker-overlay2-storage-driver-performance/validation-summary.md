# Validation Summary: How to Optimize Docker Overlay2 Storage Driver Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker overlay2 storage driver
- Linux OverlayFS
- ext4
- xfs
- Docker volumes
- Docker Compose
- tmpfs
- systemd timers
- Linux filesystem mount options

## Sources Consulted
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Docker Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs: docker system prune reference - https://docs.docker.com/reference/cli/docker/system/prune/
- Linux Kernel Documentation: OverlayFS - https://docs.kernel.org/filesystems/overlayfs.html
- Linux mount(8) manual page - https://man7.org/linux/man-pages/man8/mount.8.html
- Local Docker CLI help for `docker image prune`, `docker container prune`, `docker builder prune`, and `docker system prune`
- Local `tune2fs(8)` manual page for ext4 feature names

## Issues Found
- The post stated that xfs performs better for most Docker workloads. Docker documents ext4 and xfs as supported backing filesystems but does not make that blanket performance claim, so the wording was softened to describe xfs as a strong production choice, especially for project quotas.
- The ext4 d_type verification example checked `dir_index`, which is a hashed-directory feature, not the ext4 feature that stores file type information in directory entries. Changed the check to `filetype`.
- The `noatime` explanation said every read without it causes a metadata write. Modern Linux defaults to `relatime`, which reduces access-time writes, so the explanation now distinguishes `relatime` from `noatime`.
- The `nodiratime` explanation implied it was independent from `noatime`. The Linux mount documentation says `noatime` implies `nodiratime`, so the text now calls that out.
- The overlay2 size quota section used only `prjquota`. Docker's container run reference names `pquota` as the requirement for overlay2 size limits on xfs, and xfs supports `pquota`/`prjquota` aliases, so the example now uses `pquota` and mentions both names.
- The inode section said running out of inodes crashes Docker. That overstates the behavior, so it now says inode exhaustion can prevent Docker and containers from creating files.
- The XFS inode-formatting example said to create the filesystem with more inodes. XFS allocates inodes dynamically, so the wording now says `maxpct` allows a larger percentage of the filesystem to be used for inodes.
- The `docker system prune -a -f` comment said it removes volumes. Docker does not prune volumes by default; `--volumes` is required. Updated the comment and added a separate command for pruning anonymous unused volumes.

## Review Notes
Docker Engine 29.0 and later uses the containerd image store by default, and Docker's docs describe the `overlay2` driver as a legacy storage driver superseded by the `overlayfs` containerd snapshotter in that mode. The post is still useful for hosts using Docker's classic storage drivers, but that version-specific caveat may be worth adding in a future broader update.
