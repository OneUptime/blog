# Validation Summary: How to Use Vertical Format for Human-Readable Output in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL queries, FORMAT clause, system tables)
- clickhouse-client CLI (`\G` shorthand)

## Sources Consulted
- ClickHouse official documentation: Vertical format (`docs/en/interfaces/formats/Vertical.md`) — https://clickhouse.com/docs/en/interfaces/formats#vertical
- ClickHouse official documentation: Formats overview (`docs/en/interfaces/formats.md`) — confirms Vertical is output-only
- ClickHouse official documentation: system.tables (`docs/en/operations/system-tables/tables.md`) — https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation: system.parts (`docs/en/operations/system-tables/parts.md`) — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation: system.replicas (`docs/en/operations/system-tables/replicas.md`) — https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse source code: `src/Client/ClientBase.cpp` — confirms `\G` triggers Vertical output format

## Issues Found
- **Misleading section title "Combining with SETTINGS"**: The section titled "Combining with SETTINGS" contained a query (`SELECT * FROM system.replicas WHERE is_leader = 1 FORMAT Vertical`) that does not use any `SETTINGS` clause. The SQL itself was correct, but the heading was misleading. Renamed the section to "Querying System Replicas" to accurately describe its content.

## Review Notes
- All SQL syntax examples are correct and use valid ClickHouse syntax.
- All system table column names referenced in the output examples (system.tables, system.parts) are verified against official documentation.
- The `\G` shorthand in clickhouse-client is confirmed to work as described, behaving like MySQL's `\G`.
- The claim that Vertical format is output-only is confirmed by official docs: it cannot be used as an input format for INSERT.
- The `SHOW CREATE TABLE ... FORMAT Vertical` example is technically valid — FORMAT clauses can be appended to any output-producing statement — though this specific combination is not explicitly shown in official docs.
- The `system.replicas.is_leader` column is confirmed as a valid `UInt8` column in the official docs.
- Output examples use fabricated data (as expected for a tutorial) but the column names and value types are realistic and accurate.
