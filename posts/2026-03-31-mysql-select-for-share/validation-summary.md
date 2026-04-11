# Validation Summary: How to Use SELECT ... FOR SHARE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- SQL locking reads (SELECT ... FOR SHARE, SELECT ... LOCK IN SHARE MODE)
- performance_schema.data_locks

## Sources Consulted
- MySQL 8.0 Reference Manual — Locking Reads: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — InnoDB Locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 Reference Manual — data_locks Table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-locks-table.html
- MySQL 8.0 Reference Manual — SELECT Statement: https://dev.mysql.com/doc/refman/8.0/en/select.html
- MySQL Server Error Reference — ER_LOCK_NOWAIT (3572): https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
1. **"Upgrading from Shared to Exclusive Lock" section — misleading opening claim.** The original text stated "You cannot directly upgrade a shared lock to an exclusive lock," which is incorrect. Within the same transaction, InnoDB allows requesting an exclusive lock (FOR UPDATE) on a row already held with a shared lock (FOR SHARE), and it will succeed if no other session holds a conflicting lock. The real risk is deadlock when two sessions each hold S locks and both attempt to upgrade to X. Fixed the section description and code comments to accurately reflect this behavior.

## Review Notes
- The NOWAIT/SKIP LOCKED code block contains two separate examples sharing a single code fence, each with its own START TRANSACTION. The first example lacks a COMMIT. This is acceptable as illustrative snippets but could be clearer if split into separate code blocks.
- The post correctly identifies the foreign key validation pattern as a key use case, which aligns with how InnoDB internally uses shared locks for foreign key checks.
- All SQL syntax, error codes, and performance_schema references are accurate for MySQL 8.0.
