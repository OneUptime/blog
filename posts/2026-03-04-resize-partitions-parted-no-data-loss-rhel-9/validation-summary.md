# Validation Summary: How to Resize Partitions with parted on RHEL Without Data Loss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU Parted
- Linux disk partitions
- XFS
- ext4
- resize2fs
- e2fsck
- xfs_growfs

## Sources Consulted
- GNU Parted User Manual: https://www.gnu.org/software/parted/manual/parted.html
- Red Hat Enterprise Linux 9, Managing storage devices, "Resizing a partition with parted": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-partitions_managing-storage-devices
- Red Hat Enterprise Linux 9, Managing file systems, "Resizing an ext4 file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9, Managing file systems, "Increasing the size of an XFS file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Local command help output for `parted`, `resize2fs`, and `e2fsck`.

## Issues Found
- The post implied that `parted resizepart 1 200GiB` sets a partition to a specific size. GNU Parted and Red Hat document `resizepart` as setting the partition's new end position, counted from the beginning of the disk. Updated the wording to say "end position" and changed the layout command to show GiB boundaries.
- The shrinking example resized ext4 to `50G` and then set the partition end to `50GiB`. Because `resizepart` uses an absolute end coordinate, that could make the resulting partition smaller than the filesystem depending on the partition start offset. Updated the example to shrink the ext4 filesystem to `49G` before setting the partition end to `50GiB`, preserving a safety margin.
- The GPT backup header note said fixing it is required after disk expansion. That is only relevant for GPT disks, so the wording now says "If this is a GPT disk."

## Review Notes
- The post's main workflow is correct: grow the partition before growing the filesystem, and shrink supported filesystems before shrinking the partition.
- XFS guidance is correct for RHEL 9: XFS can be grown while mounted with `xfs_growfs`, and XFS shrinking is not supported.
