# Validation Summary: How to Expand mdadm RAID Arrays on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Linux md RAID
- mdadm
- ext4
- XFS
- fdisk, parted, sgdisk, and sfdisk
- sysctl
- initramfs-tools

## Sources Consulted
- mdadm(8) Linux manual page: https://man7.org/linux/man-pages/man8/mdadm.8.html
- Linux kernel md RAID documentation: https://docs.kernel.org/admin-guide/md.html
- resize2fs(8) local system manual page from e2fsprogs 1.47.0
- xfs_growfs(8) Linux manual page: https://man7.org/linux/man-pages/man8/xfs_growfs.8.html
- sysctl.conf(5) local system manual page

## Issues Found
- Corrected the RAID 10 expansion description. The original text implied adding pairs of drives was the standard expansion path, but mdadm RAID 10 reshape support is more limited than RAID 5/6 and depends on layout.
- Corrected the RAID 5 redundancy description. Adding a drive increases capacity and stripe count, but RAID 5 still has single-drive redundancy. RAID 6 still has two-drive redundancy.
- Fixed partitioned member examples to use `/dev/sdd1` and `/dev/sde1` when the guide creates partitions on replacement or added disks. Adding the whole disk after creating a member partition would be inconsistent and likely wrong for that setup.
- Clarified fdisk partition type guidance because MBR type `fd` applies to MBR partition tables, while GPT uses a Linux RAID member type.
- Fixed the larger-drive replacement workflow to resize the new member partition on the replacement disk before adding it to the array. Copying the old partition table alone leaves the replacement member at the old size, so `mdadm --grow --size=max` would not expose the larger capacity.
- Clarified that `parted /dev/md0 resizepart 1 100%` only applies when the filesystem is inside a partition on the md device, and should be skipped when the filesystem is directly on `/dev/md0`.
- Fixed the monitoring script so it checks the full `/proc/mdstat` output and uses a positive extended-regex match for active `reshape`, `recovery`, or `resync` operations. The original `grep -qv` test could exit even while a reshape was still running.
- Replaced the incorrect troubleshooting advice that a nearly full filesystem can cause RAID 5 reshape failure. mdadm reshape backup requirements are about spare devices or an external `--backup-file`, not freeing a percentage of filesystem space on the array.

## Review Notes
The remaining commands and claims align with the referenced mdadm, Linux md, resize2fs, xfs_growfs, and sysctl documentation. The guide still uses simple `/dev/sdX` examples; in production, stable device identifiers from `/dev/disk/by-id/` are usually safer than kernel-assigned disk names.
