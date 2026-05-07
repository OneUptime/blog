# Validation Summary: How to Configure storage.conf for Podman

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers/storage
- containers-storage.conf / storage.conf
- Linux container storage drivers
- Overlay storage and fuse-overlayfs

## Sources Consulted
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman system` documentation: https://docs.podman.io/en/latest/markdown/podman-system.1.html
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman system check` documentation: https://docs.podman.io/en/stable/markdown/podman-system-check.1.html
- Podman `podman system reset` documentation: https://docs.podman.io/en/latest/markdown/podman-system-reset.1.html
- Podman `podman image prune` documentation: https://docs.podman.io/en/latest/markdown/podman-image-prune.1.html
- containers/storage `containers-storage.conf(5)` documentation: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md

## Issues Found
- The "Check which drivers are available" comment was inaccurate because `podman info --format '{{.Store.GraphDriverName}}'` reports the active storage driver, not all available drivers. Changed it to "Check the active storage driver."
- The summary stated that all changes require `podman system reset` to take effect. Official Podman documentation specifically requires reset before changing the storage driver and warns that reset removes storage data. Changed the sentence to say changing the storage driver requires clearing existing storage with `podman system reset`.

## Review Notes
The commands and configuration snippets otherwise align with current Podman and containers/storage documentation. `podman system check` is documented in current Podman releases, but it was added in April 2024, so older installations may not include it.
