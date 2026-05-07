# Validation Summary: How to Configure Storage Driver for Podman

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Podman
- containers/storage
- Linux container storage drivers
- OverlayFS and fuse-overlayfs
- VFS, Btrfs, and ZFS storage
- TOML-based `storage.conf` configuration

## Sources Consulted
- Podman `podman-info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-system-reset` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman-save` official documentation: https://docs.podman.io/en/latest/markdown/podman-save.1.html
- `containers-storage.conf` manual page: https://www.mankier.com/5/containers-storage.conf

## Issues Found
- `fuse-overlayfs` was listed and ranked as if it were a separate Podman storage driver. I changed the wording to clarify that `fuse-overlayfs` is a mount program used with the `overlay` driver, matching the `containers-storage.conf` documentation.
- The driver-specific configuration examples sometimes changed `storage.conf` before running `podman system reset --force`, or implied that reset should happen after the driver change. I moved the reset command before the configuration change in those examples because Podman's official reset documentation says reset must be run before changing the `driver` field and reads the current configuration to clean up existing storage.
- The multi-image backup example used `podman save -o /tmp/saved-images.tar alpine nginx` without enabling multi-image archive mode. I added `--multi-image-archive`, which is required when saving more than one image to a Docker archive unless the default has been changed in `containers.conf`.

## Review Notes
The local environment did not have `podman` installed, so CLI behavior was validated against official Podman documentation rather than local `--help` output. The post mentions ZFS as a supported driver but does not include a dedicated ZFS configuration section; this is a coverage gap rather than a technical correctness issue.
