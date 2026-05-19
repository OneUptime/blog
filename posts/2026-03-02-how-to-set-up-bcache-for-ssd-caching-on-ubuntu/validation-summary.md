# Validation Summary: How to Set Up Bcache for SSD Caching on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- bcache (Linux block layer cache)
- Linux kernel sysfs interface
- bcache-tools (make-bcache, bcache-super-show)
- Ubuntu package management (apt)
- XFS filesystem (mkfs.xfs)
- fio (benchmarking)
- hdparm, lsblk, blkid, wipefs (storage utilities)

## Sources Consulted
- Linux kernel bcache documentation: https://www.kernel.org/doc/Documentation/bcache.txt (and admin-guide/bcache.rst)
- bcache-tools manpages: make-bcache(8), bcache-super-show(8)
- bcache wiki: https://bcache.evilpiepirate.org/
- Ubuntu documentation for bcache-tools package
- fio documentation: https://fio.readthedocs.io/

## Issues Found

1. **Incorrect sysfs path for `cache_available_percent`** (Monitoring Cache Performance section)
   - Was: `cat /sys/block/sdc/bcache/cache/cache_available_percent`
   - Fixed to: `cat /sys/fs/bcache/*/cache_available_percent`
   - Why: Per kernel bcache documentation, `cache_available_percent` is exposed at the cache set level under `/sys/fs/bcache/<cset-uuid>/`, not under a `cache/` subdirectory of the cache block device.

2. **Incorrect sysfs path for `writeback_delay`** (Tuning bcache section)
   - Was: `echo 30 | sudo tee /sys/fs/bcache/*/internal/writeback_delay 2>/dev/null`
   - Fixed to: `echo 30 | sudo tee /sys/block/bcache0/bcache/writeback_delay`
   - Why: `writeback_delay` is a per-backing-device tunable at `/sys/block/bcache<N>/bcache/writeback_delay`, not under the cache set's `internal/` directory. The previous path silently failed (the `2>/dev/null` masked it).

## Review Notes
- Bcache being merged in Linux 3.10 is correct.
- `make-bcache -B`, `make-bcache -C`, and combined `-B ... -C ...` invocations are accurate.
- Default cache mode being `writethrough` is correct per kernel docs.
- `cache_mode` valid values (`writethrough`, `writeback`, `writearound`, `none`) are correct.
- Cache state `clean` after a fresh attach (no dirty data yet) is accurate; other documented states are `no cache`, `dirty`, `inconsistent`.
- The `attach`, `detach`, `stop`, `writeback_percent`, `dirty_data`, `sequential_cutoff`, and `readahead` sysfs entries used are all valid per kernel docs.
- `/sys/fs/bcache/register` for manual registration is correct.
- `hdparm -I` works for SATA devices; NVMe SSDs would require `nvme id-ctrl` instead — not incorrect, but worth knowing if readers use NVMe caches.
- The `io_error_limit` reference is at the correct cache-set path (only shown in a comment).
- fio command flags are valid.
