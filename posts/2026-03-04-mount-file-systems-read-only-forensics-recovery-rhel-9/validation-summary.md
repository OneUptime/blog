# Validation Summary: How to Mount File Systems Read-Only for Forensics and Recovery on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux
- Linux mount command and mount options
- XFS and ext4 file systems
- blockdev
- losetup and loop devices
- fdisk
- dd
- lsof and fuser
- GRUB kernel command line
- SHA-256 checksums

## Sources Consulted
- Linux mount(8) manual page: https://www.man7.org/linux/man-pages/man8/mount.8.html
- Linux xfs(5) manual page: https://www.man7.org/linux/man-pages/man5/xfs.5.html
- Linux ext4(5) manual page: https://www.man7.org/linux/man-pages/man5/ext4.5.html
- Linux losetup(8) manual page: https://www.man7.org/linux/man-pages/man8/losetup.8.html
- Local blockdev --help output from util-linux
- Local fuser --help output from psmisc
- Local lsof(8) manual page

## Issues Found
- The block-device read-only example set `/dev/sdb` read-only but mounted `/dev/sdb1`. For reliable protection of the file system source being mounted, the example now sets, verifies, and resets `/dev/sdb1`.
- The disk image example implied that a whole-disk image made from `/dev/sdb` could be mounted directly through `/dev/loop0`. That only works when the image contains a file system directly rather than a partition table. The text now states this condition, uses `losetup --find --show` to avoid assuming `/dev/loop0` is free, and tells the reader to use the printed loop device.

## Review Notes
The `ro` mount option, ext4 `noload` option, XFS `norecovery` option, loop-device read-only flag, `blockdev --setro/--getro/--setrw`, `lsof +D`, `fuser -vm`, and checksum examples were otherwise consistent with the consulted documentation. Future improvements could mention that skipping journal replay may expose an inconsistent view of an uncleanly unmounted file system, even though that tradeoff is expected in forensic workflows.
