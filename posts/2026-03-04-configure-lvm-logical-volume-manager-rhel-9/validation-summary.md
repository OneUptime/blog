# Validation Summary: How to Configure LVM (Logical Volume Manager) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Logical Volume Manager (LVM)
- Physical volumes, volume groups, and logical volumes
- XFS and ext4 file systems
- Linux mount points and `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9: Basic logical volume management: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- Red Hat Enterprise Linux 9: Managing file systems, mounting and persistent mounts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Linux man-pages for LVM commands, including `pvcreate(8)`, `vgcreate(8)`, `lvcreate(8)`, and `lvremove(8)`: https://man7.org/linux/man-pages/

## Issues Found
- The removal section only unmounted and removed `/data` / `datalv`, even though the tutorial created and mounted three logical volumes. I updated the cleanup commands to unmount `/data`, `/app`, and `/logs`, and to remove `datalv`, `applv`, and `loglv` before removing the volume group. This matches the documented requirement to unmount a logical volume before removal and to remove logical volumes before removing the volume group.
- The LVM installation snippet said "Check if LVM is installed" but used `dnf install lvm2 -y`. I changed the comment to "Install LVM tools if needed" so the description matches the command behavior.

## Review Notes
The command sequence is technically valid for an empty test system where `/dev/sdb` and `/dev/sdc` are unused. In production, administrators should identify devices first, back up data, and consider persistent identifiers such as UUIDs in `/etc/fstab`.
