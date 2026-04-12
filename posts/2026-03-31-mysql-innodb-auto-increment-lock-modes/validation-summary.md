# Validation Summary: How to Understand InnoDB Auto-Increment Lock Modes in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- Auto-increment lock modes (`innodb_autoinc_lock_mode`)
- MySQL binary log replication (SBR, RBR)
- Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB AUTO_INCREMENT Lock Modes: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual — innodb_autoinc_lock_mode system variable: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_autoinc_lock_mode
- MySQL 8.0 Reference Manual — Replication and AUTO_INCREMENT: https://dev.mysql.com/doc/refman/8.0/en/replication-features-auto-increment.html
- MySQL 8.0 Reference Manual — binlog_format: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_format

## Issues Found
1. **"gap-free ID requirements" claim for mode 0 was misleading** (Choosing the Right Mode section): The post stated mode 0 is useful for "specific gap-free ID requirements." No auto-increment lock mode guarantees gap-free IDs — rolled-back transactions, DELETE operations, and INSERT IGNORE conflicts all cause gaps regardless of lock mode. Mode 0 guarantees consecutive allocation within and across statements (no interleaving), but not gap-free sequences. Changed to clarify that mode 0 provides consecutive (non-interleaved) ID assignment and added a note that no lock mode prevents gaps from rollbacks or deletes.

## Review Notes
- `binlog_format` is deprecated as of MySQL 8.0.34 and removed in MySQL 8.4, where row-based replication is the only format. This makes mode 2 the natural and only necessary choice in MySQL 8.4+. The post's advice remains correct for MySQL 8.0.x deployments.
- The Performance Schema query using `WHERE EVENT_NAME LIKE '%autoinc%'` will match the `wait/synch/mutex/innodb/autoinc_mutex` instrument. Users should ensure Performance Schema wait instrumentation is enabled (`performance_schema_instrument = 'wait/%=ON'`) for this query to return results.
- The bulk insert example (`INSERT INTO archive_orders SELECT * FROM orders`) would only trigger auto-increment if the destination table's auto-increment column receives NULL or 0 values. With `SELECT *`, existing IDs would be inserted as-is. The example still correctly illustrates the locking behavior difference between modes, as the AUTO-INC lock is acquired based on statement type, not whether new values are actually generated.
