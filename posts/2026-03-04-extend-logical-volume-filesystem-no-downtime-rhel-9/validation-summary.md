# Validation Summary: How to Extend a Logical Volume and Filesystem on RHEL Without Downtime

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Logical Volume Manager (LVM)
- XFS
- ext4
- Linux storage administration commands: `vgs`, `lvs`, `lvextend`, `pvcreate`, `vgextend`, `xfs_growfs`, `resize2fs`, `df`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, resizing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9 documentation: Increasing the size of an XFS file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Managing file systems, resizing an ext4 file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Linux `lvextend(8)` manual page: https://man7.org/linux/man-pages/man8/lvextend.8.html
- Linux `vgextend(8)` manual page: https://man7.org/linux/man-pages/man8/vgextend.8.html
- Local `resize2fs(8)` manual page from e2fsprogs 1.47.0

## Issues Found
- The post said that if the VG has zero free space, "you need to add a new disk to the VG first." This was too narrow because the real requirement is adding capacity to the VG; adding a new disk is only one common method. Changed the sentence to say you need to add storage to the VG, such as by adding a new disk.

## Review Notes
The `lvextend`, `lvextend -r`, `-L`, `-l +100%FREE`, `xfs_growfs`, `resize2fs`, `pvcreate`, and `vgextend` command usage is consistent with Red Hat and LVM documentation. XFS online growth and no-shrink behavior, ext4 online growth, and ext4 offline shrink caveats are accurate for RHEL 9.
