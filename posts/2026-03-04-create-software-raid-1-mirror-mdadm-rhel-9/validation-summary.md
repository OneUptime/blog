# Validation Summary: How to Create a Software RAID 1 (Mirror) Array with mdadm on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm
- RAID 1 mirroring
- XFS
- /etc/fstab
- dracut/initramfs
- util-linux tools: lsblk, wipefs, blkid

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18: Managing RAID: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/mdadm.8.html
- dracut(8) Linux manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- Local util-linux command help for `lsblk`, `wipefs`, and `blkid`

## Issues Found
- The mirroring diagram showed one read request going to both disks, which could imply that every read is duplicated to all mirrors. Updated it to show separate read requests being served by different mirror members.
- The explanation and performance notes overstated sequential read behavior by saying reads can approach 2x single-disk speed. Updated the wording to the more accurate claim that read performance can improve, especially for concurrent read workloads, because requests can be served from either mirror.
- The monitoring section described a `mdadm --detail` status command as "mdadm's built-in monitor." Updated the wording to call it a quick status check.
- The usable capacity note said capacity is the size of one disk. Updated it to the size of the smallest member disk, which is more accurate when mirror members differ in size.

## Review Notes
The command sequence is technically valid for creating, formatting, mounting, persisting, testing, recovering, and removing a basic mdadm RAID 1 array on RHEL. Red Hat's examples commonly use RAID partitions rather than whole disks, so a future improvement could add partition creation and persistent `/dev/disk/by-id/` naming for production systems, but the existing whole-disk mdadm commands are supported block-device usage.
