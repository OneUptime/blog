# Validation Summary: How to Handle Disk Partitioning with fdisk and parted

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux disk partitioning
- util-linux fdisk
- GNU parted and partprobe
- sfdisk and gdisk
- ext4, XFS, FAT32, and swap filesystems
- LVM
- lsblk, mkfs, resize2fs, e2fsck, and related storage commands

## Sources Consulted
- fdisk(8) manual page: https://www.nevis.columbia.edu/cgi-bin/man.sh?man=8+fdisk
- parted(8) manual page: https://man7.org/linux/man-pages/man8/parted.8.html
- sfdisk(8) manual page: https://man7.org/linux/man-pages/man8/sfdisk.8.html
- resize2fs(8) manual page: https://linux.die.net/man/8/resize2fs
- Local command help/man output for fdisk, parted, sfdisk, lsblk, resize2fs, and partprobe on util-linux 2.39.3 / GNU parted.

## Issues Found
- The GPT partition-count wording said GPT has "unlimited" partitions with "128 default." fdisk documentation describes GPT as supporting an effectively unlimited/configurable number of entries, while many tools commonly restrict the default table to 128 entries. Updated the wording to avoid implying a hard universal default or literal unlimited practical capacity.
- The GPT boot compatibility row said "UEFI (and BIOS with hybrid)." Hybrid MBR is not the general requirement for BIOS boot from GPT; BIOS boot can work with boot loader support, such as a BIOS boot partition for GRUB. Updated the wording.
- The fdisk script used numeric GPT type selections for EFI and swap. Those numbers are current in util-linux fdisk, but aliases are clearer and less brittle. Replaced them with `uefi` and `swap`.
- The LVM section listed GPT Linux LVM as fdisk type `31`. In current util-linux fdisk, `31` maps to "Linux root (MIPS-64 LE)", while Linux LVM is available as the `lvm` alias. Updated the example to use `lvm`.
- The resizing section described `parted resizepart 3 80GiB` as resizing to a specific size. parted's `resizepart` takes the new partition end position and does not resize the filesystem. Updated the wording.
- The shrinking example used `parted /dev/sdb resizepart 3 40GiB` after shrinking the filesystem to 40GB. If the partition starts later than 0GiB, that can make the partition smaller than the filesystem. Added a start-position check and changed the example end position to account for the partition start.
- The quick reference used `resizepart 1 50G` without clarifying that the value is an end position. Updated the command to use `50GiB` consistently with the rest of the post.

## Review Notes
The remaining examples are broadly correct for typical Linux systems, but destructive disk commands should still be treated as illustrative. Device naming examples use `/dev/sdX`; NVMe and MMC devices require partition paths such as `/dev/nvme0n1p1` or `/dev/mmcblk0p1`.
