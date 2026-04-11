# Validation Summary: How to Configure Multiple InnoDB Buffer Pool Instances in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB Buffer Pool configuration
- Performance Schema
- Information Schema (INNODB_BUFFER_POOL_STATS)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Buffer Pool Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-buffer-pool.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_instances — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_instances
- MySQL 8.0 Reference Manual: INNODB_BUFFER_POOL_STATS table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-buffer-pool-stats-table.html
- MySQL 8.0 Reference Manual: innodb_buffer_pool_load_at_startup — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_load_at_startup
- MySQL 8.0 Reference Manual: innodb_buffer_pool_dump_at_shutdown — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_buffer_pool_dump_at_shutdown

## Issues Found

1. **Incorrect column names in INNODB_BUFFER_POOL_STATS query**: The query referenced `READ_REQUESTS` and `WRITE_REQUESTS` columns, which do not exist in the `information_schema.INNODB_BUFFER_POOL_STATS` table. Fixed to `NUMBER_PAGES_READ` and `NUMBER_PAGES_WRITTEN`, which are the correct column names.

2. **Misleading claim about per-instance minimum size**: The post stated "Each instance must be at least 1GB" as a hard rule. The MySQL documentation recommends each instance be at least 1GB "for best efficiency", but this is not an enforced constraint. Fixed the wording from "must" to "should" and clarified it is a recommendation.

3. **Misstatement of MySQL documentation recommendation**: The post claimed "MySQL documentation recommends 1 instance per GB of buffer pool, up to 64 instances." The actual recommendation is that each instance should be at least 1GB for best efficiency, and 64 is the maximum allowed value. Fixed to accurately reflect the documentation.

4. **Non-dynamic variable used with SET GLOBAL**: The post used `SET GLOBAL innodb_buffer_pool_load_at_startup = ON` which would fail at runtime because `innodb_buffer_pool_load_at_startup` is not a dynamic variable. It can only be set in the configuration file (my.cnf) or on the command line at startup. Fixed to show it as a my.cnf directive with an explanatory comment.

## Review Notes
- The `SET GLOBAL innodb_buffer_pool_dump_at_shutdown = ON` command works at runtime but does not persist across restarts. For production use, this should also be added to my.cnf. In MySQL 8.0, `SET PERSIST` can be used instead to persist the setting. The post doesn't mention this distinction, but it's a minor practical concern rather than a technical error.
- The default value of `innodb_buffer_pool_instances` is 8 (when buffer pool >= 1GB), not 1 as the "When Multiple Instances Help Most" section might imply. The post says "the default of 1 instance" which is technically accurate only for buffer pools < 1GB.
- All other SQL syntax, configuration file format, systemctl commands, and technical explanations about mutex contention and buffer pool partitioning are accurate.
