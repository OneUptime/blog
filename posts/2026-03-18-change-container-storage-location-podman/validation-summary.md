# Validation Summary: How to Change Container Storage Location in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers/storage
- containers-storage.conf
- Linux filesystems and permissions
- SELinux labeling

## Sources Consulted
- Podman `podman info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman system reset` official documentation: https://docs.podman.io/en/v4.8.3/markdown/podman-system-reset.1.html
- containers/storage `containers-storage.conf(5)` upstream documentation: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- `containers-storage.conf(5)` rendered man page: https://www.mankier.com/5/containers-storage.conf

## Issues Found
- The guide configured `storage.conf` before running `podman system reset`. Podman's documentation notes that `podman system reset` reads the current configuration and may not clean up the previous storage if configuration is changed first. I updated the reset instructions and root storage example to reset before changing `storage.conf`.
- The guide moved `graphroot` without mentioning SELinux relabeling. The containers-storage documentation requires matching labels when moving graphroot on SELinux systems. I added rootless and root SELinux labeling commands to the storage preparation section.
- The symbolic link alternative ran `podman system reset --force` before the optional copy step, which would delete the current storage before it could be copied. I removed that reset from the symlink flow and changed the commands to copy the current storage while Podman is stopped, then move the old directory aside before creating the symlink.

## Review Notes
The local environment did not have `podman` installed, so CLI verification was performed against official Podman documentation rather than local `--help` output. The guide remains version-neutral; behavior can vary by distribution defaults, storage driver support, filesystem type, and whether rootless overlay requires `fuse-overlayfs`.
