# Validation Summary: How to Use lsblk, blkid, and df to Inspect Storage Devices on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux block devices
- `lsblk`
- `blkid`
- `df`
- LVM commands (`vgs`, `pvs`)
- SCSI host rescanning

## Sources Consulted
- Local `lsblk(8)` man page from util-linux.
- Local `blkid(8)` man page from util-linux.
- Local `df(1)` man page from GNU coreutils.
- GNU Coreutils manual: `df` invocation: https://www.gnu.org/software/coreutils/df
- Red Hat Enterprise Linux 9 Managing storage devices documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices
- Red Hat Enterprise Linux 9 Configuring and managing logical volumes documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/managing-lvm-physical-volumes_configuring-and-managing-logical-volumes

## Issues Found
- The sample `blkid` UUID values used non-hexadecimal characters such as `g`, `h`, and placeholder words. Updated them to valid UUID-shaped hexadecimal examples and made the matching `blkid -U` and `blkid -o export` examples consistent.
- The `df -h /dev/sdb1` example was presented as a way to check whether the filesystem is mounted. GNU `df` can report a mounted filesystem for a device node, but it cannot report space usage for unmounted filesystems and can otherwise report the filesystem containing the device node. Changed the example to search mounted `df` output for `/dev/sdb1`.
- The unknown disk scenario said to check whether any part of `/dev/sdc` is used by LVM, but the command only checked `/dev/sdc` itself. Changed it to `sudo pvs /dev/sdc*` so partitions such as `/dev/sdc1` are included.

## Review Notes
The remaining commands and options were verified against the local man pages and official documentation. `lsblk` default columns can vary by util-linux version, so scripts should continue using explicit `-o` column lists as the post demonstrates.
