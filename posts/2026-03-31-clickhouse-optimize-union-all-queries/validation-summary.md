# Validation Summary: How to Optimize UNION ALL Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, query execution, engine types)
- Merge table engine
- MergeTree table engine
- `merge()` table function
- `system.query_log` system table
- `EXPLAIN PIPELINE` statement

## Sources Consulted
- ClickHouse Merge engine documentation: https://clickhouse.com/docs/en/engines/table-engines/special/merge
- ClickHouse `union_default_mode` setting: https://clickhouse.com/docs/en/operations/settings/settings#union_default_mode
- ClickHouse `merge()` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/merge
- ClickHouse `system.query_log` columns: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse EXPLAIN statement: https://clickhouse.com/docs/en/sql-reference/statements/explain
- ClickHouse CREATE TABLE syntax: https://clickhouse.com/docs/en/sql-reference/statements/create/table

## Issues Found
- **Misleading comment on `union_default_mode`**: The line `SET union_default_mode = 'ALL'; -- Default behavior` implied that `'ALL'` is the default value of this setting. In reality, the default is `''` (empty string), which makes bare `UNION` (without an explicit `ALL` or `DISTINCT` keyword) throw an error. Setting it to `'ALL'` makes bare `UNION` behave as `UNION ALL`. Fixed the comment to: `-- Makes bare UNION behave as UNION ALL (default is '' which requires explicit ALL or DISTINCT)`.

## Review Notes
- All SQL syntax (Merge engine creation, `merge()` table function, `EXPLAIN PIPELINE`, `system.query_log` queries, `CREATE TABLE ... AS ... ENGINE`) is correct and verified against official ClickHouse documentation.
- The `CREATE TABLE new_table AS existing_table ENGINE = MergeTree() ORDER BY col` syntax works correctly in practice; the `ORDER BY` is part of the MergeTree engine clause and is accepted alongside the `AS` schema-cloning syntax.
- The Merge engine regex `'^events_20'` correctly avoids matching the `events_all` table itself, preventing recursive reference issues.
- The post's recommendations (consolidate schemas, use Merge engine, push down aggregations, use `merge()` for ad-hoc queries) are all sound ClickHouse optimization patterns.
