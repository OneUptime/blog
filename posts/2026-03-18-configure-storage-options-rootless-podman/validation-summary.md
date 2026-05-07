# Validation Summary: How to Configure Storage Options for Rootless Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman rootless containers
- containers/storage
- `storage.conf`
- Linux subordinate UID/GID mappings
- OverlayFS and fuse-overlayfs
- Podman storage cleanup commands

## Sources Consulted
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Podman command reference: https://docs.podman.io/en/stable/markdown/podman.1.html
- Podman info command reference: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- Podman system migrate command reference: https://docs.podman.io/en/v3.2.2/markdown/podman-system-migrate.1.html
- Podman system reset command reference: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman system df command reference: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- containers/storage `storage.conf` reference: https://raw.githubusercontent.com/containers/storage/main/docs/containers-storage.conf.5.md

## Issues Found
- The post recommended `ignore_chown_errors = "true"` as a general rootless overlay setting. The containers/storage documentation describes this option for single-UID rootless environments and notes that it squashes image UIDs/GIDs, removing UID/GID separation inside the image. I changed the general examples to leave it commented out and limited the active example to single-UID environments.
- The post said 65536 subordinate IDs were required. Podman documentation commonly uses 65536 as the standard range and recommends it for compatibility, but the stricter wording was too absolute. I changed the note to describe 65536 as the common recommended range for broad image compatibility.
- The storage relocation example created `NEW_PATH="/fast-ssd/$(whoami)/containers/storage"` but configured `graphroot = "/fast-ssd/containers/storage"`. I changed the example to use the same `NEW_PATH`.
- The storage relocation example ran `podman system reset --force` after changing `storage.conf`. Podman's reset documentation warns that reset reads the current configuration and may not clean up previous storage if configuration is changed first. I moved the reset before writing the new storage configuration.

## Review Notes
Podman was not installed in the local review environment, so command behavior was verified against upstream Podman and containers/storage documentation rather than local `--help` output. The `metacopy=on` mount option is retained with a compatibility caveat because support depends on the overlay implementation and kernel/fuse-overlayfs environment.
