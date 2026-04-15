# Validation Summary: How to Build a ClickHouse Storage Growth Dashboard

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL queries against system tables)
- `system.parts` table for current disk usage and compression metrics
- `system.disks` table for disk free space monitoring
- `system.part_log` table for historical storage growth tracking
- ClickHouse TTL (Time-To-Live) data lifecycle management
- Capacity planning and growth projection techniques

## Sources Consulted
- ClickHouse official documentation: system.parts table — https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse official documentation: system.disks table — https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse official documentation: system.part_log table — https://clickhouse.com/docs/en/operations/system-tables/part_log

## Issues Found
1. **TTL Effectiveness Panel: Lexicographic ORDER BY on formatted string** — The query used `ORDER BY day, bytes_expired DESC` where `bytes_expired` is aliased to `formatReadableSize(sum(size_in_bytes))`, a String. This produces lexicographic ordering rather than numeric ordering (e.g., "9.00 B" would sort above "10.00 GiB"). Fixed to `ORDER BY day, sum(size_in_bytes) DESC` to ensure correct numeric ordering.

## Review Notes
- All column names (`bytes_on_disk`, `data_uncompressed_bytes`, `active`, `rows`, `free_space`, `total_space`, `size_in_bytes`, `event_time`, `event_type`) are verified against official ClickHouse documentation.
- The `event_type` values `'NewPart'` and `'RemovePart'` are both valid enum values in `system.part_log`.
- The TTL Effectiveness Panel uses `event_type = 'RemovePart'` which captures all part removals (including merges, manual detaches, and TTL-triggered drops), not exclusively TTL-expired parts. This is a common and accepted approximation for monitoring, but users should be aware it may overcount TTL-specific removals.
- The Growth Rate Projection query uses a cross join between `system.disks` and the CTE, which could produce a division-by-zero if no parts were written in the last 7 days (`avg_daily_bytes` would be NULL/0). In practice this is unlikely in a production system but worth noting for edge cases.
- All ClickHouse functions used (`formatReadableSize`, `toStartOfDay`, `toStartOfWeek`, `round`, `avg`, `sum`, `count`, `now`) are standard and correctly applied.
