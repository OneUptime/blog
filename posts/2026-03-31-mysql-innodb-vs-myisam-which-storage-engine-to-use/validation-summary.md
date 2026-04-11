# Validation Summary: MySQL InnoDB vs MyISAM: Which Storage Engine to Use

## Status
validated

## Post Type
Reference / Comparison Guide

## Technologies Covered
- MySQL (5.5+, 5.6+, 8.x)
- InnoDB storage engine
- MyISAM storage engine
- SQL (DDL and DML statements)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/innodb-storage-engine.html
- MySQL 8.0 Reference Manual — MyISAM Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/myisam-storage-engine.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — InnoDB FULLTEXT Indexes: https://dev.mysql.com/doc/refman/8.0/en/innodb-fulltext-index.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual — InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/innodb-recovery.html
- MySQL 8.0 Reference Manual — REPAIR TABLE: https://dev.mysql.com/doc/refman/8.0/en/repair-table.html

## Issues Found
No technical issues found.

## Review Notes
- The statement that MyISAM write locks block "all other reads and writes" is a simplification. MyISAM supports concurrent inserts under specific conditions (no deleted rows in the middle of the data file, or with `concurrent_insert=2`). This is an acceptable simplification for a comparison post.
- The crash recovery description mentions InnoDB "rolls back incomplete transactions," which is accurate but incomplete — InnoDB also rolls forward committed-but-not-yet-flushed transactions using the redo log. Both behaviors are part of crash recovery. The description is correct for the level of detail appropriate to this post.
- MyISAM is effectively deprecated in modern MySQL. MySQL 8.0 still supports it, but system tables have been migrated to InnoDB. A future version of MySQL may remove MyISAM entirely.
- Note that MySQL 8.4 (LTS) is now available; all claims in this post remain accurate for current MySQL versions.
