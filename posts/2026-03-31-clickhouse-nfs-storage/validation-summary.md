# Validation Summary: How to Configure ClickHouse with NFS Storage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (storage configuration, MergeTree engine, TTL policies, system tables)
- NFS (Network File System) — client setup, mount options, fstab configuration
- Linux system administration (package installation, mount management, file permissions)

## Sources Consulted
- ClickHouse documentation on storage configuration (disks and storage policies): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse documentation on MergeTree settings (`min_bytes_to_use_direct_io`): https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse documentation on disk caching (`cache` disk type, introduced in 22.8): https://clickhouse.com/docs/en/operations/storing-data#using-local-cache
- ClickHouse `system.disks` and `system.parts` table schemas: https://clickhouse.com/docs/en/operations/system-tables/disks
- Linux NFS mount options (`nfs(5)` man page): mount flags `hard`, `timeo`, `retrans`, `rsize`, `wsize`, `nofail`, `_netdev`
- Previously validated ClickHouse blog posts in this repository (SSD tuning, S3 storage disk, storage policies) for cross-referencing configuration patterns

## Issues Found

### Issue 1: Invalid `use_direct_io` disk-level parameter
- **What was wrong:** The post used `<use_direct_io>false</use_direct_io>` inside the disk XML configuration and stated "Setting `use_direct_io` to `false` is important." This is not a valid ClickHouse disk-level parameter. ClickHouse silently ignores unknown XML elements in disk configuration, so it would not cause an error, but it also would not disable direct I/O as claimed.
- **What was changed:** Removed `<use_direct_io>false</use_direct_io>` from both disk XML blocks. Replaced the explanation with the correct mechanism: ClickHouse controls direct I/O through the MergeTree table setting `min_bytes_to_use_direct_io`, which defaults to `0` (disabled). Added an `ALTER TABLE ... MODIFY SETTING` example for cases where the server overrides this globally.
- **Why:** Direct I/O in ClickHouse is a MergeTree engine setting, not a disk property. The correct setting is `min_bytes_to_use_direct_io` (default 0 = disabled). Readers following the original instructions would believe they had disabled O_DIRECT when they had not.

### Issue 2: Deprecated inline cache configuration
- **What was wrong:** The performance section used `<cache_enabled>true</cache_enabled>`, `<cache_path>`, and `<cache_size>` as inline parameters within the `nfs_cold` disk definition. These are deprecated/legacy parameters that are not valid for local path-based disks in modern ClickHouse.
- **What was changed:** Replaced with the modern `cache` disk type approach (available since ClickHouse 22.8). The NFS disk is now wrapped by a separate `<nfs_cold_cache>` disk of `<type>cache</type>`, with `<disk>nfs_cold</disk>`, `<path>`, and `<max_size>` parameters. Added a note to reference `nfs_cold_cache` in the volume definition.
- **Why:** Since ClickHouse 22.8, disk caching is configured as a separate disk layer that wraps the underlying disk. The inline parameters would be silently ignored, giving readers a false sense that caching was enabled.

### Issue 3: Summary referenced invalid setting
- **What was wrong:** The summary section said "Always set `use_direct_io` to false" which referenced the non-existent disk parameter.
- **What was changed:** Updated to "Ensure `min_bytes_to_use_direct_io` remains at its default of `0` to prevent O_DIRECT on NFS."
- **Why:** Consistency with the corrected explanation above.

## Review Notes
- The NFS mount options (`hard`, `timeo=600`, `retrans=5`, `rsize`/`wsize` at 1 MiB, `nofail`, `_netdev`) are all correct and well-documented. The `timeo=600` description as "tenths of a second (60 seconds)" is accurate for NFS.
- The `max_data_part_size_bytes` volume setting for restricting part sizes on the hot volume is valid ClickHouse syntax and correctly described.
- All SQL examples (`CREATE TABLE`, `ALTER TABLE ... MODIFY TTL`, `system.disks` and `system.parts` queries) are syntactically correct and use valid column names and functions.
- The `move_factor` of `0.2` is a valid storage policy setting (default is `0.1`).
- Package names `nfs-common` (Debian/Ubuntu) and `nfs-utils` (RHEL/CentOS) are correct.
- The post defines a disk named `local` pointing to `/var/lib/clickhouse/`, which duplicates the built-in `default` disk path. This is technically valid but could be confusing — readers might prefer using the built-in `default` disk name instead. Not changed since it works correctly.
