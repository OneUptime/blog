# How MySQL MVCC (Multi-Version Concurrency Control) Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MVCC, InnoDB, Transaction, Concurrency

Description: Learn how MySQL InnoDB implements MVCC to provide consistent non-blocking reads by storing row versions in the undo log and using read views.

---

## The Problem MVCC Solves

Without MVCC, a reader must either wait for a writer to finish (blocking reads) or accept inconsistent data from partially committed transactions. MVCC solves this by keeping multiple versions of each row, allowing readers to see a consistent snapshot without blocking writers.

## Row Versioning in InnoDB

Every InnoDB row has two hidden system columns:

- **DB_TRX_ID**: the transaction ID that last inserted or updated this row
- **DB_ROLL_PTR**: a pointer to the previous version of this row in the undo log

When a row is updated, InnoDB writes the new version to the page and stores the old version in the undo log, linked by `DB_ROLL_PTR`. This forms a version chain.

```sql
-- You cannot see these hidden columns directly, but you can observe MVCC effects:
START TRANSACTION;
UPDATE accounts SET balance = 500 WHERE id = 1;
-- The old row version (balance = 100) is now in the undo log
-- Other transactions reading this row see balance = 100 until this transaction commits
COMMIT;
```

## Read Views

When a transaction begins (or when the first consistent read executes, depending on isolation level), InnoDB creates a **read view**: a snapshot of which transaction IDs were active at that moment. The read view has three components:

- `m_ids`: set of active (uncommitted) transaction IDs
- `m_up_limit_id`: minimum active transaction ID
- `m_low_limit_id`: the next transaction ID that will be assigned

For each row version encountered, InnoDB checks whether `DB_TRX_ID` is visible to the current read view:

```text
If DB_TRX_ID < m_up_limit_id                          -> row was committed before snapshot, visible
If DB_TRX_ID >= m_low_limit_id                         -> row was created after snapshot, not visible
If DB_TRX_ID in m_ids                                  -> row was uncommitted at snapshot time, not visible
If m_up_limit_id <= DB_TRX_ID < m_low_limit_id
   and DB_TRX_ID not in m_ids                          -> transaction committed before snapshot, visible
```

If a version is not visible, InnoDB follows `DB_ROLL_PTR` to the previous version and checks again.

## Consistent Reads vs. Locking Reads

Regular `SELECT` uses a consistent read - it reads from the snapshot without locking:

```sql
-- Consistent read - uses MVCC snapshot, no locks acquired
SELECT * FROM accounts WHERE id = 1;
```

Locking reads bypass MVCC and read the current committed version:

```sql
-- Locking read - reads current version, acquires lock
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

## Isolation Levels and Read View Timing

The isolation level controls when the read view is created:

```sql
-- REPEATABLE READ (default): read view created at the start of the first read in the transaction
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT * FROM accounts;  -- Read view created here
-- All subsequent reads in this transaction use the same snapshot

-- READ COMMITTED: a new read view is created for every statement
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Undo Log Purge

Old row versions in the undo log are purged by the InnoDB purge thread after no active read view needs them. Long-running transactions prevent purge, causing undo log growth:

```sql
-- Check for old transactions preventing purge
SELECT trx_id, trx_started, trx_state
FROM information_schema.INNODB_TRX
ORDER BY trx_started
LIMIT 5;

-- Check undo log size
SELECT NAME, ROUND(FILE_SIZE / 1024 / 1024, 1) AS mb
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE 'undo%';
```

## Summary

MySQL InnoDB MVCC stores multiple row versions via the undo log and uses read views to determine which version each transaction sees. Regular reads are non-blocking because they read from a snapshot rather than acquiring locks. The isolation level controls whether the snapshot is taken once per transaction (REPEATABLE READ) or once per statement (READ COMMITTED). Long-running transactions must be avoided because they block undo log purge and cause storage growth.
