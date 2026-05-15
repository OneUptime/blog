# Validation Summary: How to Set Up LVM Striping for Improved I/O Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM2 physical volumes, volume groups, logical volumes, striping, RAID0, and RAID10
- XFS filesystem creation and online growth
- fio storage benchmarking
- sysstat iostat monitoring

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux 9 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- lvcreate(8) Linux manual page: https://man7.org/linux/man-pages/man8/lvcreate.8.html
- lvmraid(7) Linux manual page: https://man7.org/linux/man-pages/man7/lvmraid.7.html
- mkfs.xfs(8) Linux manual page: https://man7.org/linux/man-pages/man8/mkfs.xfs.8.html
- fio upstream documentation: https://fio.readthedocs.io/en/master/fio_doc.html
- Linux kernel dm-raid documentation: https://www.kernel.org/doc/html/latest/admin-guide/device-mapper/dm-raid.html

## Issues Found
- Clarified the explanation of how striped logical volumes divide data. The original wording called each chunk a "stripe"; the corrected text uses "stripe units", matching LVM and XFS terminology more closely.
- Corrected the small-stripe workload example. Database transaction logs are typically sequential append workloads, so the example now refers to database data files with small random reads and writes.
- Added `--direct=1` to the fio benchmark examples so the tests measure the storage path more directly instead of being heavily affected by the Linux page cache.
- Refined the RAID0 alternative explanation. LVM RAID uses device mapper with kernel MD RAID drivers, not a standalone MD RAID device layer in the same sense as mdadm-created `/dev/md*` arrays.

## Review Notes
The LVM creation, verification, XFS formatting, mounting, fstab, `xfs_growfs`, RAID10, and `iostat` commands are technically valid for RHEL 9. Stripe-size tuning remains workload-dependent, so production use should validate settings with representative application I/O.
