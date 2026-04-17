# Validation Summary: How to Alter Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL DDL (ALTER TABLE, CREATE MATERIALIZED VIEW, SHOW CREATE)
- ClickHouse materialized views and target tables
- ClickHouse system tables (system.tables)

## Sources Consulted
- ClickHouse ALTER VIEW docs: https://clickhouse.com/docs/sql-reference/statements/alter/view
- ClickHouse CREATE VIEW docs: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse SHOW docs: https://clickhouse.com/docs/sql-reference/statements/show
- ClickHouse system.tables docs: https://clickhouse.com/docs/operations/system-tables/tables
- ClickHouse incremental materialized view guide: https://clickhouse.com/docs/materialized-view/incremental-materialized-view

## Issues Found

1. **Incorrect claim that SELECT cannot be altered.** The original post stated: "ClickHouse does not support modifying the SELECT query of an existing materialized view with a simple `ALTER` statement." This is wrong — ClickHouse supports `ALTER TABLE ... MODIFY QUERY` for this purpose. Updated the "What You Can and Cannot Alter" section to describe the supported behavior and the `TO`-clause caveat (views without `TO` can only change the SELECT section without adding new columns).

2. **Unsupported `CREATE OR REPLACE MATERIALIZED VIEW`.** The post recommended `CREATE OR REPLACE MATERIALIZED VIEW` to update a view's definition. ClickHouse's `OR REPLACE` clause is only documented for normal views, not materialized views. Replaced the "Recreating a View with OR REPLACE" section with "Modifying the View's SELECT with ALTER MODIFY QUERY" using the correct `ALTER TABLE mv MODIFY QUERY SELECT ...` syntax. Updated the "Changing the Target Table Schema First" example to use `ALTER TABLE ... MODIFY QUERY` instead of `CREATE OR REPLACE MATERIALIZED VIEW`.

3. **Non-existent `SHOW CREATE MATERIALIZED VIEW`.** The post used `SHOW CREATE MATERIALIZED VIEW mv_daily_stats;`. The documented `SHOW CREATE` variants are TABLE, DICTIONARY, VIEW, DATABASE, USER, ROLE, ROW POLICY, QUOTA, SETTINGS PROFILE, MASKING POLICY — MATERIALIZED VIEW is not listed. Changed to `SHOW CREATE TABLE mv_daily_stats;`, which is the correct way to inspect a materialized view's definition.

4. **Summary section.** Updated the summary to reflect the corrected guidance (use `ALTER TABLE ... MODIFY QUERY` rather than `CREATE OR REPLACE MATERIALIZED VIEW`).

5. **Description/front matter.** Updated the post description to match the corrected content.

## Review Notes

- The `system.tables` queries are correct — both `create_table_query` and `as_select` are real columns, and filtering by `engine = 'MaterializedView'` is accurate.
- The target-table `ALTER TABLE ... ADD COLUMN ...` example is syntactically correct.
- The `SummingMergeTree` / `AggregatingMergeTree` caveat about merge-time aggregation is accurate.
- `ALTER TABLE ... MODIFY QUERY` has its own caveats that the post only briefly touches: changing column types or removing columns can still require a drop-and-recreate, and the new SELECT must be compatible with the target table's schema. A future version could expand on these nuances.
- The recommendation to alter the target table before changing the view query (to avoid schema mismatches) remains sound advice under the corrected pattern.
