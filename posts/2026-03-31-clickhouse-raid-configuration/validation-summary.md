# Validation Summary: How to Use RAID Configuration with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (storage configuration, storage policies, replication)
- Linux software RAID via mdadm
- RAID levels 0, 1, 5, 10
- XFS filesystem tuning
- Linux block device configuration (blockdev readahead)

## Sources Consulted
- mdadm(8) man page — `--create`, `--detail`, `--level`, `--raid-devices` flags
- /proc/mdstat kernel documentation — output format for healthy, degraded, and rebuilding arrays
- mount(8) and xfs(5) man pages — `noatime`, `nodiratime`, `allocsize`, `largeio`, `discard` options
- blockdev(8) man page — `--setra` flag and sector-based readahead values
- ClickHouse official documentation — `<path>`, `<tmp_path>`, and `<storage_configuration>` XML config elements
- mdadm.conf(5) — `MAILADDR` directive and mdmonitor service

## Issues Found

### 1. Incorrect grep pattern for detecting degraded RAID arrays (line 115)
- **What was wrong:** The command `cat /proc/mdstat | grep -E "degraded|rebuilding"` will never match anything. `/proc/mdstat` does not contain the literal words "degraded" or "rebuilding". A degraded array is indicated by underscores in the device bitmap (e.g., `[UU_]` or `[U_]`), and a rebuilding array shows `recovery` or `resync` progress lines. This means the command would silently return nothing even on a degraded array, giving a dangerous false "all clear" signal.
- **What was changed:** Replaced with `mdadm --detail /dev/md0 | grep -i "state"`, which correctly outputs the array state including words like "clean", "degraded", "rebuilding", or "recovering" in the `State :` field.

## Review Notes
- `nodiratime` is technically redundant when `noatime` is already specified (since `noatime` prevents access time updates for both files and directories). This is harmless but could be noted for clarity.
- The `discard` mount option in the initial mount command is not included in the `/etc/fstab` entry. This is a minor inconsistency but not necessarily an error — the author may have intentionally omitted it from fstab in favor of periodic `fstrim` instead.
- The RAID level comparison table, mdadm creation commands, XFS formatting, ClickHouse XML configuration, XFS tuning options, readahead settings, and replication vs. RAID discussion are all technically accurate.
- The recommendation of RAID 10 for write-heavy workloads and JBOD with replication for multi-replica setups aligns with ClickHouse community best practices.
