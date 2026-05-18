# Validation Summary: How to Set Up OverlayFS on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- OverlayFS (Linux union filesystem)
- Linux kernel modules (modinfo, modprobe, lsmod)
- mount / umount utilities
- /etc/fstab persistent mounts
- Docker overlay2 storage driver
- nginx (used as an example workload)

## Sources Consulted
- Linux kernel OverlayFS documentation: https://www.kernel.org/doc/Documentation/filesystems/overlayfs.txt
- mount(8) man page (overlay filesystem options)
- umount(8) man page (`-l` lazy, `-f` force)
- Docker storage driver documentation: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Ubuntu kernel config (CONFIG_OVERLAY_FS option in /boot/config-*)

## Issues Found
No technical issues found.

Verified specifically:
- The claim "first listed = highest priority" for `lowerdir=A:B:C` matches the kernel docs (leftmost is the topmost lower layer, rightmost is the bottommost).
- The multi-layer worked example is internally consistent: `shared.txt` exists in both `layer1` and `layer2`; with the mount order `layer3:layer2:layer1`, `layer2` is above `layer1`, so `cat` correctly returns "overridden in layer2".
- Whiteout description (character device with 0/0 major:minor) matches the kernel implementation.
- The constraint that `workdir` must be on the same filesystem as `upperdir` is correct.
- `modinfo`, `modprobe`, `lsmod`, and the `CONFIG_OVERLAY_FS` config check are all valid.
- Mount syntax (`mount -t overlay overlay -o lowerdir=...,upperdir=...,workdir=... target`) matches official usage.
- Docker overlay2 storage path (`/var/lib/docker/overlay2/`) and the `GraphDriver`/`Data` fields in `docker inspect` output are accurate.
- The fstab line syntax (`overlay <mountpoint> overlay <options> 0 0`) is valid.

## Review Notes
- `umount -f` is primarily intended for unreachable NFS mounts; for a busy overlay mount, `umount -l` (lazy) is the practical option. The post mentions both, which is fine, but `-f` rarely changes behavior for local overlay mounts.
- The persistent fstab example uses a single lower directory. If a user wants multiple lower directories in fstab, they should be aware that the `:` separator inside the options field is valid but the entire options field must remain a single comma-separated token (no whitespace).
- The post does not mention the `index=on`, `metacopy=on`, `redirect_dir=on`, or `userxattr` mount options that are relevant in some container/rootless scenarios — not an error, just out of scope for an introductory guide.
- The Docker section assumes the overlay2 storage driver is in use (it is the default on modern Ubuntu installs). On systems configured with a different driver (e.g., `fuse-overlayfs` in rootless mode), `/var/lib/docker/overlay2/` may not exist.
