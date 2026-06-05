# Validation Summary: How to Change Docker's Default Data Directory to Another Disk

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker daemon configuration (`daemon.json`)
- containerd image store
- Linux filesystems and mounts
- rsync
- systemd
- SELinux
- LVM

## Sources Consulted
- Docker Docs: Docker daemon configuration overview, including `data-root`, default data directories, and Docker Engine 29.0 containerd image store behavior: https://docs.docker.com/engine/daemon/
- Docker Docs: OverlayFS storage driver prerequisites, `/var/lib/docker/overlay2` layout, XFS `ftype=1` requirement, and Docker-managed data warning: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: `dockerd` CLI reference for `--data-root`, `--log-driver`, and storage options: https://docs.docker.com/reference/cli/dockerd/
- Red Hat Documentation: SELinux `semanage fcontext` and `restorecon` workflow for non-standard service directories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Red Hat Documentation: container storage SELinux context guidance for non-default Docker storage directories: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux_atomic_host/7/pdf/managing_containers/red_hat_enterprise_linux_atomic_host-7-managing_containers-en-us.pdf
- Linux man-pages: `rsync(1)` options for archive mode, hard links, ACLs, xattrs, numeric IDs, and progress: https://www.man7.org/linux/man-pages/man1/rsync.1.html
- Linux man-pages: `mount(8)` syntax for block-device mounts, bind mounts, `fstab`, and `mount -a`: https://man7.org/linux/man-pages/man8/mount.8.html
- Local command help: `docker --help`, `dockerd --help`, `rsync --help`, and `systemctl --help`.

## Issues Found
- The post stated that Docker stores everything under `/var/lib/docker` by default. Docker's current documentation notes that fresh Docker Engine 29.0+ installations using the containerd image store keep image contents and container snapshots under `/var/lib/containerd`. Updated the introduction and data-layout section, and added a `data-root` caveat explaining that containerd storage must be configured and migrated separately.
- The `rsync -aP` command was described as preserving everything. `rsync` archive mode does not preserve hard links, ACLs, or extended attributes. Updated migration commands to use `rsync -aHAX --numeric-ids --info=progress2` and corrected the explanation of the flags.
- Method 2 was labeled as a bind mount, but the commands mount a block device directly at `/var/lib/docker`. Renamed the method and summary wording to match the actual operation.
- Method 2 moved `/var/lib/docker` away and then attempted to mount on `/var/lib/docker` without recreating the mount point. Added `sudo mkdir -p /var/lib/docker` before the mount and moved the data copy after the mount so the data lands on the new filesystem.
- The troubleshooting section recommended `sudo chown -R root:root /mnt/docker-data`. Recursively changing ownership can corrupt ownership inside Docker volumes and copied layer data. Changed it to set ownership only on the top-level Docker data directory.
- The SELinux section first ran `restorecon` before adding a new file-context rule and then assigned a single `container_var_lib_t` label to the whole tree. Updated it to map the new path to `/var/lib/docker` labels with `semanage fcontext -a -e /var/lib/docker /mnt/docker-data`, then run `restorecon`.
- The filesystem table recommended XFS without mentioning Docker's `overlay2` XFS prerequisite. Added the `ftype=1` requirement.

## Review Notes
The guide is accurate for classic Docker Engine storage after these fixes. For Docker Engine 29.0+ installations using the containerd image store, the post now warns that `/var/lib/containerd` needs separate handling, but a future expanded version could include a complete containerd migration walkthrough.
