# Validation Summary: How to Troubleshoot 'Input/Output Error' on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel logging (`dmesg`, `journalctl`)
- Block device tooling (`lsblk`, `findmnt`, `/proc/mounts`)
- smartmontools (`smartctl`, `smartd`, `smartd.conf`)
- ext4 filesystem tools (`e2fsck`, `tune2fs`)
- XFS filesystem tools (`xfs_repair`)
- `badblocks`
- `ddrescue` (gddrescue package)
- `mdadm` software RAID
- `nvme-cli`
- `rsync`

## Sources Consulted
- `man badblocks` (verified `-n` vs `-w` semantics; `-w` is destructive write-mode, `-n` is non-destructive read-write)
- `man tune2fs` (verified `-C mount-count` behavior)
- `man smartctl` and smartmontools documentation (https://www.smartmontools.org/)
- `man smartd.conf` (verified DEVICESCAN directive and `-s` regex format `T/MM/DD/d/HH`)
- XFS / xfsprogs release notes — `xfs_check` was removed in xfsprogs 4.0 (2015); the replacement is `xfs_repair -n` for read-only checking (https://man7.org/linux/man-pages/man8/xfs_repair.8.html)
- `man ddrescue` (verified `-d` direct, `-r` retry passes, mapfile argument)
- `man mdadm` (verified `--fail`, `--remove`, `--add` operations)
- nvme-cli documentation (https://github.com/linux-nvme/nvme-cli) — verified `device-self-test --self-test-code=1` for short test and `self-test-log` subcommand
- Linux ATA error message format reference (kernel ata documentation)

## Issues Found
1. **Incorrect `badblocks` flag description** — The original post used `sudo badblocks -w -v /dev/sdb` under a comment labeled "Non-destructive read-write test". Per `man badblocks`, `-w` is the **destructive** write-mode test that erases all data; `-n` is the non-destructive read-write mode. Fixed by replacing the snippet with two separate examples: `-n` correctly labeled as non-destructive, and `-w` correctly labeled as destructive with a stronger warning.
2. **Deprecated `xfs_check` command** — The post recommended `sudo xfs_check /dev/sdb1`. This command was removed from `xfsprogs` in version 4.0 (2015) and is not available on modern Ubuntu. Replaced with `sudo xfs_repair -n /dev/sdb1`, which is the official replacement for read-only XFS checking, and added an inline note explaining the rename.

## Review Notes
- `sudo tune2fs -C 100 /dev/sda1` only triggers an fsck on next boot when `max-mount-counts` (set via `tune2fs -c`) is enabled and lower than the new mount count. On modern ext4 filesystems this is disabled by default (set to 0), so the command will succeed but may not trigger fsck. The post does provide the more reliable `touch /forcefsck` alternative immediately after, so this is acceptable as a secondary technique.
- The SMART attribute IDs (5, 187, 196, 197, 198) and their meanings are the standard ATA SMART attribute set and are correct.
- The smartd.conf `DEVICESCAN -s (S/../.././02|L/../../6/03)` regex is valid: short test daily at 02:00, long test Saturday at 03:00.
- The example dmesg ATA error lines (`ICRC ABRT`, `READ DMA EXT`, `DID_ERROR`) are realistic and match real kernel output.
- `gddrescue` is the correct Ubuntu package name for GNU ddrescue; the binary is `ddrescue`.
- `find ... -exec md5sum {} \; 2>&1 | grep "Input/output error"` will work but is slow on large trees; users dealing with hardware errors may want to consider `dd if=... of=/dev/null` per-file or scripted retries. Not changed since the example is correct as written.
