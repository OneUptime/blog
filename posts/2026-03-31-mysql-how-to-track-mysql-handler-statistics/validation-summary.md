# Validation Summary: How to Track MySQL Handler Statistics

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL Server (5.7+, 8.0+)
- MySQL Handler status variables
- MySQL Performance Schema (`global_status`, `table_io_waits_summary_by_table`)
- `SHOW GLOBAL STATUS` / `SHOW SESSION STATUS`
- `FLUSH STATUS`

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables (Handler_%) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: FLUSH Statement — https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-status
- MySQL 8.0 Reference Manual: Performance Schema global_status Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-status-variable-tables.html
- MySQL 8.0 Reference Manual: table_io_waits_summary_by_table Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-table-io-waits-summary-by-table-table.html

## Issues Found
No technical issues found.

## Review Notes
- The `performance_schema.global_status` table used in the index hit ratio query requires MySQL 5.7.6+. Earlier versions used `information_schema.GLOBAL_STATUS`, which was deprecated in 5.7.6 and removed in 8.0. The post doesn't specify a minimum version, but since MySQL 5.7 is already past EOL, this is fine for modern deployments.
- The per-session example shows `Handler_read_next = 15` for a query with `ORDER BY order_date DESC`. Depending on the index definition, a descending scan might increment `Handler_read_prev` instead. This is plausible with a composite index that includes a descending column (MySQL 8.0+ descending index support), but readers should be aware that their results may vary.
- The `FLUSH STATUS` description is a practical simplification. The precise behavior (particularly in MySQL 8.0.27+) is that session values are flushed into global values and then session values are reset. The description is adequate for the use case presented.
- The `VARIABLE_VALUE` column in `performance_schema.global_status` is `VARCHAR(1024)`, but MySQL's implicit type conversion handles the arithmetic in the index hit ratio query correctly.
