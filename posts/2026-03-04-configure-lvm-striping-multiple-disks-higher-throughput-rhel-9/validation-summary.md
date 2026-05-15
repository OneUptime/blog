# Validation Summary: How to Configure LVM Striping Across Multiple Disks on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM physical volumes, volume groups, logical volumes, striping, and RAID10
- XFS filesystem creation and growth
- ext4 filesystem creation
- fio benchmarking
- /etc/fstab mounting

## Sources Consulted
- Red Hat Enterprise Linux 9, Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9, Managing file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- lvcreate(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/lvcreate.8.html
- mkfs.xfs(8) Linux manual page: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- mke2fs(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/mke2fs.8.html

## Issues Found
- The post stated that a striped LV extension "must" use the same stripe count as the original. RHEL documents extending striped LVs with `lvextend`, and LVM applies stripe parameters to extension segments. I changed the wording to say matching the original stripe count and stripe size preserves the same layout and performance characteristics.
- The post stated that the stripe count cannot be changed after creation. I changed this to the more precise statement that existing striped segments keep the stripe count they were created with.

## Review Notes
- The LVM `pvcreate`, `vgcreate`, `lvcreate`, `lvs`, `lvdisplay`, `lvextend`, and RAID10 examples are consistent with RHEL/LVM documentation.
- The XFS `mkfs.xfs -d su=64k,sw=4` and ext4 `mkfs.ext4 -E stride=16,stripe-width=64` examples match documented stripe geometry tuning for a 64 KB stripe unit across four data-bearing stripes.
- The `xfs_growfs /data` example is correct for RHEL 9 because XFS growth is performed on a mounted filesystem using the mount point.
