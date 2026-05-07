# Validation Summary: How to Fix 'overlay: mount failed' Errors in Podman

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Linux OverlayFS
- containers/storage storage drivers
- rootless containers and user namespaces
- fuse-overlayfs
- SELinux
- XFS filesystem features

## Sources Consulted
- Podman `podman(1)` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-system-reset(1)` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- `containers-storage.conf(5)` documentation: https://manpages.debian.org/testing/containers-storage/containers-storage.conf.5.en.html
- Linux kernel OverlayFS documentation: https://www.kernel.org/doc/html/latest/filesystems/overlayfs.html
- Red Hat guidance on Podman storage SELinux labels: https://access.redhat.com/solutions/7021610
- Red Hat blog on rootless Podman native overlay support: https://www.redhat.com/en/blog/podman-rootless-overlay
- Docker OverlayFS storage driver documentation for XFS `d_type`/`ftype=1` backing filesystem behavior: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/

## Issues Found
- The post described Podman's overlay storage driver as "also called overlay2." In Podman and `containers-storage.conf`, the driver is named `overlay`; `overlay2` is Docker terminology. Updated the wording to avoid conflating the two names.
- The SELinux fix recommended `container_use_cephfs` as a general remedy. That boolean is only relevant to CephFS-backed storage and is not a generic fix for overlay mount denials. Replaced it with the documented `semanage fcontext` and `restorecon` approach for relabeling moved Podman storage paths.
- The `podman system reset` warning understated what is removed. Current Podman documentation says reset removes pods, containers, images, networks, volumes, machines, and configured graphRoot/runRoot directories. Updated the warning.
- The rootless driver-change guidance said to reset storage after changing the configuration. Podman documents that `podman system reset` must be run before changing storage driver fields because it reads the current configuration to clean up existing storage. Updated that instruction.

## Review Notes
Podman was not installed in the local environment, so CLI checks were performed against official Podman man pages rather than local `--help` output. The remaining commands and configuration snippets are technically plausible, but some are distribution- and version-dependent, especially SELinux troubleshooting details, rootless overlay behavior, and package names.
