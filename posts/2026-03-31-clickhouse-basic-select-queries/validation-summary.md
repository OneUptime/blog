# Validation Summary: How to Write Basic SELECT Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Introductory guide

## Technologies Covered
- ClickHouse (SQL dialect)
- ClickHouse system tables (`system.databases`, `system.tables`, `system.processes`, `system.settings`)
- ClickHouse MergeTree engine
- ClickHouse built-in functions (`if`, `concat`, `round`, `formatReadableSize`, `now`, `version`, `toDate`)

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs
- ClickHouse SQL reference — SELECT: https://clickhouse.com/docs/en/sql-reference/statements/select
- ClickHouse system tables reference: https://clickhouse.com/docs/en/operations/system-tables
- ClickHouse functions reference (conditional, string, math, date/time): https://clickhouse.com/docs/en/sql-reference/functions
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types reference: https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
No technical issues found.

All SQL examples are syntactically correct and use valid ClickHouse system-table columns, functions, data types, and engine syntax. Verified:
- `system.databases`, `system.tables`, `system.processes`, `system.settings` column references are all valid.
- `if(cond, then, else)`, `CASE WHEN`, `concat()`, `round()`, `formatReadableSize()`, `now()`, `version()`, `toDate()` all exist with the signatures used.
- Alias reuse in `ORDER BY`/`GROUP BY` is a genuine ClickHouse feature (extension beyond standard SQL).
- `ENGINE = MergeTree() ORDER BY (col1, col2)` tuple syntax is the documented form for composite sorting keys.
- Data types `UInt64`, `UInt32`, `String`, `Float64`, `DateTime` are all valid.

## Review Notes
- `total_rows` and `total_bytes` in `system.tables` are `Nullable(UInt64)` and only populated for certain engines (MergeTree family, Memory, Buffer). The examples use MergeTree, so values will populate; a reader running the `size_mb` query against non-MergeTree tables may see NULL results, but this is not an error in the post.
- The `current_time` alias in the literals example shadows the `CURRENT_TIME` SQL standard keyword name but is not a reserved identifier in ClickHouse, so the query works as written.
- Post is concise, accurate, and uses current (non-deprecated) APIs throughout.
