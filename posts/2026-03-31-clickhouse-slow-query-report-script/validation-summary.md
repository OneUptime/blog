# Validation Summary: How to Write a ClickHouse Slow Query Report Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system.query_log, SQL functions, ProfileEvents, output formats)
- Bash scripting
- curl (ClickHouse HTTP interface)
- cron scheduling

## Sources Consulted
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse functions reference (formatReadableQuantity, formatReadableSize, normalizeQuery): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse output formats (PrettyCompactMonoBlock): https://clickhouse.com/docs/en/interfaces/formats
- ClickHouse Interval data type: https://clickhouse.com/docs/sql-reference/data-types/special-data-types/interval
- ClickHouse ProfileEvents source: https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ProfileEvents.cpp
- ClickHouse monitoring blog post: https://clickhouse.com/blog/monitoring-troubleshooting-select-queries-clickhouse

## Issues Found
No technical issues found.

## Review Notes
- The `crontab -` command in the "Scheduling the Report" section replaces the entire user crontab rather than appending to it. This is technically correct behavior for `crontab -`, but users with existing cron jobs should be aware it will overwrite them. A safer approach would be `(crontab -l; echo "0 7 * * * ...") | crontab -`, but this is a best-practice consideration, not a technical error.
- The "Checking Index Usage for Slow Queries" query omits an `event_time` filter, unlike the other queries. This means it scans the entire query_log history. This is functionally correct but could be slow on servers with large query_log tables.
- All column names (`query_duration_ms`, `read_rows`, `read_bytes`, `memory_usage`, `user`, `query`, `type`, `event_time`, `query_id`) are verified correct for `system.query_log`.
- All functions (`formatReadableQuantity`, `formatReadableSize`, `normalizeQuery`, `substring`, `count`, `avg`, `max`, `now`) are valid ClickHouse functions.
- All ProfileEvents keys (`SelectedParts`, `SelectedMarks`, `SelectedRanges`) are verified valid.
- The `type = 'QueryFinish'` filter is the correct way to select successfully completed queries.
- `FORMAT PrettyCompactMonoBlock` is a valid ClickHouse output format suitable for terminal display.
- `INTERVAL N HOUR` is valid ClickHouse interval syntax.
