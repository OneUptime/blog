# Validation Summary: How to Handle Data Corrections in Immutable ClickHouse Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse MergeTree / ReplacingMergeTree engines
- ALTER TABLE UPDATE (mutations)
- Lightweight DELETE
- Partition management (DROP PARTITION)
- system.mutations system table

## Sources Consulted
- ClickHouse ALTER UPDATE docs: https://clickhouse.com/docs/sql-reference/statements/alter/update
- ClickHouse system.mutations: https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse lightweight DELETE: https://clickhouse.com/docs/sql-reference/statements/delete
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse ALTER PARTITION: https://clickhouse.com/docs/sql-reference/statements/alter/partition

## Issues Found
- **Lightweight DELETE availability**: The original text said "Available in ClickHouse 22.8+", which is misleading. Lightweight DELETE was introduced as an experimental feature in 22.8 and only became generally available (production-ready) in 23.3. Updated to: "Introduced as experimental in ClickHouse 22.8 and generally available since 23.3".

## Review Notes
- The `ALTER TABLE UPDATE` example is valid; note that ClickHouse does not allow updating primary-key or partition-key columns — this constraint is implicit but worth knowing.
- All four columns referenced from `system.mutations` (`command`, `is_done`, `parts_to_do`, `create_time`) are valid. Newer versions also expose `parts_to_do_names` for more granular visibility.
- The lightweight DELETE semantics described (deletion mask, physical removal during next merge) match the official docs; the `_row_exists` hidden column implements this. Note: "immediately" is true under the default synchronous behavior; if `lightweight_deletes_sync=0` is set, the mutation runs asynchronously.
- ReplacingMergeTree with a version column and `SELECT ... FINAL` behaves as described. FINAL carries query-time overhead and deduplication only truly consolidates across parts during merges — a caveat worth mentioning for high-throughput systems.
- `DROP PARTITION '202501'` (quoted string) is accepted by ClickHouse; the unquoted integer form `DROP PARTITION 202501` is slightly more idiomatic for `toYYYYMM(...)` partition keys but both work, so no change was made.
