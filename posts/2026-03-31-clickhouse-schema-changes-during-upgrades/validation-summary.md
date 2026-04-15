# Validation Summary: How to Handle Schema Changes During ClickHouse Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (SQL dialect, system tables, ALTER TABLE operations)
- MergeTree engine family (settings, mutations, replication)
- ZooKeeper (replication coordination)

## Sources Consulted
- [ClickHouse ALTER TABLE Column Manipulations](https://clickhouse.com/docs/sql-reference/statements/alter/column) — verified ADD COLUMN, MODIFY COLUMN, DROP COLUMN, RENAME COLUMN syntax
- [ClickHouse ALTER TABLE UPDATE (Mutations)](https://clickhouse.com/docs/sql-reference/statements/alter/update) — verified mutation syntax
- [ClickHouse ALTER TABLE Setting Manipulations](https://clickhouse.com/docs/sql-reference/statements/alter/setting) — verified MODIFY SETTING syntax
- [ClickHouse system.merge_tree_settings](https://clickhouse.com/docs/operations/system-tables/merge_tree_settings) — verified table and column names including `changed`
- [ClickHouse system.replication_queue](https://clickhouse.com/docs/operations/system-tables/replication_queue) — verified column names and `ALTER_METADATA` type
- [ClickHouse system.tables](https://clickhouse.com/docs/operations/system-tables/tables) — verified `engine_full`, `total_rows` columns
- [ClickHouse system.columns](https://clickhouse.com/docs/operations/system-tables/columns) — verified column metadata table structure
- [ClickHouse DateTime64 type](https://clickhouse.com/docs/sql-reference/data-types/datetime64) — verified type and precision parameter
- [ClickHouse toDateTime64 function](https://clickhouse.com/docs/sql-reference/functions/type-conversion-functions) — verified function signature `toDateTime64(value, precision [, timezone])`
- [ClickHouse Server Configuration (path setting)](https://clickhouse.com/docs/operations/server-configuration-parameters/settings) — verified default metadata path

## Issues Found
- **Incorrect staged migration step 2**: The original code used `ALTER TABLE events UPDATE timestamp_ns = toDateTime64(timestamp, 9) WHERE timestamp_ns = 0;` to populate the new column. This is incorrect because the column was defined with `DEFAULT toDateTime64(timestamp, 9)`, meaning existing rows return the computed default at read time, not 0. The `WHERE timestamp_ns = 0` condition would only match rows where the original timestamp was epoch (1970-01-01), effectively skipping most rows and failing to materialize the column data. Replaced with `ALTER TABLE events MATERIALIZE COLUMN timestamp_ns;`, which is the idiomatic ClickHouse approach for writing default-expression values into existing parts on disk. Also updated the comment from "Populate in batches" to "Materialize the column in existing parts" since mutations are not batch operations in the traditional sense.

## Review Notes
- The `system.replication_queue` query filters with `WHERE type LIKE 'ALTER%'`, which matches the `ALTER_METADATA` entry type used for schema change propagation. This works correctly but readers should be aware that mutations (ALTER TABLE UPDATE/DELETE) appear as `MUTATE_PART` entries, not ALTER-prefixed types.
- The pre-upgrade audit query filtering `engine_full` for `'%old_setting%'` and `'%deprecated%'` is illustrative rather than functional — users would need to substitute actual deprecated setting names for their specific upgrade path.
- The claim that adding Nullable wrapper is a "safe" online operation is correct in that it doesn't require a full rewrite, but it does trigger a mutation that rewrites affected parts. For very large tables this can still be resource-intensive.
