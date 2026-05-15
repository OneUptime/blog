# Validation Summary: How to Configure /etc/fstab for Reliable and Secure Mounts on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- `/etc/fstab`
- XFS
- swap
- util-linux `mount`, `findmnt`, `blkid`, and `lsblk`
- systemd fstab-generated mount units
- Linux mount security options

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Checking and repairing a file system documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- `fstab(5)` man page on the review system
- `mount(8)` man page on the review system
- `findmnt(8)` help output on the review system
- `blkid(8)` man page on the review system
- `systemd.mount(5)` man page on the review system

## Issues Found
- The fsck pass-order section used generic `1` and `2` values for XFS examples. On RHEL, XFS is normally listed with pass `0`; Red Hat documents that `fsck.xfs` exists only for compatibility and exits successfully without performing a check. Updated the explanation and XFS examples to use `0`.
- The swap examples used `swap` as the mount point field. The `fstab(5)` man page specifies `none` for swap areas. Updated swap entries to use `none`.
- The testing section led with `mount -a` as the fstab validation step. The `mount(8)` man page recommends `findmnt --verify` for fstab checking, and Red Hat documents `systemctl daemon-reload` after editing `/etc/fstab` on RHEL systems using systemd. Updated the sequence to validate with `findmnt --verify`, reload systemd, and then optionally mount entries.

## Review Notes
The remaining commands and configuration examples are technically valid for a RHEL-style system. The post intentionally keeps examples simple; production systems may also need environment-specific options for LVM, encrypted devices, network mounts, automounting, or application directories where `noexec` would break expected behavior.
