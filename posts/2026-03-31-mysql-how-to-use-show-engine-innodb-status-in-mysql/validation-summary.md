# Validation Summary: How to Use SHOW ENGINE INNODB STATUS in MySQL

## Status
validated

## Post Type
Reference / Diagnostic Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SHOW ENGINE INNODB STATUS command
- performance_schema.global_status
- InnoDB buffer pool, redo log, transactions, semaphores

## Sources Consulted
- MySQL 8.0 Reference Manual: SHOW ENGINE Statement — https://dev.mysql.com/doc/refman/8.0/en/show-engine.html
- MySQL 8.0 Reference Manual: InnoDB Standard Monitor and Lock Monitor Output — https://dev.mysql.com/doc/refman/8.0/en/innodb-standard-monitor.html
- MySQL 8.0 Reference Manual: Server Status Variables (Innodb_buffer_pool_*) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: InnoDB Checkpoints — https://dev.mysql.com/doc/refman/8.0/en/innodb-checkpoints.html

## Issues Found

1. **Misplaced "History list length" in BUFFER POOL AND MEMORY key metrics**: The post listed "History list length: unpurged undo records" as a key metric of the BUFFER POOL AND MEMORY section, but this metric appears in the TRANSACTIONS section of the InnoDB status output. Replaced with "Free buffers" which is an actual BUFFER POOL AND MEMORY metric.

2. **Incorrect description of redo log gap as "uncommitted writes"**: The gap between `Log sequence number` and `Last checkpoint at` was described as "uncommitted writes in the redo log." This is inaccurate — the gap represents uncheckpointed redo log data (dirty pages not yet flushed to tablespace files), which includes both committed and uncommitted transactions. Changed to "uncheckpointed redo log data" with a clarifying explanation.

3. **Non-existent status variable `Innodb_buffer_pool_hit_rate`**: The performance_schema query referenced `Innodb_buffer_pool_hit_rate`, which is not a valid MySQL status variable. The buffer pool hit rate is only reported in the SHOW ENGINE INNODB STATUS output and must be calculated manually from `Innodb_buffer_pool_read_requests` and `Innodb_buffer_pool_reads`. Replaced with these valid variables and added the calculation formula.

## Review Notes
- The LOG section output format (with "Log buffer assigned up to" and "Log buffer completed up to") reflects MySQL 8.0.30+ format. Earlier 8.0 versions and 5.7 have a simpler format. The post does not specify a MySQL version, which is acceptable since 8.0 is current.
- The shell script uses `mysql -u root -p` which will prompt for a password interactively. For automated periodic logging, a credentials file (`--defaults-file`) would be needed, but the post doesn't claim full automation so this is acceptable.
- The SEMAPHORES section format varies across MySQL versions. The example shown is reasonable but readers on different versions may see different fields.
