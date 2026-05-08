# Validation Summary: How to Run a Container from a Rootfs Directory in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux root filesystem directories
- Container images and container export
- BusyBox
- Bind mounts and SELinux volume labeling
- Overlay rootfs mounts
- Container environment variables, users, networking, and resource limits

## Sources Consulted
- Podman `run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `export` official documentation: https://docs.podman.io/en/v5.2.3/markdown/podman-export.1.html
- Podman `create` official documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-create.1.html
- Podman `rm` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-rm.1.html
- Docker Official Image packaging for BusyBox: https://github.com/docker-library/busybox

## Issues Found
- The volume mount example used `/tmp/shared-data` as a bind-mount source without creating it first. Current Podman documentation says host path sources for volume mounts must exist, otherwise Podman returns an error. Added `mkdir -p /tmp/shared-data` before the `podman run -v /tmp/shared-data:/data:z` command.

## Review Notes
The `--rootfs` usage and `:O` overlay modifier match Podman's documented behavior. The commands rely on the selected rootfs containing the referenced tools, such as `/bin/sh`, `/etc/os-release`, `wget`, `id`, and `ldd`; the post already handles `wget` and `ldd` absence gracefully in the relevant examples. On SELinux systems, the rootfs itself may need an appropriate container label, as noted in the Podman documentation.
