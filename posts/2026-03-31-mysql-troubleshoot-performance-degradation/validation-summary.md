# Validation Summary: How to Troubleshoot MySQL Performance Degradation Over Time

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- MySQL slow query log
- MySQL optimizer statistics (`ANALYZE TABLE`, `OPTIMIZE TABLE`)
- `information_schema.TABLES`, `information_schema.STATISTICS`, `information_schema.INNODB_TRX`
- `performance_schema.global_status`
- `mysqldumpslow` CLI tool
- `mysqlcheck` CLI tool
- `pt-query-digest` (Percona Toolkit, mentioned but not demonstrated)

## Sources Consulted
- MySQL 8.0 Reference Manual: Slow Query Log — https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: information_schema.TABLES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: information_schema.STATISTICS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: information_schema.INNODB_TRX — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: Server Status Variables (Innodb_buffer_pool_reads, Innodb_buffer_pool_read_requests) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual: mysqldumpslow — https://dev.mysql.com/doc/refman/8.0/en/mysqldumpslow.html

## Issues Found
No technical issues found.

## Review Notes
- The `table_rows` column in `information_schema.TABLES` returns an estimate for InnoDB tables (not an exact count). The post uses it for relative sizing which is appropriate, but readers should be aware it is not precise.
- The buffer pool hit rate query relies on implicit VARCHAR-to-numeric conversion for `variable_value` in `performance_schema.global_status`. This works in practice but could be made explicit with `CAST()` for clarity.
- The claim "Index cardinality decreases relative to table growth over time" is slightly imprecise — cardinality (distinct values) doesn't inherently decrease, but *selectivity* (cardinality / total rows) can decrease if data distribution becomes less uniform. The surrounding context makes the practical point clear enough.
- `OPTIMIZE TABLE` on InnoDB performs an online table rebuild (ALTER TABLE ... FORCE). On very large tables this can be resource-intensive; a production note about timing or using `pt-online-schema-change` could be helpful in a future revision.
