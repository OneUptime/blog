# Validation Summary: How to List All Disks and Partitions on Ubuntu with lsblk and fdisk

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- `lsblk` (util-linux)
- `fdisk` (util-linux)
- `blkid` (util-linux)
- `parted` (GNU parted)
- `findmnt` (util-linux)
- `df` (coreutils)
- `hdparm`
- `nvme-cli` (`nvme id-ctrl`)
- `iostat` (sysstat)
- `sar` (sysstat)
- Linux block-device model (sysfs, GPT/MBR, UUID, PARTUUID)

## Sources Consulted
- `lsblk(8)` man page / util-linux source
- `fdisk(8)` man page and `fdisk --help` output (util-linux)
- `blkid(8)` man page
- `parted(8)` man page (GNU parted) — specifically the `align-check` command syntax
- `findmnt(8)` man page — `-T, --target` behavior
- Ubuntu/util-linux documentation for block device tooling

## Issues Found
Two comment inaccuracies were corrected; all commands and flags themselves were verified as correct.

1. The comment for `lsblk -a` previously read "Include empty drives (not mounted)", which misstates the flag's purpose. Per `lsblk(8)`, `-a, --all` "Disable[s] all built-in filters and list[s] all empty devices and RAM disk devices too." Changed the comment to accurately describe this behavior.

2. The comment for `sudo fdisk -l --bytes` previously read "Show sector units (default) or in KB/MB", which is misleading — fdisk has no KB/MB-specific option, and the default already shows SIZE in human-readable units. Per `fdisk --help`, `--bytes` "print[s] SIZE in bytes rather than in human readable format". Comment rewritten to reflect this.

## Review Notes
- All command flags and syntax verified against current util-linux (`lsblk`, `fdisk`, `blkid`, `findmnt`), GNU parted, sysstat, hdparm, and nvme-cli.
- `parted align-check optimal 1` is correct: per `parted(8)`, the type argument accepts the full words "minimal" or "optimal" (the abbreviated `min`/`opt` shown in `--help` are equivalents).
- `lsblk -d, --nodeps` is correctly described as showing only top-level devices (disks, not their partition children).
- `blkid -s UUID -o value <dev>` and `blkid -U <uuid>` usage is correct.
- `nvme id-ctrl /dev/nvme0` correctly targets the controller character device, not a namespace (`nvme0n1`).
- The example output of `lsblk` is plausible/representative; actual columns and widths may differ slightly across `util-linux` versions, but nothing is misleading.
- The post correctly notes that `--bytes` (lsblk) and `--bytes` (fdisk) behave differently from defaults, and the 1 MiB / 2048-sector alignment guideline is accurate for modern disks.
- No deprecated commands or flags were used; all tools are current as of Ubuntu 24.04 LTS and util-linux 2.39+.
