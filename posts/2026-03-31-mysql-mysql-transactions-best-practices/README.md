# How to Handle MySQL Transactions Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, ACID, Isolation, Best Practice

Description: Learn MySQL transaction best practices covering isolation levels, keeping transactions short, savepoints, and avoiding common pitfalls that cause deadlocks and lock contention.

---

MySQL transactions guarantee ACID properties - Atomicity, Consistency, Isolation, Durability - when using InnoDB. Poor transaction design causes deadlocks, long-held locks, and degraded concurrency. Following a set of best practices keeps transactions safe and efficient.

## Keep Transactions Short

The single most important rule: open a transaction, do the minimum necessary work, and commit immediately. Long transactions hold row locks and delay garbage collection of old row versions:

```sql
-- Bad: fetching data inside a transaction that does not need it
START TRANSACTION;
SELECT * FROM products;         -- keeps MVCC snapshot open unnecessarily
-- ... application logic ...
UPDATE inventory SET qty = 5 WHERE product_id = 1;
COMMIT;

-- Better: read outside the transaction, write inside
SELECT * FROM products;         -- no transaction open

START TRANSACTION;
UPDATE inventory SET qty = 5 WHERE product_id = 1;
COMMIT;
```

## Choose the Right Isolation Level

MySQL defaults to `REPEATABLE READ`. Understand the trade-offs:

```sql
-- Check current isolation level
SHOW VARIABLES LIKE 'transaction_isolation';

-- Set per-session for a reporting query (accepts phantom reads in exchange for more concurrency)
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- For financial operations, REPEATABLE READ prevents non-repeatable reads
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

Use `READ COMMITTED` for high-concurrency workloads where you do not need to reread the same row multiple times within a transaction.

## Use SELECT ... FOR UPDATE for Pessimistic Locking

When you read a row and intend to update it in the same transaction, lock it immediately:

```sql
START TRANSACTION;

SELECT balance FROM accounts WHERE id = 42 FOR UPDATE;
-- The row is now locked; no other transaction can modify it

UPDATE accounts SET balance = balance - 100 WHERE id = 42;
COMMIT;
```

Without `FOR UPDATE`, another transaction can modify the row between your SELECT and UPDATE, causing a lost update.

## Access Rows in a Consistent Order to Prevent Deadlocks

Deadlocks occur when two transactions lock rows in opposite orders. Enforce a consistent order:

```sql
-- Both transactions must always lock the lower account ID first
START TRANSACTION;
SELECT balance FROM accounts WHERE id = LEAST(from_id, to_id) FOR UPDATE;
SELECT balance FROM accounts WHERE id = GREATEST(from_id, to_id) FOR UPDATE;
-- perform updates
COMMIT;
```

## Use Savepoints for Nested Rollback

Savepoints allow partial rollbacks within a transaction:

```sql
START TRANSACTION;

INSERT INTO orders (customer_id, total) VALUES (10, 500.00);
SAVEPOINT order_inserted;

INSERT INTO order_items (order_id, product_id, qty) VALUES (LAST_INSERT_ID(), 5, 2);

-- If the item insert fails, roll back only to the savepoint
ROLLBACK TO SAVEPOINT order_inserted;

-- The order row is still in place; commit it
COMMIT;
```

## Always Handle Commit and Rollback Explicitly

Never rely on implicit commit. Use try/finally patterns:

```python
conn = get_connection()
try:
    conn.begin()
    conn.execute("UPDATE orders SET status = 'processing' WHERE id = %s", (order_id,))
    conn.execute("INSERT INTO audit_log (order_id, action) VALUES (%s, 'processing')", (order_id,))
    conn.commit()
except Exception:
    conn.rollback()
    raise
```

## Summary

MySQL transaction best practices focus on brevity and predictability: keep transactions as short as possible, choose isolation levels based on concurrency needs, lock rows with `FOR UPDATE` before updating them, access rows in a deterministic order to avoid deadlocks, and always commit or roll back explicitly. These habits prevent the lock contention and deadlock cycles that degrade performance under concurrent load.
