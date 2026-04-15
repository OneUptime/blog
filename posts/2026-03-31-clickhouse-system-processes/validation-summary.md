# Validation Summary: How to Use system.processes to Monitor Active Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL syntax, KILL statements, settings)
- Bash scripting (shell-based monitoring scripts)
- clickhouse-client CLI

## Sources Consulted
- [system.processes | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/processes)
- [KILL Statements | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/kill)
- [formatReadableSize | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/other-functions)
- [String functions (left) | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/string-functions)
- [Nullable functions (nullIf) | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls)
- [max_execution_time | ClickHouse Docs](https://clickhouse.com/docs/knowledgebase/query_max_execution_time)
- [PrettyCompactNoEscapes format | ClickHouse Docs](https://clickhouse.com/docs/interfaces/formats/PrettyCompactNoEscapes)
- [system.query_log | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/query_log)

## Issues Found
- **ProfileEvents column type**: The `ProfileEvents` column was listed with type `Map` in the column table. The actual ClickHouse type is `Map(String, UInt64)`. Fixed to use the full type signature for accuracy.

## Review Notes
- The column table intentionally lists only "key columns" and is not exhaustive. The actual `system.processes` table has many additional columns (e.g., `is_initial_query`, `initial_user`, `address`, `port`, `thread_ids`, `current_database`, `Settings`, etc.). This is appropriate for a tutorial-style post.
- The `users.xml` snippet for `<max_execution_time>` is shown without surrounding profile context (`<profiles><default>...</default></profiles>`). This is a minor simplification but acceptable as it focuses on the relevant setting element.
- All SQL examples use correct ClickHouse syntax: `KILL QUERY WHERE ... SYNC`, `FORMAT PrettyCompactNoEscapes`, `formatReadableSize()`, `left()`, `nullIf()`, and `round()` are all valid.
- The `system.query_log` correlation query correctly uses `type = 'QueryFinish'` (valid Enum8 value) and references real columns (`query_duration_ms`, `read_rows`, `memory_usage`, `exception`).
- The explanation that `system.processes` is node-local in distributed clusters is accurate.
- Bash scripts are syntactically correct and use proper quoting.
