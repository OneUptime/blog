# Validation Summary: How to Set Up RAID 5 with mdadm on RHEL for Parity Protection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm
- RAID 5
- XFS
- dracut
- /etc/fstab
- Linux block device read-ahead tuning

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 18: Managing RAID: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- Linux kernel documentation for MD RAID arrays: https://docs.kernel.org/admin-guide/md.html
- blockdev(8) Linux manual page: https://man7.org/linux/man-pages/man8/blockdev.8.html

## Issues Found
- The chunk-size example said custom chunk size must be specified "at creation time only." mdadm supports later chunk-size changes through reshape operations, but those require backup precautions and are operationally risky. Updated the wording to recommend choosing chunk size at creation and note that changing it later requires a reshape and backup precautions.
- The recovery example said to remove and add a replacement but then re-added the same `/dev/sdc` device. That is valid for a simulated failure but misleading for a real failed disk. Updated the comments to distinguish simulation from real replacement.
- The performance tuning section described `stripe_cache_size` as improving sequential read performance. Kernel MD documentation describes it as the RAID5/6 stripe cache, and it is mainly relevant to stripe handling and write-heavy sequential workloads. Updated the wording accordingly.

## Review Notes
- The core mdadm commands, RAID 5 capacity/fault-tolerance explanation, mdadm configuration scan, XFS formatting, fstab UUID usage, hot-spare behavior, and `blockdev --setra 8192` 4 MB calculation were reviewed and found technically sound.
- For production systems, persistent device names or partitions are safer than raw `/dev/sdX` examples because disk names can change, but the examples are acceptable for a concise tutorial.
