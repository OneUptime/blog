# Validation Summary: How to Use system.query_log for Query Analysis in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL functions, server configuration)
- system.query_log table
- ClickHouse SQL functions: normalizeQuery(), formatReadableSize(), formatDateTime(), left(), toStartOfHour(), countIf(), has()
- clickhouse-client CLI
- ClickHouse XML configuration (config.xml)

## Sources Consulted
- ClickHouse official documentation: system.query_log — https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse official documentation: System Tables Overview — https://clickhouse.com/docs/operations/system-tables/overview
- ClickHouse official documentation: Other Functions (normalizeQuery) — https://clickhouse.com/docs/sql-reference/functions/other-functions
- ClickHouse official documentation: String Functions (left) — https://clickhouse.com/docs/sql-reference/functions/string-functions
- ClickHouse official documentation: SYSTEM Statements (FLUSH LOGS) — https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse official documentation: PrettyCompactNoEscapes format — https://clickhouse.com/docs/interfaces/formats/PrettyCompactNoEscapes

## Issues Found

1. **`ALTER TABLE system.query_log MODIFY TTL` is invalid** — The post included a SQL statement `ALTER TABLE system.query_log MODIFY TTL event_date + INTERVAL 30 DAY DELETE;` claiming you can set TTL via ALTER TABLE. ClickHouse system tables cannot be altered (they can only be detached, not dropped or altered). Removed the incorrect SQL block and updated the "Control Retention" section to only show the correct config.xml approach.

2. **`ProfileEvents` column type was imprecise** — The post listed the type as `Map` but the actual type is `Map(String, UInt64)`. Updated to include the full parameterized type for accuracy.

## Review Notes
- The `type` column is technically `Enum8` rather than `Enum`, but `Enum` is acceptable shorthand in a blog context since the Enum values listed are correct.
- The `databases` and `tables` columns are technically `Array(LowCardinality(String))` rather than `Array(String)`. The `LowCardinality` wrapper is a storage optimization detail and does not affect query syntax, so this simplification is acceptable for a tutorial.
- The `left()` function operates on bytes, not UTF-8 characters. For the `query` column (typically ASCII SQL text), this is fine in practice, but readers working with non-ASCII queries should use `leftUTF8()` instead.
- The `event_date` column (type `Date`) is used in the TTL config expression but is not listed in the "Key Columns" table. This is a minor omission — `event_date` does exist as a column and the TTL expression is valid.
- All SQL queries are syntactically correct and use appropriate ClickHouse functions and idioms.
- The `SYSTEM FLUSH LOGS` command, `normalizeQuery()` function, `FORMAT PrettyCompactNoEscapes`, and all other technical claims were verified as correct.
