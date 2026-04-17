# Validation Summary: How to Build an Audit Trail for Data Changes in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree engine
- Materialized Views
- ClickHouse system tables (`system.mutations`, `system.query_log`)
- SQL

## Sources Consulted
- ClickHouse `system.mutations` documentation: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse `system.query_log` documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse Materialized View documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse source: `src/Parsers/IAST.h` (for `query_kind` enum values)

## Issues Found
- **Incorrect column reference in `system.mutations` query.** The original query referenced a `partition_id` column directly, but `system.mutations` does not expose such a column. The actual column is `block_numbers.partition_id` with type `Array(String)` (paired with `block_numbers.number Array(Int64)`), per the official docs. Running the query as originally written would fail with an unknown identifier error. Fixed by replacing `partition_id` with `arrayStringConcat(block_numbers.partition_id, ',')` so the array is flattened into the `String` column expected by `data_change_audit.partition_key`.

## Review Notes
- The other system-table column references (`event_time`, `tables[1]`, `user`, `written_rows`, `query`, `query_kind`, `type`) in the `system.query_log` query were verified against current ClickHouse documentation and are correct. `query_kind = 'Insert'` and `type = 'QueryFinish'` are valid PascalCase enum values.
- The `CREATE MATERIALIZED VIEW ... TO target_table AS SELECT ...` syntax is correct; column names and order in the SELECT match the `orders_audit_shadow` target table.
- Caveat for readers (not a correctness issue): materialized views in ClickHouse fire on inserts to the source table, but they do not automatically backfill historical data — existing rows in `orders` before the MV is created will not appear in the shadow table unless populated with `POPULATE` at creation or a separate `INSERT ... SELECT`.
- The `system.mutations` polling query only covers ClickHouse-initiated `ALTER TABLE ... UPDATE/DELETE` mutations, not lightweight updates/deletes. If readers are on a newer ClickHouse with lightweight deletes enabled, they may want to also track `system.part_log` for a fuller picture.
- `system.query_log` requires the query log to be enabled (it is by default, but can be disabled via server config); readers on hardened setups should verify the table is populated before relying on it.
