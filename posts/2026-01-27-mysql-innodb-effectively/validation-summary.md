# Validation Summary: How to Use MySQL InnoDB Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MySQL
- InnoDB
- SQL
- MySQL configuration files
- Performance Schema
- Information Schema
- sys schema

## Sources Consulted
- MySQL 8.4 Reference Manual: Configuring InnoDB Buffer Pool Size - https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html
- MySQL 8.4 Reference Manual: InnoDB Startup Options and System Variables - https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- MySQL 8.4 Reference Manual: Transaction Isolation Levels - https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html
- MySQL 8.4 Reference Manual: SET TRANSACTION Statement - https://dev.mysql.com/doc/refman/8.4/en/set-transaction.html
- MySQL 8.4 Reference Manual: Clustered and Secondary Indexes - https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html
- MySQL 8.4 Reference Manual: UUID_TO_BIN() and BIN_TO_UUID() - https://dev.mysql.com/doc/refman/8.4/en/miscellaneous-functions.html
- MySQL 8.4 Reference Manual: Data Type Default Values - https://dev.mysql.com/doc/refman/8.4/en/data-type-defaults.html
- MySQL 8.4 Reference Manual: The innodb_lock_waits and x$innodb_lock_waits Views - https://dev.mysql.com/doc/refman/8.4/en/sys-innodb-lock-waits.html
- MySQL 8.4 Reference Manual: Table I/O and Lock Wait Summary Tables - https://dev.mysql.com/doc/refman/8.4/en/performance-schema-table-wait-summary-tables.html
- MySQL 8.4 Reference Manual: An InnoDB Deadlock Example - https://dev.mysql.com/doc/refman/8.4/en/innodb-deadlock-example.html

## Issues Found
- The buffer pool example said `innodb_buffer_pool_chunk_size` enables online resizing. MySQL uses it as the chunk size for resizing, so the comment was corrected.
- The buffer pool instances guidance used "1 per GB" as a blanket rule. Updated the comment to align with MySQL guidance that each instance should be at least 1GB.
- The configuration snippet set `innodb_undo_tablespaces`, which is deprecated and has no effect in MySQL 8.4. Removed the active setting and replaced it with a note that the default is 2 and the variable is deprecated.
- The per-transaction isolation example ran `SET TRANSACTION` after `START TRANSACTION`, which MySQL rejects for next-transaction scope. Reordered it so the isolation level is set before starting the transaction.
- The isolation table marked phantom reads at InnoDB REPEATABLE READ as generally possible. Clarified that consistent reads do not see phantoms and that next-key locks protect locking range reads.
- The monitoring query included `Innodb_deadlocks` in `performance_schema.global_status`, but MySQL exposes the deadlock count through `INFORMATION_SCHEMA.INNODB_METRICS` as `lock_deadlocks`. Updated the monitoring example accordingly.

## Review Notes
The `UUID_TO_BIN(UUID(), 1)` example is valid for MySQL expression defaults and is useful with MySQL's version-1 UUIDs, but deployments using binary logging should review replication behavior for nondeterministic expression defaults.
