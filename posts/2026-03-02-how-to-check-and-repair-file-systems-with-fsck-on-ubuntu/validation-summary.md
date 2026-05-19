# Validation Summary: How to Check and Repair File Systems with fsck on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- fsck
- e2fsck
- tune2fs
- systemd-fsck
- XFS and xfs_repair
- Btrfs and btrfs check
- FAT/vFAT fsck helpers
- smartctl and SMART disk health checks

## Sources Consulted
- Ubuntu fsck man page: https://manpages.ubuntu.com/manpages/jammy/man8/fsck.8.html
- Local e2fsck(8), tune2fs(8), mke2fs(8), fsck(8), and systemd-fsck(8) man pages
- Ubuntu systemd-fsck man page: https://manpages.ubuntu.com/manpages/noble/man8/systemd-fsck.8.html
- Ubuntu fsck.xfs man page: https://manpages.ubuntu.com/manpages/jammy/man8/fsck.xfs.8.html
- xfs_repair man page: https://man7.org/linux/man-pages/man8/xfs_repair.8.html
- Red Hat XFS repair documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsrepair
- Btrfs check documentation: https://btrfs.readthedocs.io/en/latest/btrfs-check.html
- Btrfs fsck.btrfs documentation: https://btrfs.readthedocs.io/en/latest/fsck.btrfs.html

## Issues Found
- The post described read-only checks as safe on mounted filesystems without enough caveat. Updated the text to note that `e2fsck -n` is the exception, but results can still be unreliable on a changing mounted filesystem, and changed the XFS example to use `xfs_repair -n` on an unmounted filesystem.
- The sample clean `e2fsck` output showed more used blocks than total blocks. Corrected the example block count.
- The post implied `sudo touch /forcefsck` was the primary modern Ubuntu way to force a root filesystem check. Replaced that with the documented `fsck.mode=force` kernel parameter and added `tune2fs -E force_fsck` for ext filesystems.
- The filesystem helper table incorrectly implied generic `fsck` directly runs effective XFS and Btrfs check/repair tools. Updated the XFS and Btrfs rows to explain that `fsck.xfs` and `fsck.btrfs` normally exit successfully and direct tools should be used for checks or repairs.
- The XFS section incorrectly labeled `xfs_repair -n` as journal replay. Updated it to describe a dry-run scan, and clarified that dirty XFS logs should be replayed by mounting and unmounting before using `-L` as a last resort.
- The Btrfs recovery guidance overemphasized snapshots as the standard repair path. Adjusted it to prefer backups, snapshots, or Btrfs recovery tools with expert guidance before `btrfs check --repair`.
- The recovery mode instructions told readers to remount root read-write and run `e2fsck` manually on the root device, which is unsafe while mounted. Replaced this with the recovery menu fsck option and live USB guidance for manual root checks.
- The e2fsck exit code table omitted code 32. Added it and clarified the script comment for code 2.

## Review Notes
The remaining examples are technically valid but still use placeholder device names such as `/dev/sda1`, `/dev/sda3`, and `/dev/sdb1`; readers should confirm real device names with tools such as `lsblk` before running repair commands. The `xfs_repair -L` and `btrfs check --repair` examples are correctly marked as dangerous last-resort operations.
