# Validation Summary: How to Fix 'no space left on device' Errors in Podman

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Linux filesystems and inode usage
- containers/storage `storage.conf`
- containers/common `containers.conf`
- OverlayFS and fuse-overlayfs
- XFS project quotas
- Podman pruning and storage inspection commands

## Sources Consulted
- Podman `podman-system-prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman-image-prune` documentation: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- Podman `podman-system-df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman-info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-system-reset` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- containers/storage `storage.conf` upstream documentation: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md
- containers/common `containers.conf` man page: https://manpages.debian.org/testing/golang-github-containers-common/containers.conf.5.en.html

## Issues Found
- The build cache cleanup command used `podman image prune -f` while describing build cache cleanup. Current Podman documents `--build-cache` for persistent build cache created by `--mount=type=cache`, so the command was changed to `podman image prune -f --build-cache`.
- The storage driver section instructed readers to run `podman system reset` after editing the storage configuration. Current Podman documentation says reset should be run before changing storage-related fields so Podman removes the currently configured storage. The section was updated to reset first, then edit configuration if needed.
- The storage location section also reset after changing `graphroot` and `runroot`, which can cause Podman to look at the new configuration when cleaning storage. The section was updated to reset before changing paths when starting with empty storage, then verify the new graph root with `podman info`.

## Review Notes
Podman was not installed in the local workspace, so CLI behavior was verified against official Podman and upstream containers configuration documentation rather than local `--help` output.
