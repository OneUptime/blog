# Validation Summary: How to Delete Duplicate Rows in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ReplacingMergeTree engine
- CollapsingMergeTree engine
- MergeTree engine
- ClickHouse SQL (FINAL, argMax, row_number window function, DISTINCT ON, ALTER TABLE DELETE mutation)

## Sources Consulted
- ClickHouse Lightweight DELETE docs: https://clickhouse.com/docs/en/sql-reference/statements/delete
- ClickHouse ALTER TABLE DELETE (mutations): https://clickhouse.com/docs/en/sql-reference/statements/alter/delete
- ClickHouse ReplacingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CollapsingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse SELECT FINAL clause: https://clickhouse.com/docs/en/sql-reference/statements/select/from
- ClickHouse argMax aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse DISTINCT ON: https://clickhouse.com/docs/en/sql-reference/statements/select/distinct

## Issues Found
- Option 3 incorrectly described `ALTER TABLE events DELETE WHERE ...` as a "lightweight delete (ClickHouse 22.8+)". In ClickHouse, lightweight DELETE uses the `DELETE FROM table WHERE ...` syntax (introduced in 22.8 as experimental, GA in 23.3). The `ALTER TABLE ... DELETE` form shown in the example is the heavyweight mutation-based delete that has existed since much earlier. Changed the wording to "use a DELETE mutation via `ALTER TABLE`" so the description matches the actual SQL shown.

## Review Notes
- The `SELECT DISTINCT ON (event_id) *` syntax in Option 4 is supported by ClickHouse, but the row that gets retained per group is not strictly guaranteed by the ORDER BY clause as it would be in PostgreSQL semantics. For strictly deterministic "latest row per key" deduplication, the `argMax` / window-function approaches in Option 2 are more reliable. The post's intent and example still produce a deduplicated table, so left as-is.
- `ReplacingMergeTree` deduplication is performed on the `ORDER BY` (sorting) key, which the post correctly reflects (`ORDER BY (event_id)` and "highest version per `event_id`").
- `FINAL` carries a real performance cost; the post's brief description is accurate but readers should note this for large tables.
