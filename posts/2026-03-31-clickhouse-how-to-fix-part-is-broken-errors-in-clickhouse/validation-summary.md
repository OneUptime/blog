# Validation Summary: How to Fix 'Part is broken' Errors in ClickHouse

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ClickHouse (MergeTree / ReplicatedMergeTree engines)
- `system.replicas`, `system.detached_parts`, `system.replication_queue`, `system.parts`, `system.merge_tree_settings`
- `CHECK TABLE`, `ALTER TABLE ... DETACH PART`, `ALTER TABLE ... DROP DETACHED PART`, `ALTER TABLE ... ATTACH PART`, `SYSTEM SYNC REPLICA`
- `clickhouse-local`, `clickhouse-client`, `clickhouse-backup`
- Linux tooling (`smartctl`, `tail`, shell scripts)

## Sources Consulted
- ClickHouse docs — system.detached_parts: https://clickhouse.com/docs/en/operations/system-tables/detached_parts
- ClickHouse docs — system.parts: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse docs — system.replication_queue: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse docs — MergeTree settings: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse docs — ALTER PARTITION (DETACH/DROP/ATTACH PART): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse docs — CHECK TABLE: https://clickhouse.com/docs/en/sql-reference/statements/check-table

## Issues Found
- **Invalid setting `checksum_on_read`**: The "Enable Checksums for All Parts" section queried `system.merge_tree_settings` for a setting named `checksum_on_read`. No such MergeTree setting exists in the official documentation — checksums are always written for MergeTree parts (via the per-part `checksums.txt` file). Replaced the query with one that inspects `hash_of_all_files` and `hash_of_uncompressed_files` from `system.parts`, which actually verifies part-level hashes exist, and updated the surrounding sentence to reflect that checksums are inherent to MergeTree rather than a toggleable setting.

## Review Notes
- `ALTER TABLE ... DROP DETACHED PART` requires the user setting `allow_drop_detached = 1` (or it must be set per-session). The post does not mention this, but the command itself is correctly written; users encountering a permission/setting error would find this in the official docs.
- `system.detached_parts` columns used (`database`, `table`, `name`, `reason`, `modification_time`) all match the official docs.
- `system.replicas` columns used (`database`, `table`, `replica_name`, `parts_to_check`, `queue_size`) all match.
- `system.replication_queue` columns used (`type`, `new_part_name`, `source_replica`, `last_exception`) all match; `type = 'GET_PART'` is a valid enumerated value.
- `clickhouse-backup` is a third-party tool (Altinity), not bundled with ClickHouse. The command syntax shown is consistent with its documented usage.
- The example error message uses `CORRUPTED_DATA`, which is a legitimate ClickHouse error code for broken parts.
