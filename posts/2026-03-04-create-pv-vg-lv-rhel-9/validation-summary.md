# Validation Summary: How to Create Physical Volumes, Volume Groups, and Logical Volumes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Logical Volume Manager (LVM)
- Physical volumes (PVs)
- Volume groups (VGs)
- Logical volumes (LVs)
- Thin-provisioned logical volumes
- XFS file systems
- Linux mount and storage inspection commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/index
- Linux manual page for lvcreate(8): https://man7.org/linux/man-pages/man8/lvcreate.8.html

## Issues Found
- The metadata tag list used `LVS`, which commonly refers to Linux Virtual Server and is not the correct abbreviation for logical volumes. Changed it to `LV`.
- The comment for `sudo pvs -o+pv_used,pv_free` said it showed PV segments. Those output columns show used and free PV space, not segment layout. Updated the comment to describe the command accurately.

## Review Notes
The LVM command forms for `pvcreate`, `vgcreate`, `vgextend`, `pvmove`, `vgreduce`, `lvcreate`, thin pool creation, thin LV creation, `lvremove`, XFS formatting, mounting, and basic inspection commands are consistent with RHEL 9 documentation and the `lvcreate(8)` manual. Future improvements could mention using persistent identifiers such as filesystem UUIDs in `/etc/fstab`, but the documented LVM device paths are valid.
