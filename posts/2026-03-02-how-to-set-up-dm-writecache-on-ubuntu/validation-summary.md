# Validation Summary: How to Set Up dm-writecache on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- dm-writecache (Linux device mapper target)
- dmsetup (device mapper userspace tool)
- LVM2 (lvconvert, lvcreate, pvcreate, vgcreate)
- systemd (oneshot service for device setup)
- ext4 filesystem
- fio (storage benchmarking)
- smartmontools (SSD health monitoring)
- Ubuntu 20.04 / 22.04 (kernel 4.18+)

## Sources Consulted
- Kernel documentation: https://docs.kernel.org/admin-guide/device-mapper/writecache.html
- Kernel source: drivers/md/dm-writecache.c (writecache_ctr, writecache_status, writecache_message functions)
- dmsetup(8) man page: https://man7.org/linux/man-pages/man8/dmsetup.8.html
- lvconvert(8) man page: https://man7.org/linux/man-pages/man8/lvconvert.8.html
- lvmcache(7) man page: https://man7.org/linux/man-pages/man7/lvmcache.7.html

## Issues Found

1. **Incorrect `#opt_params` count in the optional features example.** The original example used `4 high_watermark 80 low_watermark 60 writeback_jobs 64`. Each name/value pair counts as 2 tokens, so three pairs require a count of `6`, not `4`. With `4`, the kernel would stop parsing after `low_watermark 60` and reject the remainder. Fixed to `6`.

2. **Fabricated `dmsetup status` output format.** The original example showed labeled fields like `reads=1234 read_cache_hits=0 writes=5678 write_cache_hits=0 committed_blocks=0 total_blocks=20480 free_blocks=20480 uncommitted_blocks=0`. The kernel `writecache_status()` function only emits plain space-separated numbers in a fixed order: error indicator, n_blocks, freelist_size, writeback_size, then statistics counters. Replaced with the actual format and corrected field descriptions to match the kernel's ordering (total blocks, free blocks, blocks under writeback, then per-stat counters).

3. **Invalid `dmsetup resume --table` invocation in the removal section.** `dmsetup resume` does not accept a `--table` argument — only `create`, `load`, and `reload` do. The correct way to enable cleaner mode on a live device is via the message interface: `dmsetup message wc-data 0 cleaner`. Fixed the removal procedure to use the message form, which is the documented and simpler approach.

## Review Notes

- The post specifies Ubuntu 20.04 and 22.04. dm-writecache is also available on later Ubuntu LTS releases (24.04 ships with kernel 6.8). The wording is not incorrect, just incomplete; not changed since the post's statement remains true.
- The LVM-side cleanup uses `lvconvert --uncache vg-storage/lv-data`. Both `--uncache` (removes the cache LV) and `--splitcache` (preserves it as a standalone LV) are valid for writecache. The post's intent (full removal) matches `--uncache`, so this was left as-is.
- The systemd unit's `WantedBy=local-fs.target` is unusual but valid for a setup unit ordered `Before=local-fs.target`. Not changed.
- The kernel also supports a `clear_stats` message in modern releases; not mentioned in the post but not required for the tutorial's scope.
- The `lvconvert --type writecache --cachevol` syntax requires LVM2 2.03.06+ (December 2019), which is satisfied by Ubuntu 20.04 and newer.
