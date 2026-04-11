# Validation Summary: How MySQL MVCC (Multi-Version Concurrency Control) Works

## Status
validated

## Post Type
Technical Explainer / Reference

## Technologies Covered
- MySQL InnoDB storage engine
- MVCC (Multi-Version Concurrency Control)
- InnoDB undo log and read views
- Transaction isolation levels (REPEATABLE READ, READ COMMITTED)
- `information_schema.INNODB_TRX` and `information_schema.INNODB_TABLESPACES` system tables

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Multi-Versioning — https://dev.mysql.com/doc/refman/8.0/en/innodb-multi-versioning.html
- MySQL 8.0 Reference Manual: Consistent Nonlocking Reads — https://dev.mysql.com/doc/refman/8.0/en/innodb-consistent-read.html
- MySQL 8.0 Reference Manual: InnoDB Transaction Isolation Levels — https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: INNODB_TRX table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- InnoDB source code (storage/innobase/include/read0types.h) for ReadView visibility algorithm

## Issues Found

### 1. Incomplete MVCC visibility pseudocode
**What was wrong:** The visibility check pseudocode listed only three rules, omitting the case where `DB_TRX_ID` falls between `m_up_limit_id` and `m_low_limit_id` but is NOT in `m_ids`. In that scenario, the transaction had already committed before the snapshot was taken, so the row version should be visible. Without this fourth rule, the algorithm was incomplete and could mislead readers implementing or reasoning about the visibility check.

**What was changed:** Added the missing fourth case to the pseudocode: `If m_up_limit_id <= DB_TRX_ID < m_low_limit_id and DB_TRX_ID not in m_ids -> transaction committed before snapshot, visible`. Also reordered the rules so the `m_low_limit_id` check comes before the `m_ids` check, matching the typical evaluation order in InnoDB source code.

### 2. Non-existent column `SIZE_IN_PAGES` in undo log size query
**What was wrong:** The query to check undo log size used `SIZE_IN_PAGES * 16384` from `information_schema.INNODB_TABLESPACES`. The column `SIZE_IN_PAGES` does not exist in this table in MySQL 8.0. The available columns for size are `FILE_SIZE` and `ALLOCATED_SIZE`, both of which return values in bytes.

**What was changed:** Replaced `ROUND(SIZE_IN_PAGES * 16384 / 1024 / 1024, 1)` with `ROUND(FILE_SIZE / 1024 / 1024, 1)` which correctly uses the `FILE_SIZE` column (already in bytes) to compute megabytes.

## Review Notes
- InnoDB rows actually have three hidden system columns: `DB_TRX_ID`, `DB_ROLL_PTR`, and `DB_ROW_ID`. The post mentions only the two that are relevant to MVCC, which is a reasonable simplification, but readers should be aware that `DB_ROW_ID` also exists (used as a clustered index key when no explicit primary key is defined).
- The visibility algorithm also checks whether `DB_TRX_ID` equals the current transaction's own ID (`m_creator_trx_id`), making a transaction's own modifications visible to itself. This is omitted in the post, which is acceptable for a high-level explanation but worth noting for completeness.
- The `INNODB_TABLESPACES` query for undo log size works in MySQL 8.0 where undo tablespaces are named with an `undo` prefix. In MySQL 5.7, undo logs resided in the system tablespace by default and the table was named `INNODB_SYS_TABLESPACES`, so this query would not work there without configuration changes.
