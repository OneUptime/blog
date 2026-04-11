# Validation Summary: How to Monitor MySQL with SHOW STATUS

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0
- SHOW GLOBAL STATUS / SHOW SESSION STATUS
- InnoDB storage engine metrics
- MySQL replication monitoring
- performance_schema tables
- MySQL binary logging

## Sources Consulted
- MySQL 8.0 Server Status Variables Reference: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Server Status Variable Reference (index): https://dev.mysql.com/doc/refman/8.0/en/server-status-variable-reference.html
- MySQL 8.0 SHOW STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-status.html
- MySQL 8.0 FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html
- MySQL 8.0 Added, Deprecated, or Removed Variables: https://dev.mysql.com/doc/refman/8.0/en/added-deprecated-removed.html

## Issues Found

1. **Incorrect description of status variable types (line 13):** The post stated status variables are "cumulative counters (reset on restart) or current values (reset each second for rates)." No MySQL status variable resets each second. Fixed to correctly describe variables as either cumulative counters or instantaneous gauges.

2. **Non-existent `Replica_running` status variable (Replication section):** The post suggested using `SHOW GLOBAL STATUS LIKE 'Replica_running'` for MySQL 8.0+. This status variable does not exist — `Slave_running` was deprecated in 8.0.26 but no `Replica_running` replacement was added to SHOW GLOBAL STATUS. Fixed to use `SHOW REPLICA STATUS` and check the `Replica_IO_Running` / `Replica_SQL_Running` fields instead, which is the correct approach for MySQL 8.0.22+.

3. **Misleading `FLUSH STATUS` description (Best Practices):** The post said "Reset global status counters after server changes with FLUSH STATUS," implying all global counters are zeroed. In reality, `FLUSH STATUS` resets session counters and only some global counters. Fixed to use more accurate wording.

## Review Notes
- The QPS calculation using `SELECT variable_value INTO @q1` works due to MySQL's implicit string-to-number conversion, but explicit `CAST(variable_value AS UNSIGNED)` would be more robust. Not changed since the current approach works correctly.
- The `Select_scan` comment "Full table scans" is a slight simplification — it specifically counts joins where the first table was fully scanned. Acceptable for a monitoring-focused blog post.
- The alert thresholds mentioned (Threads_running > 50, buffer pool hit rate < 99%, Innodb_row_lock_time_avg > 50ms) are reasonable general guidelines but will vary by workload. This is appropriately presented as guidance rather than hard rules.
