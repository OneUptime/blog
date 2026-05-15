# Validation Summary: How to Align Disk Partitions for Optimal Performance on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU parted
- util-linux fdisk
- Linux block device topology
- XFS and ext4 filesystem creation
- RAID stripe alignment

## Sources Consulted
- GNU Parted User Manual: https://www.gnu.org/software/parted/manual/parted.html
- GNU Parted align-check documentation: https://www.gnu.org/software/parted/manual/html_node/align_002dcheck.html
- Red Hat Enterprise Linux 9 Managing storage devices: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_storage_devices/index
- Red Hat Enterprise Linux 7 Storage Administration Guide, partition and file system tools: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/iolimpartitionfstools
- Local parted(8), fdisk(8), lsblk(8), and mke2fs/mkfs.ext4 command help/man output

## Issues Found
- The parted example used `mkpart ... 0% 100%` while claiming it starts at 1 MiB. Testing with GNU parted showed that this can create a GPT partition starting at sector 34 and emit an alignment warning. Changed the example to start at `1MiB`.
- The post claimed parted's `-a optimal` behavior is the default on RHEL. The official parted documentation describes `-a optimal` as an explicit alignment mode, and exact start values can still matter. Reworded the guidance and wrap-up to say to use `-a optimal`, specify an aligned start, and verify the result.
- The text said percentages or MiB units ensure proper alignment. A percentage start of `0%` can be unaligned, so this was narrowed to recommend MiB/GiB start positions and percentage end positions.
- The RAID example used a 192K stripe size while saying 1 MiB covers all common stripe sizes. Since 1 MiB is not a multiple of 192 KiB, changed the example to a 256K stripe and added a caveat for non-power-of-two stripe widths.
- The bulk alignment loop counted partition rows by line count and then checked `1..N`, which fails when partition numbers are not contiguous. Replaced it with a `parted -m` and `awk` loop that reads actual partition numbers.
- The bulk-check heading said "all disks" while the command only checks `/dev/sdb`. Changed it to "a disk."

## Review Notes
The remaining commands and explanations match the documented behavior of parted, fdisk, and RHEL storage tooling. In the future, the filesystem section could mention XFS stripe-unit and stripe-width options for RAID layouts, but the current post remains technically correct without adding that broader tuning topic.
