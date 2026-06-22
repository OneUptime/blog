# Validation Summary: How to Mount and Automount External Drives on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux block device tooling (`lsblk`, `blkid`, `fdisk`, `dmesg`)
- `mount` / `umount` and mount options
- `/etc/fstab` configuration
- Filesystems: ext4, XFS, NTFS (ntfs-3g), exFAT
- systemd `.mount` and `.automount` units
- Network filesystems: NFS (`nfs-common`) and CIFS/SMB (`cifs-utils`)
- Filesystem formatting and checking (`mkfs.ext4`, `mkfs.xfs`, `gdisk`, `fsck.ext4`, `xfs_repair`, `ntfsfix`)
- Monitoring tools (`df`, `iostat`, `iotop`)

## Sources Consulted
- mount(8) man page — https://man7.org/linux/man-pages/man8/mount.8.html
- umount(8) man page — https://man7.org/linux/man-pages/man8/umount.8.html
- fstab(5) man page — https://man7.org/linux/man-pages/man5/fstab.5.html
- systemd.mount(5) — https://www.freedesktop.org/software/systemd/man/systemd.mount.html
- systemd.automount(5) — https://www.freedesktop.org/software/systemd/man/systemd.automount.html
- xfs_repair(8) man page — https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- xfs_scrub(8) man page — https://man7.org/linux/man-pages/man8/xfs_scrub.8.html
- Red Hat / Oracle Linux XFS check-and-repair documentation

## Issues Found
- **Incorrect claim that XFS can be checked while mounted with `xfs_repair -n`.** The post's "Check XFS Filesystem" section had the comment "XFS can be checked while mounted (read-only check)" followed by `sudo xfs_repair -n /dev/sdb1`. This is wrong: `xfs_repair` — including the `-n` dry-run mode — requires the filesystem to be **unmounted**; it refuses to run against a mounted device. Online (mounted) checks must use `xfs_scrub`. I corrected the comment, moved the `umount` before the dry-run check so the example is valid, and added the `xfs_scrub /mnt/data` command as the proper way to check a mounted XFS filesystem.

## Review Notes
- The `uid=`/`gid=`/`umask=` mount options shown for the generic `mount -o uid=1000,gid=1000 /dev/sdb1` example and in the remount troubleshooting step only apply to filesystems that support them (FAT, NTFS, exFAT). They are silently ignored/rejected on ext4 — the post does correctly note that for ext4 you should `chown` instead, so this is consistent overall, but readers should not expect uid/gid options to work on native Linux filesystems.
- `mount -t ntfs-3g` and the `ntfs-3g` fstab type remain valid; note that modern kernels (5.15+) also ship the in-kernel `ntfs3` driver as an alternative. Not an error.
- `exfat-fuse` plus `exfatprogs` is slightly redundant on current Ubuntu (kernel exFAT driver + `exfatprogs` is sufficient for mounting and formatting), but installing both is harmless.
- `umount -f` is primarily effective for unreachable network (NFS) mounts; for a busy local mount the lazy unmount (`-l`) is usually what helps. The post shows both, so this is acceptable.
- All other commands, fstab entries, systemd unit examples, and the `defaults` option expansion were verified as accurate.
