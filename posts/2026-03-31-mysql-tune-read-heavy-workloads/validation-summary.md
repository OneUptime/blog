# Validation Summary: How to Tune MySQL for Read-Heavy Workloads

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- Performance Schema
- ProxySQL (read/write splitting)
- MySQL Replication (read replicas)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool configuration (https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html)
- MySQL 8.0 Reference Manual: InnoDB Read-Ahead (https://dev.mysql.com/doc/refman/8.0/en/innodb-performance-read_ahead.html)
- MySQL 8.0 Reference Manual: Performance Schema timer units (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-timing.html)
- MySQL 8.0 Reference Manual: events_statements_summary_by_digest table (https://dev.mysql.com/doc/refman/8.0/en/performance-schema-statement-summary-tables.html)
- MySQL 8.0 Reference Manual: innodb_flush_log_at_trx_commit (https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_flush_log_at_trx_commit)
- ProxySQL documentation: mysql_query_rules (https://proxysql.com/documentation/main-runtime/#mysql_query_rules)

## Issues Found

1. **ProxySQL rule ordering bug (Critical)**: The `mysql_query_rules` configuration had the general `^SELECT` rule (rule_id=1) before the `^SELECT.*FOR UPDATE` rule (rule_id=2). ProxySQL evaluates rules in `rule_id` order, and since rule 1 matched all SELECTs with `apply=1`, the FOR UPDATE exception in rule 2 would never be reached. This would cause `SELECT...FOR UPDATE` statements to be routed to read replicas instead of the primary, leading to locking failures or stale reads. **Fix:** Swapped the rule IDs so the more specific `SELECT...FOR UPDATE` rule (now rule_id=1) is evaluated before the general `SELECT` rule (now rule_id=2).

2. **Performance Schema timer unit conversion error**: The query dividing `AVG_TIMER_WAIT` by `1000000000` (10^9) and aliasing the result as `avg_sec` was incorrect. Performance Schema timer values are stored in picoseconds (10^-12 seconds). Dividing by 10^9 yields milliseconds, not seconds. **Fix:** Changed the divisor to `1000000000000` (10^12) so the result is correctly in seconds as the alias states.

## Review Notes
- The `skip_slave_start` variable name used in the replica configuration section was renamed to `skip_replica_start` in MySQL 8.0.26+ as part of the inclusive terminology changes. The old name still works but is deprecated. A future update could modernize this.
- The "Disable Unnecessary Write Operations" section includes `performance_schema = ON`, which is more of a monitoring setting than a write-reduction setting. It's not technically wrong but is slightly out of place in that section.
- The `innodb_buffer_pool_dump_at_shutdown` and `innodb_buffer_pool_load_at_startup` settings are both ON by default in MySQL 5.7+ and 8.0, so explicitly setting them is redundant but harmless and serves as good documentation.
