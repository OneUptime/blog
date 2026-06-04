# Validation Summary: How to Understand Docker UnionFS and Overlay2

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker storage drivers
- Overlay2
- OverlayFS
- Dockerfile image layers
- Linux filesystems

## Sources Consulted
- Docker Docs: OverlayFS storage driver, https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Select a storage driver, https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: Storage drivers, https://docs.docker.com/engine/storage/drivers/
- Docker Docs: containerd image store with Docker Engine, https://docs.docker.com/engine/storage/containerd/
- Docker Docs: Building best practices, https://docs.docker.com/build/building/best-practices/
- Linux kernel documentation: Overlay Filesystem, https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html
- Local Docker CLI help for `docker history`, `docker inspect`, and `docker system prune`.

## Issues Found
- The post described `overlay2` as the default and recommended Docker storage driver for modern Linux systems. Docker Engine 29.0 and later uses the containerd image store by default on fresh installations, with the `overlayfs` snapshotter superseding the legacy `overlay2` storage driver. Updated the wording to describe `overlay2` as the recommended classic storage driver and added the current Docker Engine 29.0 caveat.
- The post mentioned OverlayFS kernel availability but did not state Docker's documented `overlay2` prerequisites. Added Docker's kernel requirement: Linux kernel 4.0 or higher, or RHEL/CentOS kernel 3.10.0-514 or higher.
- The post broadly said each Dockerfile instruction creates a layer. Refined this to filesystem-changing instructions such as `RUN`, `COPY`, and `ADD`.
- The `/etc/docker/daemon.json` example was marked as JSON but contained comments, which makes it invalid JSON. Removed the comments and the outdated `overlay2.override_kernel_check=true` storage option, leaving Docker's documented `storage-driver` configuration.
- The copy-on-write example said the `docker inspect` command checked layer size, but it prints the upperdir path. Corrected the comment.
- The whiteout section described only character-device whiteouts and used `.wh..wh..opq` for directory deletions. Updated it to include the current kernel-documented extended-attribute whiteout form and the `trusted.overlay.opaque` directory marker.
- The on-disk `merged/` description said it is only present for running containers. Adjusted the wording to avoid implying it can never appear for other mounted overlay2 data directories.

## Review Notes
The commands and Dockerfile snippets are otherwise syntactically valid. The raw `/var/lib/docker` inspection examples are Linux-host specific and should not be expected to work on Docker Desktop, but the post already scopes that section to Linux hosts.
