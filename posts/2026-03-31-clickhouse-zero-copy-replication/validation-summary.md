# Validation Summary: How to Use Zero-Copy Replication in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, replication)
- Zero-copy replication
- S3 / Object Storage integration
- ZooKeeper / ClickHouse Keeper

## Sources Consulted
- ClickHouse official documentation: MergeTree settings (https://clickhouse.com/docs/en/operations/settings/merge-tree-settings)
- ClickHouse official documentation: Storing data on external storage (https://clickhouse.com/docs/en/operations/storing-data)
- ClickHouse official documentation: system.events table (https://clickhouse.com/docs/en/operations/system-tables/events)
- ClickHouse official documentation: system.replication_queue table (https://clickhouse.com/docs/en/operations/system-tables/replication_queue)
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse source code (ReplicatedMergeTreeLogEntry.h, ProfileEvents.cpp)

## Issues Found

1. **Missing experimental/production warning (critical):** The post presented zero-copy replication as a production-ready feature. ClickHouse documentation explicitly states this is experimental and "not ready for production," disabled by default since version 22.8. Added a prominent warning at the top of the post.

2. **Fabricated `allow_s3_native_copy` disk setting:** The S3 disk configuration included `<allow_s3_native_copy>true</allow_s3_native_copy>`, which does not exist in ClickHouse. Zero-copy replication is enabled via the MergeTree setting, not a disk-level setting. Removed this line from the configuration example.

3. **Wrong replication queue type `FETCH_PART`:** The post claimed that `FETCH_PART` entries are replaced by `CLONE_PART_FROM_SHARD` with zero-copy. `FETCH_PART` is not a valid replication queue type (the correct name is `GET_PART`), and `CLONE_PART_FROM_SHARD` is for cross-shard cloning, not zero-copy replication. Zero-copy still uses `GET_PART` entries but fulfills them via metadata registration instead of data transfer. Corrected the explanation.

4. **Fabricated event names `ZeroCopyReplicationLockWait` and `ZeroCopyReplicationLockAcquire`:** These event names do not exist in ClickHouse's system.events table or source code. Replaced with guidance to monitor actual S3-related events (`DiskS3GetObject`, `DiskS3CopyObject`) and the replication queue.

5. **Wrong MergeTree setting name:** `zero_copy_merge_mutation_min_parts_size_sleep_before_send` does not exist. The actual setting is `zero_copy_merge_mutation_min_parts_size_sleep_before_lock` (default: 1 GiB). Fixed the setting name and corrected the default value from 1 MiB to 1 GiB.

## Review Notes
- The `allow_remote_fs_zero_copy_replication` setting has been explicitly marked as not production-ready by the ClickHouse team for several versions. If the feature status changes in the future, the warning should be updated accordingly.
- The overall conceptual explanation of how zero-copy replication works (metadata pointers in Keeper, shared S3 objects, immutable parts) is accurate.
- The `system.parts` and `system.replication_queue` SQL queries use correct column names and are valid.
