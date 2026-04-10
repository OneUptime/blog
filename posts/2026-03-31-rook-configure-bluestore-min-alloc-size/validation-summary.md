# Validation Summary: How to Configure bluestore_min_alloc_size in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- BlueStore `bluestore_min_alloc_size` parameter
- Rook-Ceph operator (Kubernetes)
- `ceph` CLI and admin socket commands
- `ceph-bluestore-tool`

## Sources Consulted
- Ceph BlueStore configuration reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph perf counters documentation: https://docs.ceph.com/en/latest/dev/perf_counters/
- Ceph BlueStore internals (allocation and deferred write paths)
- Rook-Ceph Advanced Configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- `ceph-bluestore-tool` man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/

## Issues Found

1. **Incorrect SSD default value**: The post stated the default `bluestore_min_alloc_size_ssd` is 16384 (16 KB) in Ceph Quincy+. The actual default has been 4096 (4 KB) for SSD since well before Quincy, and remains 4096 in Quincy+. Fixed to 4096 (4 KB).

2. **Invalid OSD verification command**: The post used `ceph-osd -i 0 --dump-log | grep alloc_size` to check the min_alloc_size baked into an OSD. `--dump-log` is not a standard `ceph-osd` flag for this purpose. Replaced with `ceph-bluestore-tool show-label --path /var/lib/ceph/osd/ceph-0/`, which is the correct tool for inspecting OSD label metadata including the min_alloc_size used at creation.

3. **Incorrect admin socket subcommand**: The post used `ceph daemon osd.0 config show bluestore_min_alloc_size`. The `config show` subcommand dumps all configuration and does not accept a specific option name as an argument. The correct subcommand for querying a specific config value is `config get`. Fixed to `ceph daemon osd.0 config get bluestore_min_alloc_size`.

4. **Broken perf counter script (space amplification)**: The script accessed `bluestore_allocated` and `bluestore_stored` via `.get('sum', 0)`, assuming they are averaged counters with `{avgcount, sum}` format. These are u64 counters that appear as plain integers in `perf dump` output. Calling `.get()` on an integer would raise `AttributeError`. Fixed to access the values directly as integers.

5. **Broken perf counter script (WAL usage)**: Same issue as above — `bluestore_write_deferred` and `bluestore_write_big` are u64 counters (plain integers), not averaged counters. The script used `.get('avgcount', 0)` which would crash. Fixed to access the values directly.

## Review Notes
- The post uses "WAL" as shorthand for the deferred write path. Technically, small writes in BlueStore go through the "deferred write" mechanism (written to the RocksDB journal first, then asynchronously applied to the main block device). While "WAL" is an imprecise term here (the WAL is specifically the RocksDB Write-Ahead Log), this is a common simplification in the Ceph community and is not misleading enough to warrant correction in a blog post.
- The Rook-Ceph ConfigMap example (`rook-config-override`) is correct and follows the standard Rook pattern for custom Ceph configuration.
- The recommendation table for choosing `min_alloc_size` values is sound guidance for common workloads.
- The critical point that `min_alloc_size` is baked in at OSD creation time and cannot be changed without OSD recreation is correctly emphasized.
