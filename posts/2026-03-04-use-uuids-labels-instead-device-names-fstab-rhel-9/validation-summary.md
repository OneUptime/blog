# Validation Summary: How to Use UUIDs and Labels Instead of Device Names in fstab on RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux `/etc/fstab`
- Filesystem UUIDs and labels
- XFS
- ext4
- Linux swap
- `blkid`, `lsblk`, `mount`, and `findmnt`
- Partition UUIDs

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Persistently mounting file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: File system identifiers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_file_systems/the-xfs-file-system_overview-of-available-file-systems
- `fstab(5)` Linux manual page: https://man7.org/linux/man-pages/man5/fstab.5.html
- `mount(8)` Linux manual page: https://man7.org/linux/man-pages/man8/mount.8.html
- `findmnt(8)` Linux manual page and local `findmnt` documentation
- `blkid(8)` Linux manual page and local `blkid --help`: https://man7.org/linux/man-pages/man8/blkid.8.html
- `xfs_admin(8)` Linux manual page: https://man7.org/linux/man-pages/man8/xfs_admin.8.html
- `e2label(8)` Linux manual page and local manual page: https://man7.org/linux/man-pages/man8/e2label.8.html
- `swaplabel(8)` Linux manual page and local manual page: https://man7.org/linux/man-pages/man8/swaplabel.8.html

## Issues Found
- The PARTUUID section said PARTUUID is useful when the file system has not been created yet. In the context of `/etc/fstab`, that was misleading because the entry still needs a mountable file system or swap area. Changed the wording to say PARTUUID is useful when the identifier should remain tied to the partition rather than the file system, such as after reformatting, or when identifying partitions independently of their content.

## Review Notes
The examples use valid `UUID=`, `LABEL=`, and `PARTUUID=` fstab syntax. The `blkid`, `lsblk -f`, `xfs_admin -L`, `e2label`, `swaplabel -L`, `mount -a`, and `findmnt --verify` commands are valid. For future improvement, the guide could mention `systemctl daemon-reload` after editing `/etc/fstab`, as Red Hat documents it when adding persistent mounts, but the existing `mount -a` and `findmnt --verify` testing guidance is technically valid.
