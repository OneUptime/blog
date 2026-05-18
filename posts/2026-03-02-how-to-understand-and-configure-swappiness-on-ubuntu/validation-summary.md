# Validation Summary: How to Understand and Configure Swappiness on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel memory management (vm.swappiness, page cache, anonymous pages)
- sysctl (runtime and persistent configuration via /etc/sysctl.d)
- /proc and /sys interfaces (/proc/sys/vm/swappiness, /proc/meminfo, /proc/*/status, /sys/module/zswap)
- swap management tools (swapon, swapoff, free, vmstat, smem)
- Related vm.* parameters (dirty_ratio, dirty_background_ratio, dirty_writeback_centisecs, dirty_expire_centisecs, vfs_cache_pressure)
- stress-ng for memory pressure testing
- zswap / zram compressed swap

## Sources Consulted
- Linux kernel admin-guide: https://docs.kernel.org/admin-guide/sysctl/vm.html
- Linux kernel zswap docs: https://docs.kernel.org/admin-guide/mm/zswap.html
- mm/page-writeback.c source: https://github.com/torvalds/linux/blob/master/mm/page-writeback.c
- Kernel commit fe35004f ("mm: avoid swapping out with swappiness==0", introduced in 3.5-rc1) — behavior of swappiness=0
- Percona writeup on swappiness=0 vs OOM: https://www.percona.com/blog/oom-relation-vm-swappiness0-new-kernel/
- smem(8) man page: https://man7.org/linux/man-pages/man8/smem.8.html
- stress-ng documentation (Ubuntu manpage / upstream)

## Issues Found
1. **Misleading comment on `vm.dirty_ratio`** — The original comment claimed the 20% default was "before background writeback starts". This conflates `dirty_ratio` (synchronous foreground throttling of writing processes when the threshold is exceeded) with `dirty_background_ratio` (the threshold at which background flusher threads begin writeback, default 10%). Fixed the comment to correctly describe `dirty_ratio` as the hard limit that forces processes performing writes into synchronous writeback, leaving the existing `dirty_background_ratio` comment intact.

## Review Notes
- The swappiness range claim (0–200 in modern kernels, 0–100 historically) is correct; the upper bound was raised to 200 alongside the cgroup v2 memory.swappiness work.
- The swappiness=0 behavior change in kernel 3.5+ (commit `fe35004f`) is accurately described.
- All CLI commands (`sysctl`, `swapon --show`, `vmstat`, `swapoff -a`, `sysctl -p`, `smem -s swap -r`, `stress-ng --vm 4 --vm-bytes 80% --timeout 60`) were verified against current man pages and work as described on supported Ubuntu releases.
- The /proc/*/status `VmSwap` parsing loop is correct (VmSwap line format: `VmSwap:  <kB> kB`, so `$2 $3` captures the value and unit).
- The `/sys/module/zswap/parameters/enabled` path is correct per the official zswap admin guide.
- Minor stylistic note (not changed): the post describes file-backed pages as "cheap to evict because they can be re-read from disk" — strictly true only for clean file pages; dirty file pages must be written back first. This is a reasonable simplification for a tuning-focused guide and not technically wrong.
