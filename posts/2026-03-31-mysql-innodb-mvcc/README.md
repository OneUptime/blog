# How to Understand InnoDB MVCC in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, MVCC, Transaction

Description: Learn how InnoDB implements Multi-Version Concurrency Control using undo logs and read views to provide consistent snapshots without blocking reads.

---

## What Is MVCC?

Multi-Version Concurrency Control (MVCC) allows readers and writers to operate concurrently without blocking each other. Instead of locking rows for reads, InnoDB keeps multiple versions of a row and serves each transaction a consistent snapshot based on when it started.

```text
Without MVCC: readers block writers, writers block readers
With MVCC:    readers never block writers, writers never block readers
```

## How InnoDB Stores Row Versions

Every InnoDB row has two hidden system columns:

```text
DB_TRX_ID   - ID of the last transaction that inserted or updated this row
DB_ROLL_PTR - pointer to the undo log record holding the previous version
```

When a row is updated, InnoDB:
1. Writes the new row version with the current transaction ID in `DB_TRX_ID`.
2. Writes the old version to the undo log.
3. Sets `DB_ROLL_PTR` on the new row to point to the undo log entry.

This creates a version chain that can be traversed backward in time.

```text
Current row (TRX_ID=1000) --> Undo: v2 (TRX_ID=900) --> Undo: v1 (TRX_ID=800)
```

## Read View

When a transaction starts a consistent read (non-locking SELECT), InnoDB creates a **read view**. The read view records:

- The list of active (uncommitted) transaction IDs at the moment of the snapshot.
- The minimum and maximum active transaction IDs.

A row version is visible to a transaction if:
- Its `DB_TRX_ID` is less than the minimum active transaction ID (committed before this read view was created).
- Its `DB_TRX_ID` equals the transaction's own ID (own changes are visible).
- Its `DB_TRX_ID` is less than the maximum transaction ID at read view creation and is not in the active transactions list.

A row version is **not** visible if its `DB_TRX_ID` is greater than or equal to the maximum transaction ID at read view creation, meaning the modifying transaction started after the snapshot was taken.

If a row version is not visible, InnoDB follows the `DB_ROLL_PTR` to the previous version and checks again.

## Isolation Levels and MVCC

```sql
-- Check current isolation level
SELECT @@transaction_isolation;

-- Read Committed: new read view per statement
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Repeatable Read (default): read view created at first read in transaction
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

Under REPEATABLE READ, the same read view is reused for the entire transaction, so a SELECT at the start and end of a long transaction sees the same data even if other transactions commit changes in between.

## Undo Log and Purge

Old row versions accumulate in the undo log. InnoDB's purge thread reclaims undo log space once no active read view references those old versions.

```sql
-- Check purge lag (large value = history accumulation)
SHOW ENGINE INNODB STATUS\G
-- History list length: 1234
-- Large history list = slow purge (long-running transactions hold old read views)

-- Purge thread configuration
SHOW VARIABLES LIKE 'innodb_purge_threads';
SHOW VARIABLES LIKE 'innodb_max_purge_lag';
```

## Long-Running Transactions and MVCC Bloat

A single long-running read transaction prevents the purge thread from reclaiming undo log space, causing the history list to grow.

```sql
-- Find long-running transactions
SELECT trx_id, trx_started, trx_query, trx_isolation_level
FROM information_schema.innodb_trx
ORDER BY trx_started ASC
LIMIT 10;
```

## Locking Reads vs. Consistent Reads

```sql
-- Consistent read (MVCC snapshot, no lock)
SELECT * FROM orders WHERE id = 42;

-- Locking read (acquires row lock, reads current committed version)
SELECT * FROM orders WHERE id = 42 FOR UPDATE;
SELECT * FROM orders WHERE id = 42 FOR SHARE;
```

Locking reads bypass MVCC and always see the latest committed version.

## Summary

InnoDB MVCC stores old row versions in the undo log and uses a read view to determine which version each transaction should see. Under REPEATABLE READ, a single snapshot is used for the entire transaction; under READ COMMITTED, a fresh snapshot is taken per statement. Long-running transactions prevent purge of old undo log entries, causing history list growth. Keep transactions short and commit promptly to avoid MVCC overhead.
