# Validation Summary: How to Format a Partition with ext4, XFS, or Btrfs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- ext4
- XFS
- Btrfs
- Linux filesystem tools
- `/etc/fstab`

## Sources Consulted
- Linux kernel ext4 documentation: https://docs.kernel.org/admin-guide/ext4.html
- Linux kernel ext4 journal documentation: https://docs.kernel.org/filesystems/ext4/journal.html
- `mkfs.ext4`, `tune2fs`, and `e2fsck` local command help from e2fsprogs 1.47.0
- `fstab(5)` local man page from util-linux 2.39.3
- `mkfs.xfs(8)` manual page: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- `xfs(5)` Ubuntu manual page: https://manpages.ubuntu.com/manpages/stonking/man5/xfs.5.html
- `fsck.xfs(8)` manual page: https://man7.org/linux/man-pages/man8/fsck.xfs.8.html
- `xfs_repair(8)` manual page: https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- Btrfs `mkfs.btrfs(8)` documentation: https://btrfs.readthedocs.io/en/latest/mkfs.btrfs.html
- Btrfs `btrfs(5)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-man5.html
- Btrfs `btrfs-check(8)` documentation: https://btrfs.readthedocs.io/en/latest/btrfs-check.html
- Btrfs `fsck.btrfs(8)` documentation: https://btrfs.readthedocs.io/en/latest/fsck.btrfs.html

## Issues Found
- The ext4 `lazy_itable_init=0,lazy_journal_init=0` example was described as SSD tuning that disables full data journaling and enables extents. Updated the comment to say it fully initializes inode tables and the journal during formatting.
- The XFS 64K block size example was presented as a general large-scale storage recommendation. Updated it to warn that Linux can only mount XFS filesystems whose block size is no larger than the kernel page size, commonly 4K on x86_64 Ubuntu systems.
- The XFS stripe geometry example was described as generic SSD tuning and used `sw=1`. Updated it to describe RAID/striped logical volume geometry and use a clearer `sw=4` example.
- The XFS verification command used `xfs_check`, which is deprecated/older guidance. Replaced it with `xfs_repair -n`, the current no-modify check mode.
- The XFS and Btrfs `/etc/fstab` examples used fsck pass number `2`. Updated them to `0` because `fsck.xfs` and `fsck.btrfs` are no-op helpers and normal XFS/Btrfs consistency handling is not driven by traditional boot-time fsck.
- The ext4 SSD tuning example said `tune2fs -o journal_data_writeback` disables journaling. Updated the comment to describe writeback data mode instead; metadata journaling remains in use.
- The XFS mount tuning example described `largeio,inode64` as write performance tuning. Replaced it with `allocsize=1m` and a note to benchmark fixed preallocation before production use.

## Review Notes
- The post is now technically valid for current Ubuntu-style Linux administration guidance. Some performance options, especially online `discard`, ext4 writeback data mode, and XFS fixed preallocation, should still be benchmarked for the target workload before production use.
