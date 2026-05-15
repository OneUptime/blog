# Validation Summary: How to Fix XFS Metadata Corruption Errors on RHEL

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- XFS filesystem
- xfs_repair
- xfs_metadump and xfs_mdrestore
- xfs_db and xfs_info
- smartctl
- systemd rescue and emergency boot concepts

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/managing_file_systems/index
- Red Hat Enterprise Linux 8 documentation, "Checking and repairing a file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- xfs_repair(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/xfs_repair.8.html
- xfs_metadump(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_metadump.8.html
- xfs_mdrestore(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_mdrestore.8.html

## Issues Found
- The post originally suggested using `xfs_repair -L` when `xfs_repair` complains about a dirty log. Red Hat documentation and the `xfs_repair(8)` man page state that the log should be replayed by mounting and unmounting the filesystem first, and `-L` should be used only as a last resort if the log cannot be replayed. Updated the non-root repair flow accordingly.
- The root filesystem section listed emergency mode as an option and implied the root filesystem could be repaired while mounted read-only. Normal `xfs_repair` requires an unmounted filesystem, so the section now directs the reader to boot from installation or rescue media and unmount `/mnt/sysroot` if the rescue environment mounted it.
- The `xfs_mdrestore` example restored a metadump to a regular file and then ran `xfs_repair -n` without `-f`. The `xfs_repair(8)` man page requires `-f` when the filesystem image is stored in a regular file, so the example now uses `xfs_repair -n -f /tmp/xfs_image`.
- The post described `xfs_metadump` as a safe read-only operation without noting mount-state requirements. The `xfs_metadump(8)` man page says it may only copy unmounted filesystems or read-only mounted filesystems, so the text now includes that condition.

## Review Notes
The remaining commands and claims are technically consistent with the consulted documentation. Device names such as `/dev/sda2` and `/dev/sdb1` are examples; in production, users should identify the actual block device, including LVM or multipath paths where applicable.
