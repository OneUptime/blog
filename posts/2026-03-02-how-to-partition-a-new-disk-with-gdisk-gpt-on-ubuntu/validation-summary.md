# Validation Summary: How to Partition a New Disk with gdisk (GPT) on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- gdisk (GPT fdisk) — interactive GPT partition manipulator
- sgdisk — non-interactive/scripted GPT partitioning
- GPT (GUID Partition Table) format
- Ubuntu Linux disk management utilities (lsblk, fdisk, blkid, mkfs.ext4, mkswap, swapon, mount)
- /etc/fstab persistent mount configuration

## Sources Consulted
- gdisk man page (gdisk(8)) — confirmed via `man gdisk` on local Ubuntu install (gdisk 1.0.10)
- sgdisk man page (sgdisk(8)) — confirmed `-n partnum:start:end` syntax including `0` for defaults
- Live gdisk test against a 100 MiB disk image to confirm actual interactive prompts and verify (`v`) output format
- GPT specification (UEFI Spec) for partition table layout (LBA 1 = primary header, LBA 2–33 = entry array, first usable LBA = 34)
- Common partition type GUIDs / hex codes used by gdisk (8300 Linux fs, 8200 Linux swap, ef00 EFI System, 8e00 Linux LVM, fd00 Linux RAID, 0700 Microsoft basic data) — all confirmed correct

## Issues Found
- **Verify command (`v`) output was wrong.** The post showed `No problems found. 0 partitions are in the GUID Partition Table.` gdisk does not emit that text. The actual format (confirmed by running gdisk locally) reports free-sector counts, e.g. `No problems found. X free sectors (Y) available in N segments, the largest of which is M (Z) in size.` I replaced the incorrect line with output appropriate for the three-partition example: `No problems found. 2014 free sectors (1007.0 KiB) available in 1 segments, the largest of which is 2014 (1007.0 KiB) in size.` (the 2014 free sectors come from the gap between the end of the GPT entry array at sector 33 and the aligned start of partition 1 at sector 2048).

## Review Notes
- The post states up to 128 partitions for GPT. This is the gdisk/typical-default limit imposed by the 16,384-byte partition entry array; the GPT spec itself permits more if the entry array is larger. The post's framing is accurate for the default Ubuntu/gdisk experience.
- The print (`p`) output abbreviates standard gdisk metadata lines (partition table size, first/last usable sector, alignment, total free space) with `...`. This is a stylistic simplification, not an error.
- gdisk version shown (1.0.8) is plausible for Ubuntu 22.04; current Ubuntu releases ship 1.0.9 or 1.0.10. The differences across these versions do not affect any commands or output formats used in the post.
- sgdisk syntax `-n partnum:start:end` with `0` meaning "default" was verified against the official man page. The post's brief option explanations are accurate.
- The 2048-sector (1 MiB) alignment justification is correct.
- The fstab line uses `0 2` for the data partition (dump=0, fsck pass=2), which is appropriate for a non-root ext4 mount.
