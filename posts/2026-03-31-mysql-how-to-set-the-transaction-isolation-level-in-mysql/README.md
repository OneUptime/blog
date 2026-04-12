# How to Set the Transaction Isolation Level in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction Isolation, InnoDB, ACID, Concurrency

Description: Learn how to set and understand MySQL transaction isolation levels - READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, and SERIALIZABLE.

---

## Overview

Transaction isolation levels control how much concurrent transactions are isolated from each other. MySQL supports four isolation levels as defined by the SQL standard, each offering a different balance between consistency and concurrency.

The default isolation level in MySQL (InnoDB) is `REPEATABLE READ`, which prevents dirty reads and non-repeatable reads but allows phantom reads.

## The Four Isolation Levels

| Isolation Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|-----------------|------------|---------------------|--------------|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Prevented | Possible | Possible |
| REPEATABLE READ | Prevented | Prevented | Possible* |
| SERIALIZABLE | Prevented | Prevented | Prevented |

*InnoDB's REPEATABLE READ prevents phantom reads in most cases using gap locks.

## Setting the Isolation Level

### Session-Level

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

### Global-Level

```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```

Global changes apply to new connections only, not existing ones.

### In my.cnf

```text
[mysqld]
transaction_isolation = READ-COMMITTED
```

### Checking the Current Level

```sql
SELECT @@transaction_isolation;
-- or
SHOW VARIABLES LIKE 'transaction_isolation';
```

## READ UNCOMMITTED

Allows reading uncommitted changes from other transactions (dirty reads). Almost never appropriate for production use.

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

-- Session A
START TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
-- Not yet committed

-- Session B (READ UNCOMMITTED)
SELECT balance FROM accounts WHERE id = 1;
-- Sees the uncommitted deduction - a dirty read
```

## READ COMMITTED

Prevents dirty reads. Each query sees only committed data at the time the query runs. Non-repeatable reads are still possible.

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Session A
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Session B commits a change
UPDATE accounts SET balance = 900 WHERE id = 1;
COMMIT;

-- Session A reads again (same transaction)
SELECT balance FROM accounts WHERE id = 1;  -- Returns 900 (non-repeatable read)
```

`READ COMMITTED` is commonly used in high-concurrency OLTP systems (and is the default in PostgreSQL).

## REPEATABLE READ (MySQL Default)

Guarantees that repeated reads within a transaction see the same data. Uses a consistent snapshot established by the first read in the transaction.

```sql
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;

-- Session A
START TRANSACTION;
SELECT balance FROM accounts WHERE id = 1;  -- Returns 1000

-- Session B commits an update
UPDATE accounts SET balance = 900 WHERE id = 1;
COMMIT;

-- Session A reads again
SELECT balance FROM accounts WHERE id = 1;  -- Still returns 1000 (repeatable read)

COMMIT;
```

## SERIALIZABLE

The strictest level. Transactions execute as if they run one at a time. MySQL converts all plain `SELECT` statements to `SELECT ... FOR SHARE` if autocommit is disabled.

```sql
SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Session A reads
START TRANSACTION;
SELECT * FROM inventory WHERE product_id = 5;  -- Acquires shared lock

-- Session B tries to update
UPDATE inventory SET quantity = 10 WHERE product_id = 5;
-- Blocked until Session A commits
```

Use `SERIALIZABLE` for critical financial operations where phantom reads could cause correctness issues.

## Setting Per-Transaction

You can set the isolation level for just the next transaction:

```sql
-- Next transaction only
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
-- ... queries here use READ COMMITTED
COMMIT;

-- Subsequent transactions revert to session default
```

## Isolation Level and Performance

Higher isolation levels use more locking and reduce concurrency:

```text
READ UNCOMMITTED  - Fewest locks, highest concurrency, lowest consistency
READ COMMITTED    - Less locking than REPEATABLE READ, good balance
REPEATABLE READ   - Default, good consistency with reasonable concurrency
SERIALIZABLE      - Maximum locks, lowest concurrency, highest consistency
```

For most OLTP workloads, `REPEATABLE READ` or `READ COMMITTED` is appropriate.

## Summary

MySQL's four transaction isolation levels let you tune the trade-off between data consistency and concurrency. The default `REPEATABLE READ` works well for most applications by preventing dirty and non-repeatable reads. Use `READ COMMITTED` for high-concurrency systems that can tolerate non-repeatable reads, and reserve `SERIALIZABLE` for operations that require absolute consistency such as financial account transfers. Set the level per-session with `SET SESSION TRANSACTION ISOLATION LEVEL` or globally in `my.cnf`.
