# Validation Summary: How to Grow a VDO Logical Volume on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- VDO
- LVM-VDO
- LVM
- XFS
- ext4

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Deduplicating and compressing storage, "Increasing the size of a VDO volume" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/pdf/deduplicating_and_compressing_storage/Red_Hat_Enterprise_Linux-8-Deduplicating_and_compressing_storage-en-US.pdf
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes, "Extending a VDO Pool" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/basic-logical-volume-management_configuring-and-managing-logical-volumes
- lvmvdo(7) manual page - https://www.man7.org/linux/man-pages/man7/lvmvdo.7.html
- Red Hat documentation: Increasing the Size of an XFS File System - https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/6/html/storage_administration_guide/xfsgrow
- Red Hat documentation: Resizing an ext4 File System - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/ext4grow

## Issues Found
- Clarified that the `vdo growLogical`, `vdo growPhysical`, and `vdo status` commands apply to standalone VDO volumes. This avoids implying that those commands are the correct management interface for LVM-VDO, which is the documented approach in RHEL 9.
- Updated the LVM-VDO `lvs` example to include `data_percent` so the command checks physical pool usage as well as LV size and VDO savings.

## Review Notes
The standalone VDO growth commands match Red Hat's VDO maintenance documentation. The LVM-VDO examples align with the lvmvdo(7) manual: extend the VDO pool LV to add physical capacity, extend the VDO LV to grow the virtual/logical size, and then grow the filesystem.
