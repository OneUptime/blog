# Validation Summary: How to Set Up Btrfs on Ubuntu for Data Integrity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Btrfs (B-tree filesystem)
- Ubuntu (20.04+)
- `btrfs-progs` userspace tools
- `btrfsmaintenance` (systemd timer units for scrub/balance/trim)
- `compsize` / `btrfs-compsize` (compression ratio reporting)
- systemd timers, `/etc/fstab`, `blkid`
- Linux kernel Btrfs module (mainline)

## Sources Consulted
- Official Btrfs Wiki / kernel.org documentation: https://btrfs.readthedocs.io/
- `mkfs.btrfs(8)` man page (profiles: single, dup, raid0, raid1, raid10, raid5, raid6)
- `btrfs(8)` man page (filesystem, scrub, balance, device, check subcommands)
- `btrfs-balance(8)` man page (`-mconvert`, `-dconvert`, `-dusage` filters)
- Ubuntu package listings:
  - `btrfs-progs` (jammy/noble main)
  - `btrfs-compsize` (jammy/noble universe)
  - `btrfsmaintenance` (provides `btrfs-scrub@.timer`, `btrfs-balance.timer`, etc.)
- Btrfs status page on RAID 5/6 reliability caveats
- Linux kernel changelog for `discard=async` (added in 5.6) and `space_cache=v2` default behavior

## Issues Found

1. **Incorrect metadata RAID 1 conversion for single-disk setup** (fixed).
   - The "Metadata redundancy" section claimed: "Even for a single-disk setup, keep metadata replicated" followed by `sudo btrfs balance start -mconvert=raid1 /data`. The `raid1` profile in Btrfs requires at least two devices, so this command would fail on a single-disk filesystem.
   - Fix: Updated the section to recommend `-mconvert=dup` for single-disk setups (which keeps two metadata copies on the same disk) and `-mconvert=raid1` for multi-device setups. This matches Btrfs's own defaults (DUP for single-disk metadata on HDD, RAID1 for multi-device).

2. **Missing `btrfsmaintenance` package dependency for systemd scrub timers** (fixed).
   - The "Schedule automatic scrubs" section uses `systemctl enable --now btrfs-scrub@-.timer`, but the templated unit `btrfs-scrub@.timer` is not shipped by `btrfs-progs` on Ubuntu — it is provided by the separate `btrfsmaintenance` package. Without it, the commands fail with "Unit not found".
   - Fix: Added `sudo apt install btrfsmaintenance` before the `systemctl enable` commands.

## Review Notes

- All `mkfs.btrfs` invocations (single disk, RAID 1, RAID 10, RAID 0 + RAID 1 metadata) are syntactically correct.
- Mount option list is accurate: `compress=zstd[:level]` (levels 1–15), `autodefrag`, `noatime`, `discard=async` (kernel 5.6+, available on Ubuntu 20.04 HWE and later), `space_cache=v2` (default on recent kernels and the only supported value in current kernels — `v1` is being phased out).
- `btrfs scrub`, `btrfs filesystem show/df/usage`, `btrfs device add/remove`, `btrfs balance start [-dusage=N]`, `btrfs check [--repair]`, and `btrfs filesystem defragment -r -v -czstd` are all valid commands with correct flags.
- The fstab `0 0` recommendation for dump/fsck fields is correct — Btrfs has no fsck pass at boot and uses its own integrity mechanisms.
- The RAID 5/6 stability caveat remains accurate as of 2026 — write-hole and recovery-after-crash issues are still documented in upstream Btrfs status.
- The Btrfs-vs-ZFS comparison is fair and accurate for Ubuntu deployments.
- The fictional sample outputs (scrub status, `filesystem usage`, `compsize`) use plausible numbers and formatting matching real `btrfs-progs` output.
- The post correctly notes that checksumming cannot be disabled in Btrfs (CRC32C is the default, with optional xxhash, sha256, blake2b in newer versions — not mentioned but not incorrect to omit at this level).
