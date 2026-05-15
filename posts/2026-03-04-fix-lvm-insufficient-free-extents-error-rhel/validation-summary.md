# Validation Summary: How to Fix LVM 'Insufficient Free Extents' Error on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- LVM
- XFS
- ext4
- Linux storage administration

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Managing LVM volume groups": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/managing-lvm-volume-groups_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 7 documentation, "Growing a File System on a Logical Volume": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/fsgrow_overview
- Red Hat Enterprise Linux 9 documentation, "Shrinking logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/shrinking-logical-volumes_modifying-the-size-of-a-logical-volume
- Linux man-pages, lvextend(8): https://man7.org/linux/man-pages/man8/lvextend.8.html
- Linux man-pages, xfs_growfs(8): https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- Linux man-pages, resize2fs(8): https://man7.org/linux/man-pages/man8/resize2fs.8.html

## Issues Found
No technical issues found.

## Review Notes
The post correctly describes the cause of the "Insufficient free extents" error and presents valid remediation paths: adding a physical volume to the volume group, shrinking an eligible ext4 logical volume, removing an unused logical volume, or extending with `+100%FREE`. The examples assume an XFS root filesystem for most final grow commands, which matches common RHEL defaults; the post also includes the ext4 `resize2fs` alternative in the first workflow.
