# Validation Summary: How to Resize ext4 Partitions on a Live Ubuntu System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (system administration)
- ext4 filesystem
- `resize2fs` (e2fsprogs)
- `growpart` (cloud-guest-utils / cloud-utils)
- `parted`
- `fdisk`
- LVM (`lvextend`)
- `e2fsck`
- `tune2fs`
- `lsblk`, `df`, `du`, `find`
- `journalctl`
- `cloud-init`

## Sources Consulted
- `man resize2fs` (e2fsprogs) — confirms the "K/M/G/T" suffixes are power-of-two (GiB)
- `man parted` — confirms valid unit suffixes are "kB/MB/GB/TB" (decimal) and "KiB/MiB/GiB/TiB" (binary); bare "G" is not a documented unit
- `man growpart` (cloud-utils) — verified `growpart DISK PARTITION-NUMBER` synopsis
- GNU Parted manual: https://www.gnu.org/software/parted/manual/parted.html
- `lvextend(8)` manpage — confirms `-L`, `-l +100%FREE`, and `--resizefs` flags
- Ubuntu cloud-init docs for the cc_growpart module (auto-grow behavior on cloud images)

## Issues Found
- **Unit ambiguity in the shrink example (potential data-loss bug).** The original shrink procedure used `resize2fs /dev/sdb1 48G` followed by `(parted) resizepart 1 50G`. `resize2fs`'s "G" is binary (48 GiB ≈ 51.54 GB), while `parted` does not officially accept a bare "G" suffix; where it is accepted at all, it is interpreted as decimal "GB" (50 GB ≈ 46.57 GiB). With that interpretation the partition (46.57 GiB) ends up smaller than the filesystem (48 GiB), causing exactly the corruption the post warns against. Changed the `parted` command to `resizepart 1 50GiB` and added an inline note explaining the unit mismatch and why the explicit `GiB` suffix is required.

## Review Notes
- All other commands are accurate: `growpart` syntax, `resize2fs` online-grow semantics, `lvextend -L +20G` / `-l +100%FREE` / `--resizefs`, `e2fsck -n` for read-only checks, `tune2fs -l`, `df -hT`, the `find -ls | sort -k7 -rn` size-sort, and `journalctl --vacuum-size=500M`.
- The `lsblk` example output ("sda3 ... 38.5G ... # But sda3 only uses 40G worth of sectors") is internally consistent (512M + 1G + 38.5G ≈ 40G prior disk size) but the inline comment phrasing is a little loose — left as-is since it is not technically wrong.
- The note that ext4 supports online grow but not online shrink is correct.
- `resize2fs 1.46.5 (30-Dec-2021)` matches the version shipped in Ubuntu 22.04 LTS; readers on 24.04 will see a newer version string (1.47.x) but the behavior is unchanged.
- The cloud-init `cc_growpart` module does auto-resize the root partition/filesystem on first boot of most cloud-vendor Ubuntu images, so the "check `df -h /` first" recommendation is well-placed.
