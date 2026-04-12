# Validation Summary: How to Understand InnoDB MVCC in MySQL

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- InnoDB MVCC (Multi-Version Concurrency Control)
- InnoDB undo logs and purge mechanism
- InnoDB read views and transaction isolation levels
- `information_schema.innodb_trx` system table

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Multi-Versioning: https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html
- MySQL 8.0 Reference Manual — Consistent Nonlocking Reads: https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual — InnoDB Transaction Model: https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-model.html
- MySQL 8.0 Reference Manual — InnoDB Locking Reads: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA INNODB_TRX Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual — InnoDB Purge Configuration: https://dev.mysql.com/doc/refman/8.0/en/innodb-purge-configuration.html
- MySQL source code (storage/innobase/include/read0types.h) for read view visibility algorithm

## Issues Found

### 1. Incomplete read view visibility rules (Read View section)
**What was wrong:** The visibility rules listed three conditions for when a row version is visible, but the third bullet ("It is not in the active transactions list") was incomplete. It omitted the critical upper bound check: row versions with a `DB_TRX_ID` greater than or equal to the maximum transaction ID at read view creation time must be invisible, because those transactions started after the snapshot was taken. Without this rule, a reader could incorrectly conclude that rows modified by future transactions would be visible (since those transaction IDs wouldn't appear in the active list either).

**What was changed:** Amended the third visibility bullet to include the upper bound condition ("Its `DB_TRX_ID` is less than the maximum transaction ID at read view creation and is not in the active transactions list"). Added a separate line explicitly stating the "not visible" rule for transaction IDs at or above the upper bound.

**Why:** The InnoDB read view visibility algorithm (implemented in `ReadView::changes_visible()`) checks three boundaries: the low water mark (`m_up_limit_id`), the high water mark (`m_low_limit_id`, i.e., the next transaction ID to be assigned), and the active transaction list (`m_ids`). Omitting the high water mark check is a meaningful technical gap that could mislead readers about how MVCC snapshot isolation works.

## Review Notes
- The post states "Every InnoDB row has two hidden system columns" — InnoDB actually adds up to three hidden columns (`DB_TRX_ID`, `DB_ROLL_PTR`, and `DB_ROW_ID`), but `DB_ROW_ID` is only added to tables without a user-defined primary key and is unrelated to MVCC. In the context of this MVCC-focused post, mentioning only the two MVCC-relevant columns is acceptable, though a parenthetical acknowledgment of `DB_ROW_ID` could improve precision.
- `SELECT @@transaction_isolation` is correct for MySQL 5.7.20+. The older `@@tx_isolation` variable was deprecated in 5.7.20 and removed in 8.0. The post doesn't specify a MySQL version, but the use of `FOR SHARE` (MySQL 8.0+ syntax, replacing `LOCK IN SHARE MODE`) implies MySQL 8.0, where `@@transaction_isolation` is the correct variable.
- All SQL queries, system variable names, and `information_schema` column names were verified as correct.
- The description of undo log purge behavior and the impact of long-running transactions is accurate.
