# Validation Summary: How to Create and Mount an XFS File System on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS
- Linux block devices and partitions
- `/etc/fstab`
- LVM

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 Mounting file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/mounting-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 Persistently mounting file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/assembly_persistently-mounting-file-systems_managing-file-systems
- `mkfs.xfs(8)` manual page: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- `xfs(5)` manual page: https://man7.org/linux/man-pages/man5/xfs.5.html
- `fstab(5)` and `mount(8)` manual pages on the local system
- GNU Parted command help on the local system

## Issues Found
- Removed the `nobarrier` XFS mount option from the table because the XFS manual documents `barrier/nobarrier` as removed from the kernel since Linux 4.19, so specifying it on RHEL 9-era kernels can cause mount failures.
- Corrected the `logbufs=8` description. The XFS manual documents eight log buffers as the default, so the original wording that it increases log buffers for performance was inaccurate.
- Updated the performance-options `/etc/fstab` example to remove `logbufs=8`, since it is already the current default and should not be presented as an extra tuning option.
- Added `sudo systemctl daemon-reload` before testing the edited `/etc/fstab`, matching Red Hat's RHEL 9 guidance to regenerate systemd mount units after changing `/etc/fstab`.

## Review Notes
The remaining commands and snippets are technically valid for a RHEL 9 XFS setup. In production, administrators should still confirm the target device name with `lsblk` and use workload-specific mount options rather than copying performance options blindly.
