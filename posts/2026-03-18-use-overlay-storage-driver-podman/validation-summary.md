# Validation Summary: How to Use Overlay Storage Driver for Best Performance in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- OverlayFS
- fuse-overlayfs
- `containers-storage.conf` / `storage.conf`
- Rootless Linux containers
- XFS and ext4

## Sources Consulted
- Podman `podman(1)`: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `podman-system-reset(1)`: https://docs.podman.io/en/latest/markdown/podman-system-reset.1.html
- Podman `podman-info(1)`: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman-image-inspect(1)`: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman `podman-history(1)`: https://docs.podman.io/en/latest/markdown/podman-history.1.html
- Podman rootless documentation: https://github.com/containers/podman/blob/main/rootless.md
- containers/storage `containers-storage.conf(5)`: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- Linux kernel OverlayFS documentation: https://docs.kernel.org/filesystems/overlayfs.html
- Podman `podman-system-migrate(1)` source: https://raw.githubusercontent.com/containers/podman/main/docs/source/markdown/podman-system-migrate.1.md

## Issues Found
- The post stated that rootless native overlay requires kernel `5.11+`. Current Podman documentation says OverlayFS is not supported in rootless mode on kernels prior to `5.12.9`, and Podman rootless guidance also ties native rootless overlay to Podman `3.1+`. I updated the kernel/version guidance in the kernel, rootless, troubleshooting, and conclusion sections.
- The rootless `storage.conf` example incorrectly used `[storage.options] size = 65536` as a UID/GID mapping setting. In `containers-storage.conf(5)`, `size` is a storage quota option, not a subuid/subgid mapping size control. I removed that block.
- The rootless native-overlay example used `mount_program = ""`. Current storage docs define `mount_program` as a path to a custom mount helper; native overlay should be used by omitting the setting, not by setting it to an empty string. I changed the example and benchmark comments accordingly.
- The metacopy explanation said data copy is deferred until a file is read or written. Kernel OverlayFS documentation says metadata-only copy-up happens on operations like `chown`/`chmod`, and the data copy happens later when the file is opened for write. I corrected the explanation and the surrounding performance note.
- The metacopy section used `overlay.metacopy=Y` and an `echo "Y"` runtime example. Kernel docs document `metacopy=on/off`; I updated the persistent kernel parameter example to `overlay.metacopy=on` and removed the unsupported runtime toggle guidance.
- The mount option example combined `metacopy=on` with `redirect_dir=on`. Kernel OverlayFS documentation states `redirect_dir` conflicts with `metacopy=on` and results in an error. I separated those examples and noted the incompatibility.
- The `volatile` explanation said it disables `fsync` on the upper layer. Kernel docs describe it as `fsync=volatile`, omitting sync calls to the upper filesystem. I updated the wording to match the documented behavior.
- The `volatile` CLI example placed `--storage-opt` after `run`. Podman documents `--storage-opt` as a global option, so I moved it before the subcommand and provided the full overlay mount option string.
- The image inspection/history examples used less canonical argument ordering, and the `history` example relied on `table` formatting that is not documented in the history man page. I changed them to documented `--format` usage while preserving the intent.
- The post claimed native overlay is `2-3x` faster than `fuse-overlayfs` for I/O-heavy workloads. Podman documentation supports the qualitative claim that `fuse-overlayfs` is slower, but not that exact multiplier. I replaced it with a qualitative statement.
- The generic troubleshooting block recommended `podman system migrate` after `podman system reset` and a storage reconfiguration. That command is documented for migration tasks such as propagating updated subuid/subgid mappings, not for general storage-driver reconfiguration. I removed it from that block.

## Review Notes
- `podman system reset` is destructive and removes local container storage. The post already uses it in appropriate contexts, but readers should only run it when they can discard existing images, containers, and volumes.
- In rootless mode, Podman may auto-select `fuse-overlayfs` when available if a per-user `storage.conf` does not already exist. The updated post now reflects that nuance.
