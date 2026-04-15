# Validation Summary: How to Right-Size ClickHouse Instances

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (system tables, query_log, parts, clickhouse-benchmark)
- Linux system monitoring (top)
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse documentation: system.query_log table schema (https://clickhouse.com/docs/en/operations/system-tables/query_log)
- ClickHouse documentation: system.parts table schema (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse documentation: ProfileEvents Map column and available counters (https://clickhouse.com/docs/en/operations/system-tables/query_log#profileevents)
- ClickHouse documentation: clickhouse-benchmark tool (https://clickhouse.com/docs/en/operations/utilities/clickhouse-benchmark)
- ClickHouse documentation: SQL functions - toStartOfMinute, formatReadableSize, substring (https://clickhouse.com/docs/en/sql-reference/functions)
- Linux man pages: top(1) command flags

## Issues Found
No technical issues found.

## Review Notes
- The `ProfileEvents['UserTimeMicroseconds']` Map access syntax requires ClickHouse 21.8+. Older versions used array-based access (`ProfileEvents.Names` / `ProfileEvents.Values`). Since this is a 2026 post and the Map syntax has been standard for years, this is not an issue.
- The memory sizing formula is a practical heuristic, not an official ClickHouse recommendation. It is appropriately presented as such in the post.
- The "1 CPU core per 1-2 GB/s of sustained read throughput" guideline is a rough ballpark that varies significantly by workload type (compression codec, column types, query complexity). The post correctly frames it as "a typical guideline."
- All SQL queries are syntactically correct and use valid column names and functions for the referenced system tables.
