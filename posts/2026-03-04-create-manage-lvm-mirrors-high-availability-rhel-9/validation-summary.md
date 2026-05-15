# Validation Summary: How to Create and Manage LVM Mirrors for High Availability on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2
- LVM RAID1 logical volumes
- Legacy LVM mirror segment type
- XFS filesystems
- Linux storage administration

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing logical volumes, RAID segment types: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9: Creating RAID logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9: Changing the number of images in an existing RAID1 device: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9: Replacing a failed RAID device in a logical volume: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9: Splitting off a RAID image as a separate logical volume: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Upstream LVM2 `lvconvert(8)` manual page: https://man7.org/linux/man-pages/man8/lvconvert.8.html

## Issues Found
- Clarified that legacy `mirror` logical volumes use a mirror log, which can be on disk or in memory. The original wording implied a separate log device was always used, but `--mirrorlog core` keeps the log in memory.
- Clarified that LVM RAID1 does not use the legacy separate mirror log mechanism. The original statement was broadly correct but could be read as saying RAID1 has no metadata/logging at all.
- Clarified physical volume placement wording. Positional PV arguments restrict allocation to those disks; they do not promise a stable command-line-to-leg ordering.
- Clarified split-mirror behavior. Splitting one image from a fully synchronized two-way RAID1 logical volume creates a new LV and leaves the original as a linear volume with no redundancy until a mirror leg is added back.

## Review Notes
The commands and flags for creating RAID1 logical volumes, displaying `copy_percent`/`sync_percent`, repairing degraded RAID LVs with `lvconvert --repair`, changing mirror image count with `lvconvert -m`, and converting RAID1 to linear with `lvconvert -m0` are consistent with Red Hat's RHEL 9 LVM documentation and LVM2 manual pages. The legacy `mirror` segment type is still documented as legacy; RAID1 remains the preferred type for new deployments.
