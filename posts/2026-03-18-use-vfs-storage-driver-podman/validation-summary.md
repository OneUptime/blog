# Validation Summary: How to Use VFS Storage Driver with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- containers/storage `storage.conf`
- Podman storage drivers (`vfs`, `overlay`)
- Linux rootless container storage
- SELinux labeling for custom Podman storage paths

## Sources Consulted
- Podman `podman system reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman save` documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-save.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- containers/storage `containers-storage.conf(5)`: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- containers/storage VFS driver implementation: https://github.com/containers/storage/blob/main/drivers/vfs/driver.go
- Podman troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md

## Issues Found
- The post claimed VFS works on any filesystem and recommended NFS-backed Podman storage. I corrected this because Podman documents NFS-backed container storage as unsupported and updated the section to keep `graphroot` on a local filesystem instead.
- The post changed `storage.conf` before running `podman system reset`. I reversed that order because Podman documents `podman system reset` as something that must be run before changing storage driver or related storage paths.
- The VFS layout example inspected `$GRAPH_ROOT/vfs/`, but the VFS driver stores layer directories under `$GRAPH_ROOT/vfs/dir/`. I corrected the example and clarified the copy-based behavior.
- The nested-container section stated that inner Podman cannot use overlay on overlay. I softened this to match upstream guidance: nested Podman often falls back to `fuse-overlayfs`, and VFS is a fallback when overlay is unavailable or too slow.
- The migration example used `podman save` with multiple image IDs but omitted `--multi-image-archive`. I fixed the command and removed an unnecessary overlay `mountopt` setting that was not required by upstream docs.
- The summary repeated unsupported claims about NFS, ecryptfs, and “any filesystem.” I updated it to reflect the documented fallback role of VFS more accurately.

## Review Notes
- The examples are written for rootless Podman because they use `~/.config/containers/storage.conf`; rootful setups would normally use the system storage configuration instead.
- Changing `graphroot` to a new path can require SELinux relabeling on SELinux-enabled systems, which is now noted in the post.
- `podman system reset` is destructive and removes local containers, images, networks, and volumes, so readers should preserve anything they need before running it.
