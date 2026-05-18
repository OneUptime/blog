# Validation Summary: How to Set Up lvmcache for SSD Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- LVM2 (Logical Volume Manager)
- lvmcache / dm-cache (kernel device mapper cache target)
- Ubuntu 20.04 / 22.04
- fio (I/O benchmarking)
- smartmontools (SSD wear monitoring)

## Sources Consulted
- lvmcache(7) man page — https://man7.org/linux/man-pages/man7/lvmcache.7.html
- lvconvert(8) man page — https://man7.org/linux/man-pages/man8/lvconvert.8.html
- lvchange(8) man page — https://man7.org/linux/man-pages/man8/lvchange.8.html
- lvcreate(8) man page — https://man7.org/linux/man-pages/man8/lvcreate.8.html
- Kernel dm-cache documentation — https://www.kernel.org/doc/Documentation/device-mapper/cache.txt
- Red Hat KB on device-mapper hyphen escaping — https://access.redhat.com/solutions/656673

## Issues Found

Four substantive technical errors found and corrected:

1. **Incorrect default cache mode.** The post claimed "The default mode is writeback." Per lvmcache(7), the default `--cachemode` is `writethrough`. Fixed the "Changing Cache Mode" section to state writethrough is the default, flipped the demonstration command to switch to `writeback` (the more common reason to deviate from default), and updated the dmsetup status example output and its label to show `writethrough` to remain consistent with the natural flow (the verification step runs before any mode change).

2. **dmsetup status field labels swapped.** The `dmsetup status` format for dm-cache is `<metadata block size> <#used>/<#total metadata blocks> <cache block size> <#used>/<#total cache blocks> ...`. The post labeled `928/65536` as "cache blocks" and `29/4096` as "metadata blocks" — these were reversed. Fixed the labels so `928/65536` is metadata and `29/4096` is cache, matching the kernel documentation.

3. **Incorrect dm device name in `dmsetup status` command.** The post used `vg-data-lv--data`. Device-mapper doubles every hyphen in VG and LV names before joining them with a single hyphen, so for VG `vg-data` and LV `lv-data` the correct device name is `vg--data-lv--data`. Fixed and added a brief comment explaining the hyphen-doubling rule.

4. **Redundant lvremove commands after `--uncache` would fail.** Per lvconvert(8), `lvconvert --uncache` separates and *deletes* the cache pool LV (including its sub-LVs). The subsequent `lvremove vg-data/lv-cache` and `lvremove vg-data/lv-cache-meta` would error because those LVs no longer exist after `--uncache`. Removed the two stale lvremove commands and updated the surrounding comment to clarify that `--uncache` performs the cleanup automatically.

## Review Notes
- Default cache policy claim (`smq`) is correct per lvmcache(7). The legacy `mq` policy is now aliased to `smq` in recent kernels — calling `lvchange --cachepolicy mq` still works but the kernel may select `smq` internally. Not flagged because the post's command remains valid.
- Minimum `--chunksize 32k` is correct (lvmcache(7): multiples of 32 KiB between 32 KiB and 1 GiB).
- The post uses the older `--type cache` / `--cachepool` (two-LV pool) workflow. Newer LVM also offers `--cachevol` (single-LV cache) — both are still supported, so no change needed.
- The benchmarking section runs `fio` against `/dev/vg-data/lv-data` with `--direct=1` — this is destructive for `--rw=randwrite` but safe for the read-only examples shown.
- Ubuntu 24.04 (LTS) is not listed in prerequisites; the procedure also works there, but the version list reflects what the post specifies.
