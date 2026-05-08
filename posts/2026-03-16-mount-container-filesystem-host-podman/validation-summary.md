# Validation Summary: How to Mount a Container's Filesystem to the Host in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Linux containers
- Container filesystems
- Linux shell commands

## Sources Consulted
- Podman official documentation: podman-mount, https://docs.podman.io/en/latest/markdown/podman-mount.1.html
- Podman official documentation: podman-unmount, https://docs.podman.io/en/latest/markdown/podman-unmount.1.html
- Podman official documentation: podman-unshare, https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html

## Issues Found
- The post used `podman mount --notruncate`, but the documented current option is `--no-trunc`. Changed the example to `sudo podman mount --no-trunc`.
- The introduction described `podman mount` as exposing "all" files or the "entire filesystem". Podman's documentation defines this command as mounting a container's root filesystem, so those phrases were narrowed to "root filesystem" to avoid implying runtime mounts such as procfs, sysfs, or other mount namespace contents are included.

## Review Notes
The rootless access guidance is consistent with Podman's documentation: rootless `podman mount` requires running inside a `podman unshare` session unless using the VFS storage driver. The `podman unmount` cleanup examples are also consistent with the documented command syntax.
