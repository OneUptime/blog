# Validation Summary: How to Use schema_table_statistics in MySQL sys Schema

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (5.7+/8.0+)
- MySQL sys schema
- MySQL Performance Schema
- `schema_table_statistics` and `x$schema_table_statistics` views

## Sources Consulted
- MySQL 8.0 Reference Manual: sys schema `schema_table_statistics` view — https://dev.mysql.com/doc/refman/8.0/en/sys-schema-table-statistics.html
- MySQL 8.0 Reference Manual: `performance_schema.table_io_waits_summary_by_table` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-table-table.html
- MySQL 8.0 Reference Manual: `performance_schema.file_summary_by_instance` — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-file-summary-tables.html
- MySQL 8.0 Reference Manual: `io_global_by_file_by_latency` view — https://dev.mysql.com/doc/refman/8.0/en/sys-io-global-by-file-by-latency.html
- MySQL 8.0 Reference Manual: Performance Schema setup — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-startup-configuration.html

## Issues Found

1. **Incomplete column reference table**: The column reference was missing 4 columns that are part of the `schema_table_statistics` view: `io_read_latency`, `io_write_latency`, `io_misc_requests`, and `io_misc_latency`. Added all four with their descriptions.

2. **Incomplete source table attribution**: The introductory description stated the view is "built on top of the `performance_schema.table_io_waits_summary_by_table` table" but omitted that it also joins with `performance_schema.file_summary_by_instance` (which provides the file-level I/O columns like `io_read`, `io_write`, `io_read_latency`, etc.). Updated to mention both source tables.

## Review Notes
- The prerequisite section enables `events_waits_current`, `events_waits_history`, and `events_waits_history_long` consumers. Strictly speaking, the summary tables used by this view are populated as long as the instruments are enabled and the `global_instrumentation` consumer is on (enabled by default). The history consumers are not required for this specific view but enabling them is not harmful and is reasonable general setup advice.
- The "Resetting Statistics" section correctly shows truncating `table_io_waits_summary_by_table`, but for a complete reset of all columns shown in the view, one would also need to truncate `file_summary_by_instance`. This is a minor nuance and the current advice is still valid for resetting the row operation and table I/O latency statistics.
- The x$ picosecond threshold calculation (1000000000000 = 1 second) is correct.
- All SQL queries are syntactically correct and use valid column names.
