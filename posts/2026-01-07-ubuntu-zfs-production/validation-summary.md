# Validation Summary: How to Configure ZFS on Ubuntu for Production Storage

## Status
validated

## Post Type
Tutorial / Guide (step-by-step ZFS configuration for production)

## Technologies Covered
- ZFS (OpenZFS) on Linux
- Ubuntu (20.04 / 22.04 / 24.04)
- `zpool` / `zfs` CLI utilities (`zfsutils-linux`)
- ZFS pool topologies (mirror, RAIDZ1/2/3, multiple vdevs, SLOG, L2ARC, hot spares)
- Datasets, quotas, reservations, recordsize, xattr/acltype
- Compression (LZ4, ZSTD / ZSTD-N)
- Deduplication (DDT, `zdb`)
- Snapshots, rollback, send/receive
- Sanoid / Syncoid
- Scrubbing, systemd timers, ZED (ZFS Event Daemon)
- ARC tuning and ZFS module parameters
- Disk replacement, import/export

## Sources Consulted
- OpenZFS documentation — `zpool` man page: https://openzfs.github.io/openzfs-docs/man/master/8/zpool.8.html
- OpenZFS documentation — `zfs` man pages (`zfs-destroy`, `zfs-set`, `zfs-snapshot`, `zfs-send`/`zfs-receive`): https://openzfs.github.io/openzfs-docs/man/master/8/
- OpenZFS documentation — `zfsprops` and `zpoolprops` (property reference, including `dedupratio`, `compressratio`): https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- OpenZFS Module Parameters (ARC, txg, dirty data tunables): https://openzfs.github.io/openzfs-docs/Performance%20and%20Tuning/Module%20Parameters.html
- Ubuntu ZFS documentation / `zfsutils-linux` package
- Sanoid / Syncoid project documentation: https://github.com/jimsalterjrs/sanoid

## Issues Found
1. **`zfs get dedupratio` on a dataset (line in "Checking Deduplication Effectiveness")** — `dedupratio` is a pool-level (`zpoolprops`) read-only property, not a dataset property. `zfs get dedupratio datapool/data/backups` would fail with an "invalid property" error. Changed it to `sudo zpool get dedupratio datapool` and updated the comment to note it is a pool-level property. (The post already correctly used `zpool get dedupratio` earlier in the "Enabling Deduplication" section.)
2. **Misleading snapshot deletion "pattern" example (line in "Deleting Snapshots")** — `zfs destroy` does not support shell-glob / wildcard pattern matching. The `%` character is the *range* separator (`firstsnap%lastsnap`), so `datapool/data@daily-2026-01-%` does not "delete multiple snapshots matching a pattern" — it would be parsed as a malformed range and fail. Replaced it with an accurate example using ZFS's comma-separated multi-snapshot list syntax (`datapool/data@daily-2026-01-06,daily-2026-01-07`) and clarified the adjacent range example's comment.

## Review Notes
- Enabling both `zfs-import-cache` and `zfs-import-scan` is shown together. In practice these are mutually exclusive import strategies (cache-based vs. scan-based); most setups enable only `zfs-import-cache`. This is not incorrect/harmful, just slightly redundant — left as-is.
- The "256 zettabytes" maximum pool size is the commonly cited figure for the 128-bit on-disk format and is acceptable.
- Dedup RAM rule-of-thumb (~5 GB per 1 TB) and DDT entry size (~320 bytes) are reasonable, widely-cited estimates; actual values vary with block size and the post correctly frames them as approximate.
- ARC sizing values (`zfs_arc_max=17179869184` = 16 GiB, `zfs_arc_min=4294967296` = 4 GiB) are arithmetically correct.
- The custom `zfs-scrub@.timer`/`.service` units are correct; note that recent OpenZFS packages already ship `zfs-scrub@.timer`, so users may not need to author their own — not an error.
- ZED config variable names (`ZED_EMAIL_ADDR`, `ZED_NOTIFY_INTERVAL_SECS`, `ZED_NOTIFY_VERBOSE`, `ZED_EMAIL_PROG`, `ZED_EMAIL_OPTS`) and the `/etc/zfs/zed.d/zed.rc` path are accurate.
- Database/large-file tuning properties (`recordsize`, `primarycache`, `sync`, `logbias`) and module parameters (`zfs_txg_timeout`, `zfs_dirty_data_max_percent`, `zfs_vdev_async_write_active_max_dirty_percent`) are valid OpenZFS settings.
