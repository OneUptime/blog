# Validation Summary: How to Use the events_waits_summary Tables in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL Performance Schema
- Wait event instrumentation and diagnostics
- Performance Schema summary tables (`events_waits_summary_*`)

## Sources Consulted
- MySQL 8.0 Reference Manual: Performance Schema Wait Event Summary Tables (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-wait-summary-tables.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_instruments Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-instruments-table.html)
- MySQL 8.0 Reference Manual: Performance Schema setup_consumers Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-setup-consumers-table.html)
- MySQL 8.0 Reference Manual: Performance Schema threads Table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-threads-table.html)
- MySQL 8.0 Reference Manual: Performance Schema Timer Units (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)

## Issues Found
No technical issues found.

## Review Notes
- The post omits `events_waits_summary_by_instance` from the list of available summary tables, but it does not claim to be exhaustive, so this is acceptable.
- All timer unit conversions are correct: Performance Schema stores timers in picoseconds, and the post correctly divides by 1e12 for seconds, 1e9 for milliseconds, and 1e6 for microseconds.
- All table names, column names, and event name prefix patterns are accurate per MySQL 8.0 documentation.
- The `GROUP BY category` clause in the I/O vs. Lock vs. Sync query uses a column alias, which is valid in MySQL.
