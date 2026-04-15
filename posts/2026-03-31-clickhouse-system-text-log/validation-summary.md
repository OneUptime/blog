# Validation Summary: How to Use system.text_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL dialect)
- `system.text_log` system table
- `system.query_log` system table (used in correlation query)
- ClickHouse server configuration (`config.xml`)

## Sources Consulted
- ClickHouse official documentation on system.text_log table (https://clickhouse.com/docs/en/operations/system-tables/text_log)
- ClickHouse official documentation on server configuration / system log tables (https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#text_log)
- ClickHouse official documentation on system.query_log (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse SQL function reference for `countIf`, `toStartOfHour`, `today()` (https://clickhouse.com/docs/en/sql-reference/functions)

## Issues Found
1. **Missing "Critical" in level description (line 27):** The text stated that setting `<level>warning</level>` "captures only Warning, Error, and Fatal messages." This omitted "Critical," which falls between Error and Fatal in severity and is also captured. The post's own Key Columns table and several SQL queries correctly included Critical, making this an internal inconsistency. Fixed by adding "Critical" to the list.

## Review Notes
- The XML config comment lists `trace/debug/information/warning/error/fatal` as the valid level values but omits `notice` and `critical`. This is a common simplification in ClickHouse documentation and not technically wrong for configuration purposes, though the Enum in the table itself includes all 8 levels.
- The Key Columns table omits `event_date` (Date type), which is used as a partition key filter in nearly every query in the post. Not an error since the table is labeled "Key Columns" (a curated list), but readers may wonder where `event_date` comes from.
- The correlation query joining `system.text_log` with `system.query_log` uses a 60-second window from `query_start_time`, which is a reasonable heuristic but may miss log messages for long-running queries. This is acceptable for an illustrative example.
- All SQL syntax is correct for ClickHouse's SQL dialect (`countIf`, `toStartOfHour`, `today()`, `INTERVAL`, `LIKE`, Enum string comparisons).
- The Mermaid diagram correctly represents the log level severity hierarchy.
