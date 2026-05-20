# Validation Summary: How to Configure Software RAID During Ubuntu Server Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server installer (Subiquity)
- Linux md software RAID
- mdadm
- LVM
- systemd timers/services
- smartmontools / smartd
- ext4 and XFS filesystems

## Sources Consulted
- Subiquity storage configuration documentation: https://canonical-subiquity.readthedocs-hosted.com/en/latest/howto/configure-storage.html
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux manual page: https://www.man7.org/linux/man-pages/man5/mdadm.conf.5.html
- md(4) Linux manual page: https://www.man7.org/linux/man-pages/man4/md.4.html
- smartd.conf(5) manual page: https://man.archlinux.org/man/smartd.conf.5.en
- Ubuntu mdadm package changelog: https://lists.ubuntu.com/archives/mantic-changes/2023-August/004050.html

## Issues Found
- The RAID 10 overview said an even number of four disks was required. Linux md RAID 10 commonly uses four or more disks, but mdadm explicitly supports odd disk counts for RAID10 layouts, so the wording was corrected.
- The RAID 10 creation example said RAID 10 starts without needing initial sync. mdadm normally performs an initial resync for new RAID1/RAID10 arrays unless special options such as `--assume-clean` are used, so the wording was corrected to say the array is usable immediately while resync runs.
- The consistency-check section referenced `/etc/cron.d/mdadm` as the built-in scheduling mechanism. Current Ubuntu mdadm packaging migrated these checks to systemd `mdcheck` timers, so the command was updated to inspect `mdcheck*` timers.
- The growing-array section said adding disks to RAID 5 or RAID 6 increases redundancy or capacity. Adding disks to an existing RAID5/RAID6 array increases capacity; redundancy stays one-parity or two-parity respectively, so the wording was corrected.

## Review Notes
The remaining commands and configuration snippets are consistent with the referenced documentation. The examples assume destructive use of empty disks or partitions; a future revision could emphasize that `mdadm --create`, filesystem creation, and partitioning commands can destroy existing data.
