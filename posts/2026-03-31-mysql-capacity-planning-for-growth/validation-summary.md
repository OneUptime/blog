# Validation Summary: How to Plan MySQL Capacity for Growth

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB, Performance Schema, information_schema)
- mysqladmin CLI tool
- iostat (sysstat)
- Python (growth projection scripting)
- Prometheus (alerting rules)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual — InnoDB Buffer Pool: https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual — information_schema.TABLES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- Prometheus node_exporter metrics documentation: https://prometheus.io/docs/guides/node-exporter/
- Linux iostat man page (sysstat package)

## Issues Found

1. **Invalid grep pattern in mysqladmin command**: The grep filter used `queries_per_sec`, which is not a MySQL status variable. The `mysqladmin extended-status` command outputs raw status variables (e.g., `Questions`, `Queries`), not computed rates. Changed `queries_per_sec` to `Questions` to match the actual MySQL status variable name.

2. **Incorrect Prometheus alert expression**: The expression compared `mysql_global_variables_innodb_buffer_pool_size` (a RAM configuration setting) to `node_filesystem_size_bytes`, which does not measure disk usage. Replaced with the standard filesystem usage formula: `1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes) > 0.7`, which correctly calculates the percentage of disk space used.

3. **Unused Python imports**: The script imported `date` and `timedelta` from `datetime` but never used them. Removed the unused import line to keep the example clean.

## Review Notes
- The buffer pool hit rate formula and 99% threshold guidance are correct and well-established best practices.
- The `information_schema.TABLES` query for disk sizing is accurate but note that it does not account for undo logs, redo logs, binary logs, or temporary files, which can also consume significant disk space. The post could mention this in a future update.
- The Python growth projection uses compound growth (exponential model) which is appropriate for the described use case.
- The 70% alert threshold and 80% scaling action threshold are reasonable operational guidelines, though the specific values will vary by workload.
