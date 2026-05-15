# Validation Summary: How to Set Up LVM RAID on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- LVM RAID
- RAID 0, RAID 1, RAID 4, RAID 5, RAID 6, and RAID 10
- XFS
- Linux block storage and mounting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, Chapter 9 "Configuring RAID logical volumes" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation: Creating LVM physical volumes and volume groups - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Red Hat Enterprise Linux 9 documentation: Increasing the size of an XFS file system - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Linux man-pages: lvmraid(7) - https://man7.org/linux/man-pages/man7/lvmraid.7.html

## Issues Found
- The post stated that RHEL LVM supports RAID levels 1, 4, 5, 6, and 10, but RHEL 9 documentation and lvmraid(7) list RAID0 as supported as well. Updated the support statement and RAID table to include RAID0, noting that it provides striping without redundancy.
- The setup examples initialized only four physical volumes, but the RAID6 example uses `-i 3`, which requires three data devices plus two parity devices, for five devices total. Updated the initial `pvcreate` and `vgcreate` examples to include `/dev/sdf`.
- After adding `/dev/sdf` to the initial volume group, the failed-disk replacement example reused that same device name. Updated the replacement example to use `/dev/sdg`.

## Review Notes
The remaining LVM RAID commands and explanations matched the referenced RHEL 9 documentation and lvmraid(7) behavior. The article uses direct `/dev/vg/lv` paths in `/etc/fstab`; this is valid, though using UUIDs is often more robust for production systems.
