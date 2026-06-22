# Validation Summary: How to Handle File System Checks with fsck

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux fsck
- ext2/ext3/ext4 and e2fsck
- XFS, fsck.xfs, xfs_repair, and xfs_scrub
- Btrfs check and scrub
- /etc/fstab fs_passno configuration
- tune2fs and mke2fs
- Shell scripting for filesystem monitoring

## Sources Consulted
- Local `fsck(8)` manual page from util-linux.
- Local `e2fsck(8)` manual page from e2fsprogs.
- Linux man-pages: `xfs_repair(8)` - https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- Linux man-pages: `xfs_scrub(8)` - https://man7.org/linux/man-pages/man8/xfs_scrub.8.html
- Linux man-pages: `btrfs-check(8)` - https://man7.org/linux/man-pages/man8/btrfs-check.8.html
- systemd `systemd-fsck@.service` documentation - https://www.freedesktop.org/software/systemd/man/latest/systemd-fsck@.service.html
- Linux man-pages: `fstab(5)` - https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux man-pages: `tune2fs(8)` - https://man7.org/linux/man-pages/man8/tune2fs.8.html
- Linux man-pages: `mke2fs(8)` - https://man7.org/linux/man-pages/man8/mke2fs.8.html
- Linux man-pages: `fsck.xfs(8)` - https://man7.org/linux/man-pages/man8/fsck.xfs.8.html

## Issues Found
- The introductory diagram showed generic `fsck` dispatching XFS directly to `xfs_repair`. Updated it to `fsck.xfs`, because the generic fsck frontend invokes filesystem-specific `fsck.fstype` helpers; `fsck.xfs` is the XFS helper.
- The XFS online scrub example used a block device path. Changed it to use a mount point, because `xfs_scrub` takes a mounted filesystem mount point.
- The Btrfs section said `btrfs check` can run on a mounted filesystem for a read-only check without showing the required caution or `--force`. Updated the example to recommend unmounting first and only show mounted checking with `--readonly --force` for quiescent or read-only mounted filesystems.
- The root filesystem reboot check method relied on `touch /forcefsck` as the primary mechanism. Updated it to document `fsck.mode=force` for systemd systems, while retaining `/forcefsck` as a legacy SysVinit/Upstart marker.
- The post suggested `/var/log/boot.log` as the check location for boot-time fsck results. Updated it to use `journalctl -b -u 'systemd-fsck*'` for systemd systems.
- The filesystem-specific tools table listed deprecated `xfs_check` for XFS checks. Replaced it with `xfs_repair -n / xfs_scrub` and listed `xfs_repair / xfs_scrub` for repair.
- The automated monitoring script parsed `lsblk` tree output, which can include tree-drawing prefixes in partition names. Updated the partition loop to use `lsblk -ln` and an `awk` type filter.
- The quick reference listed `touch /forcefsck` as the force-check command. Updated it to `fsck.mode=force` for systemd systems.

## Review Notes
Most fsck, e2fsck, fstab, tune2fs, mke2fs, and exit-code details matched the relevant manual pages. Btrfs `--repair` remains correctly marked as requiring an unmounted filesystem, but it is still a high-risk operation that should be used only with backups and after understanding the reported corruption.
