# How to Use READ COMMITTED Isolation Level in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, Isolation, InnoDB, Concurrency

Description: Learn how READ COMMITTED isolation level works in MySQL, how it prevents dirty reads, and when to choose it over the default REPEATABLE READ.

---

## What Is READ COMMITTED?

READ COMMITTED is the second-lowest isolation level in MySQL and the default in many other databases like PostgreSQL and Oracle. Under this level, a transaction can only read data that has been committed by other transactions - dirty reads are prevented. However, it still allows non-repeatable reads, meaning the same row can return different values if read twice within a single transaction.

## Setting READ COMMITTED

```sql
-- Set for current session
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Set for next transaction only
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- Set globally
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

Confirm the level:

```sql
SELECT @@transaction_isolation;
-- Returns: READ-COMMITTED
```

## How READ COMMITTED Prevents Dirty Reads

Unlike READ UNCOMMITTED, READ COMMITTED uses a consistent snapshot that refreshes with each new statement inside a transaction:

```sql
-- Session 1: Start but do not commit
START TRANSACTION;
UPDATE products SET price = 99.99 WHERE id = 10;
-- Not committed yet
```

```sql
-- Session 2: READ COMMITTED cannot see Session 1's uncommitted change
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT price FROM products WHERE id = 10;
-- Returns the original price, not 99.99
```

Once Session 1 commits, Session 2's next SELECT will see the updated value.

## Non-Repeatable Reads Under READ COMMITTED

The tradeoff is that the snapshot refreshes per statement, not per transaction:

```sql
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;

SELECT price FROM products WHERE id = 10;
-- Returns 50.00

-- Session 1 commits price = 99.99 here

SELECT price FROM products WHERE id = 10;
-- Returns 99.99 - value changed within our transaction

COMMIT;
```

This can cause logical inconsistencies in complex transactions that read the same rows multiple times.

## Locking Behavior

READ COMMITTED uses row-level locks for locking reads (SELECT ... FOR UPDATE, SELECT ... FOR SHARE) and DML (INSERT, UPDATE, DELETE), but does not use gap locks, which reduces lock contention:

```sql
-- Under READ COMMITTED, this only locks the specific row with id=5
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT * FROM orders WHERE id = 5 FOR UPDATE;
-- Gap locks are NOT acquired here
COMMIT;
```

This reduced locking makes READ COMMITTED popular for high-concurrency OLTP workloads.

## Enabling READ COMMITTED for Binary Logging

MySQL requires row-based binary logging when using READ COMMITTED with statement-based replication:

```sql
-- Check current binlog format
SHOW VARIABLES LIKE 'binlog_format';

-- Set to ROW format if using READ COMMITTED
SET GLOBAL binlog_format = 'ROW';
```

Failing to do this with statement-based binlog and READ COMMITTED may cause replication errors.

## When to Use READ COMMITTED

READ COMMITTED is a good choice when:

- High concurrency is needed and gap lock contention is a problem
- Your application logic handles non-repeatable reads gracefully
- You want to match the default behavior of PostgreSQL or Oracle
- Reporting queries should see the latest committed data immediately

```sql
-- Fresh report without gap lock overhead
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT customer_id, SUM(total) FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY customer_id;
```

## Summary

READ COMMITTED prevents dirty reads by only exposing committed data while allowing non-repeatable reads since the read snapshot refreshes per statement. It reduces lock contention compared to REPEATABLE READ, making it well-suited for high-concurrency applications that do not require stable repeated reads within a single transaction.
