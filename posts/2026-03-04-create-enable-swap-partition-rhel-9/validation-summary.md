# Validation Summary: How to Create and Enable a Swap Partition on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap partitions and swap files
- LVM logical volumes
- util-linux commands: `swapon`, `swapoff`, `mkswap`, `fdisk`, `blkid`
- GNU Parted
- `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Getting started with swap - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- `swapon(8)` manual page from util-linux
- `mkswap(8)` manual page from util-linux
- `fstab(5)` manual page from util-linux
- `blkid(8)` manual page from util-linux
- `fdisk --help` from util-linux
- `parted --help` from GNU Parted

## Issues Found
- The hibernation guidance said swap must be at least equal to RAM size. RHEL 9 documents hibernation swap sizing as dependent on RAM size and workload, with recommendations that can be larger than RAM and hibernation not recommended above 64 GiB. Updated the statement to avoid an inaccurate universal minimum.
- The swap partition versus swap file comparison claimed a partition has better performance and a swap file has slight overhead. Modern Linux and RHEL guidance does not support that as a universal claim. Updated the wording to describe the partition as a dedicated block device and note filesystem restrictions for swap files.
- The comparison said swap files work on any filesystem. That is inaccurate because swap files have filesystem-specific restrictions, such as holes, preallocation, and copy-on-write behavior. Replaced it with "No repartitioning needed."

## Review Notes
The main workflow is technically valid for RHEL 9: create a partition or LVM logical volume, initialize it with `mkswap`, activate it with `swapon`, and persist it in `/etc/fstab`. Red Hat's RHEL 9 documentation also recommends running `systemctl daemon-reload` after changing `/etc/fstab` so systemd registers the new configuration; the post's `swapon -a` verification is still valid for testing the swap entry.
