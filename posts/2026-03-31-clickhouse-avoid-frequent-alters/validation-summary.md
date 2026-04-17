# Validation Summary: Why You Should Avoid Frequent ALTERs in ClickHouse

## Status
validated

## Post Type
Guide / Best-practices article

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse ALTER TABLE (ADD COLUMN, MODIFY COLUMN, DELETE, UPDATE, MATERIALIZE COLUMN)
- ClickHouse mutations and the `system.mutations` table
- ClickHouse `Map(String, String)` data type and `map()` function

## Sources Consulted
- ClickHouse ALTER COLUMN docs: https://clickhouse.com/docs/sql-reference/statements/alter/column
- ClickHouse ALTER DELETE docs: https://clickhouse.com/docs/sql-reference/statements/alter/delete
- ClickHouse ALTER UPDATE docs: https://clickhouse.com/docs/sql-reference/statements/alter/update
- ClickHouse mutations system table: https://clickhouse.com/docs/operations/system-tables/mutations
- ClickHouse Map data type: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found
1. **"marks rows for deletion asynchronously" comment on `ALTER TABLE ... DELETE`** — This describes lightweight `DELETE FROM` semantics. `ALTER TABLE ... DELETE` is a heavyweight mutation that rewrites affected parts. Changed the comment to: "rewrites affected parts asynchronously as a mutation."
2. **"Queue behind each other (mutations do not run in parallel per table)"** — This is misleading. Per ClickHouse docs, mutations on the same table can be applied to different parts in parallel, and multiple queued mutations can be batched into a single part rewrite. What is guaranteed is that mutations are applied to each part in submission order. Rewrote the bullet to: "Are applied to each part in the order they were submitted."

## Review Notes
- The `MODIFY COLUMN user_id String` example changes a numeric column to `String`, which is a lossy/non-safe conversion and correctly requires a part rewrite. Note for future readers: some MODIFY COLUMN conversions (widening numeric types, making a column `Nullable`, etc.) are metadata-only and do not rewrite data.
- `MATERIALIZE COLUMN` rewrites parts that do not already have the column materialized and supports an `IN PARTITION` clause to limit scope — the "full rewrite" characterization is accurate in practice for a fresh column addition but has these narrowing options.
- Since ClickHouse 23.3+, lightweight `DELETE FROM table WHERE ...` is also available as a faster alternative to `ALTER TABLE ... DELETE` for many use cases; the post's "prefer soft-delete patterns" recommendation remains valid but could mention lightweight deletes in a future revision.
- All listed `system.mutations` columns (`table`, `command`, `create_time`, `is_done`, `parts_to_do`) exist in the documented schema.
- Comma-separated multi-action `ALTER TABLE` syntax and `Map(String, String)` / `map()` function usage are all correct.
