# Validation Summary: How to Grow an XFS File System on RHEL Using xfs_growfs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- XFS filesystem
- xfsprogs (`xfs_growfs`, `xfs_info`)
- LVM (`vgs`, `lvextend`, `pvresize`)
- Disk and partition resizing (`growpart`, GNU Parted)
- Linux storage diagnostics (`dmesg`, `smartctl`)

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Increasing the size of an XFS file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- Linux manual page for `xfs_growfs(8)`: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Linux manual page for `lvextend(8)`: https://man7.org/linux/man-pages/man8/lvextend.8.html
- Local `growpart --help` output
- Local GNU Parted 3.6 `parted --help` output

## Issues Found
- The post stated that the argument to `xfs_growfs` is the mount point, not the device path. Current `xfs_growfs(8)` documents that the command accepts either the mount point or the block device path for a mounted XFS filesystem. Updated the sentence to recommend the mount point while noting that a mounted block device path is also accepted.
- The best practices section described `lvextend -r` as one atomic operation. Red Hat documents it as extending the logical volume and resizing the filesystem in one command, but not as an atomic transaction. Updated the wording to "one command."

## Review Notes
The main procedure is technically correct for RHEL 9: XFS must be mounted to grow, `-D` uses filesystem blocks, XFS cannot be reduced on RHEL, the underlying block device must be expanded first, and `lvextend --resizefs` is the documented LVM path for resizing the filesystem along with the logical volume.
