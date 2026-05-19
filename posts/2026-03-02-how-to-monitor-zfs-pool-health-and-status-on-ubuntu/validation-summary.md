# Validation Summary: How to Monitor ZFS Pool Health and Status on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ZFS / OpenZFS (zpool, zfs CLI)
- Ubuntu (24.04 Noble verified)
- ZED (ZFS Event Daemon, `zfs-zed` package)
- Bash scripting
- cron (`/etc/cron.d`)
- Prometheus / `prometheus-node-exporter`
- ZFS ARC (Adaptive Replacement Cache) statistics via `/proc/spl/kstat/zfs/arcstats`

## Sources Consulted
- OpenZFS upstream `zed.rc` source: https://github.com/openzfs/zfs/blob/master/cmd/zed/zed.d/zed.rc
- `zpool-iostat(8)` man page: https://openzfs.github.io/openzfs-docs/man/master/8/zpool-iostat.8.html
- `zpool-status(8)`, `zpool-list(8)`, `zpool-clear(8)` OpenZFS man pages
- Ubuntu Noble (24.04) package archive (apt-cache lookups)
- Prometheus node_exporter source: https://github.com/prometheus/node_exporter (zfs collector)

## Issues Found

1. **Invalid ZED configuration variable `ZED_LOG_EVERYTHING`.** The post recommended setting `ZED_LOG_EVERYTHING=0` in `/etc/zfs/zed.d/zed.rc`. This variable does not exist in upstream OpenZFS — the canonical zed.rc supports variables such as `ZED_DEBUG_LOG`, `ZED_SYSLOG_PRIORITY`, `ZED_NOTIFY_VERBOSE`, etc., but not `ZED_LOG_EVERYTHING`. Setting it would be silently ignored. **Fix:** removed the line and its "Log level" comment from the zed.rc snippet.

2. **Non-existent Ubuntu package `prometheus-zfs-exporter`.** The post instructed `sudo apt install prometheus-zfs-exporter`, but no such package exists in Ubuntu 24.04 Noble (or any current Ubuntu/Debian standard repo). The metric names shown (`zfs_pool_health`, `zfs_pool_allocated_bytes`, etc.) also don't exactly match any single packaged exporter. **Fix:** replaced the section with `prometheus-node-exporter` (which is in Ubuntu universe and includes a ZFS collector). Updated install command, service name, port (9100), grep filter (`node_zfs`), Prometheus scrape job name, and the sample metrics list to reflect what node_exporter actually exports from `/proc/spl/kstat/zfs/` (ARC stats and per-pool `nread`/`nwritten`).

## Review Notes

- The `zpool iostat -ql 5` command (combining `-q` queue stats and `-l` latency) is valid — the man page explicitly documents the `[-lq]` combined form.
- The scrub output format `scrub repaired 0 in 02:14:22 with 0 errors` is acceptable; modern OpenZFS often shows `0B` instead of `0`, but the bare number form still appears in practice.
- The `zpool iostat -v` example shows the mirror vdev as `mirror` without a numeric suffix; modern OpenZFS typically shows `mirror-0`. This is a cosmetic inconsistency with the earlier example in the same post but not technically incorrect output (some older or custom layouts can show this).
- The custom `zfs-health-check.sh` script's awk pipeline that parses `zpool status` lines via `NR>7` is fragile — the header line count can vary if a pool has many devices or extra status lines (e.g., during a scrub/resilver). It generally works but users should be aware it may miss devices in atypical pool layouts. Left as-is since the post presents it as an example rather than a hardened tool.
- The recommended capacity threshold of 85% (warning) is reasonable; OpenZFS performance is known to degrade noticeably above ~80% pool fill, with severe degradation past ~95%.
- The ARC hit-ratio calculation (hits / (hits + misses)) is correct, though "demand" hit ratio (excluding prefetch) is often a more useful metric for real workload effectiveness — left unchanged since the broad definition the post uses is also commonly reported.
