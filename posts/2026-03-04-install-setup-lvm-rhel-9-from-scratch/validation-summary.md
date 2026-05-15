# Validation Summary: How to Install and Set Up LVM on RHEL from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- Physical volumes, volume groups, and logical volumes
- XFS filesystems
- Linux block devices and mounts
- `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9: Managing file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9: Overview of available file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/overview-of-available-file-systems_managing-file-systems

## Issues Found
- The post said LVM can "resize volumes on the fly" without qualification. Because the guide formats the logical volumes with XFS, this was too broad: Red Hat documents that XFS can be increased but not reduced. Changed the claim to say LVM can extend volumes on the fly and shrink only where the filesystem supports it.
- The final paragraph repeated the same broad "resize volumes" claim. Changed it to "extend volumes" to match the XFS-based workflow.
- The `/etc/fstab` persistence step appended entries and immediately ran `mount -a`. Red Hat's RHEL 9 filesystem documentation includes `systemctl daemon-reload` after editing `/etc/fstab` so systemd registers the generated mount unit changes. Added `sudo systemctl daemon-reload` before testing the entries.

## Review Notes
The LVM command examples (`dnf install lvm2`, `pvcreate`, `vgcreate`, `lvcreate`, `pvs`, `vgs`, `lvs`, `mkfs.xfs`, `mount`, `df`, and `lsblk`) are consistent with the RHEL 9 documentation. The example uses whole-disk PVs (`/dev/sdb` and `/dev/sdc`), which LVM supports; Red Hat also notes that partitioning the whole disk as a single PV is recommended for optimal performance.
