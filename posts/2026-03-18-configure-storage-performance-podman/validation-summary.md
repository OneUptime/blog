# Validation Summary: How to Configure Storage Performance for Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- containers/storage and storage.conf
- containers.conf
- OverlayFS and fuse-overlayfs
- XFS and ext4
- Linux tmpfs, bind mounts, and I/O controls

## Sources Consulted
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-volume-create(1)` documentation: https://docs.podman.io/en/v5.5.0/markdown/podman-volume-create.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-system-prune(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman-system-reset(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- containers/storage `containers-storage.conf(5)` documentation: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md
- containers/common `containers.conf(5)` documentation: https://raw.githubusercontent.com/containers/common/main/docs/containers.conf.5.md
- Red Hat rootless overlay support note: https://www.redhat.com/en/blog/podman-rootless-overlay

## Issues Found
- The storage driver table listed `fuse-overlayfs` as a separate storage driver. Podman uses the `overlay` driver with `fuse-overlayfs` configured as the overlay mount program, so the table now says `overlay with fuse-overlayfs`.
- The `mount_program = ""` comments incorrectly described native overlay diff behavior. The comments now describe using the kernel overlay mount implementation when supported.
- The `force_mask = "shared"` example was described as forcing native overlay and skipping fuse-overlayfs. `force_mask` is an experimental permission masking option that requires a mount program, so the misleading example was removed.
- The rootless overlay notes said kernel 5.11+ was enough. The post now recommends 5.13+ because kernel 5.11 added rootless overlay support but the SELinux-related fix landed later.
- The tmpfs named volume example omitted `--opt device=tmpfs`. The command now matches the official `podman volume create` tmpfs pattern.
- The `containers.conf` cleanup example used invalid or misleading keys: `auto_remove` is not a current `containers.conf` engine key, and `image_pull_policy` is not the documented key. The section now uses the documented `pull_policy = "missing"` setting and describes image pull behavior rather than garbage collection.

## Review Notes
Podman was not installed in the local workspace, so command verification was performed against official Podman and containers project documentation instead of local `--help` output. The I/O limit flags are documented but may be unavailable or restricted for rootless users on some cgroup configurations.
