# Validation Summary: How to Track MySQL Temporary Table Creation Rate

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (status variables, Performance Schema, global variables)
- Bash scripting (rate computation)
- Prometheus (alerting rules with PromQL)
- mysqld_exporter (Prometheus metric names)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Status Variables — `Created_tmp_tables`, `Created_tmp_disk_tables`, `Created_tmp_files` (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)
- MySQL 8.0 Reference Manual: Server System Variables — `tmp_table_size`, `max_heap_table_size` (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Performance Schema Statement Summary Tables — `events_statements_summary_by_digest` (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- Prometheus Alerting Rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- prometheus/mysqld_exporter metric naming conventions (https://github.com/prometheus/mysqld_exporter)

## Issues Found
1. **Incorrect description of `Created_tmp_tables`**: The post described `Created_tmp_tables` as "total in-memory temporary tables created since startup." Per MySQL documentation, this variable counts all internal temporary tables created (both in-memory and on-disk), not just in-memory ones. Fixed to: "total internal temporary tables created since startup (both in-memory and on-disk)."

2. **Misleading column alias in ratio query**: The SQL query aliased `Created_tmp_tables` as `mem_tmp`, which is misleading since it represents the total count (including on-disk tables). Changed alias from `mem_tmp` to `total_tmp`.

3. **Incorrect ratio formula**: The post stated the ratio as `disk_tmp / (disk_tmp + mem_tmp)`. Since `Created_tmp_tables` already includes on-disk tables in its count, adding `disk_tmp` to it double-counts disk tables in the denominator. The correct ratio is simply `disk_tmp / total_tmp` (i.e., `Created_tmp_disk_tables / Created_tmp_tables`). Fixed the formula accordingly.

## Review Notes
- The bash rate computation script uses integer arithmetic (`$(( ... / 60 ))`), which truncates fractional results. For rates below 1 per second (fewer than 60 tables per minute), the result will be 0. This is a limitation of bash, not a bug, but readers should be aware.
- In MySQL 8.0+, the default internal temporary table storage engine is TempTable (not MEMORY). The TempTable engine uses `temptable_max_ram` (default 1 GB) and `temptable_max_mmap` rather than `tmp_table_size`/`max_heap_table_size`. The post's advice about these variables is correct for the MEMORY engine but may not fully apply to default MySQL 8.0+ configurations. The post does not specify a MySQL version.
- The Prometheus alert rule and metric names are consistent with the prometheus/mysqld_exporter conventions.
