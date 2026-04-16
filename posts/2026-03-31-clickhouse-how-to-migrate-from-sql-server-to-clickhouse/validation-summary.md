# Validation Summary: How to Migrate from SQL Server to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree, data types, functions)
- Microsoft SQL Server (T-SQL, bcp, xp_cmdshell)
- clickhouse-client CLI
- CSV data format

## Sources Consulted
- ClickHouse docs: Data types (UUID, String, LowCardinality, UInt32, DateTime64) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse docs: MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs: Date/time functions (toYear) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse docs: UUID functions (generateUUIDv4) — https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions
- ClickHouse docs: Null-handling functions (ifNull) — https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse docs: clickhouse-client — https://clickhouse.com/docs/en/interfaces/cli
- Microsoft Learn: bcp utility — https://learn.microsoft.com/en-us/sql/tools/bcp-utility
- Microsoft Learn: T-SQL DATEPART, ISNULL, TOP, CONVERT, xp_cmdshell — https://learn.microsoft.com/en-us/sql/t-sql/

## Issues Found
No technical issues found.

- `bcp` flags `-c` (character mode), `-t` (field terminator), `-r` (row terminator), `-S`, `-U`, `-P` are all correct.
- The T-SQL WHILE loop with `CONVERT(VARCHAR, @month, 120)` and `DATEADD(month, 1, ...)` is valid syntax.
- ClickHouse DDL uses correct types and `MergeTree()` engine with valid `PARTITION BY` / `ORDER BY` clauses.
- `generateUUIDv4()`, `toYear()`, `count()`, and `ifNull()` are all valid ClickHouse functions used correctly.
- Function translations from T-SQL (DATEPART → toYear, TOP N → LIMIT N, ISNULL → ifNull) are accurate.
- `clickhouse-client --query "... FORMAT CSV" < file.csv` is the correct idiom for CSV ingestion.

## Review Notes
- `DATETIME2` in SQL Server defaults to 100-ns precision (scale 7); mapping to `DateTime64(3)` (millisecond) loses sub-millisecond precision. Acceptable for analytics but worth noting for callers that need full precision — `DateTime64(7)` would preserve it.
- The `bcp` export using `-t"," -r"\n"` with `-c` (character mode) will not properly escape values that contain commas, newlines, or quotes. For production exports of free-text columns, a format file or a different delimiter (e.g. tab) is safer. The post is a tutorial, so this is acceptable simplification.
- `xp_cmdshell` must be explicitly enabled via `sp_configure` on modern SQL Server instances and is disabled by default for security reasons — worth keeping in mind but outside the scope of this post.
- For ongoing replication rather than one-time migration, tools like ClickHouse's `clickhouse-copier`, Debezium + Kafka, or Airbyte/Fivetran are usually preferable; the post focuses on one-shot migration which is a valid scope.
