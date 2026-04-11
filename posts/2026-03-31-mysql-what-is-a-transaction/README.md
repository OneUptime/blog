# What Is a Transaction in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, ACID, InnoDB, Database

Description: Learn what a MySQL transaction is, how ACID properties work, how to use BEGIN, COMMIT, and ROLLBACK, and when transactions are essential.

---

## Defining a MySQL Transaction

A transaction is a sequence of one or more SQL statements that are executed as a single logical unit of work. Either all statements in the transaction succeed and are permanently saved, or none of them are applied. Transactions are the foundation of data integrity in relational databases.

MySQL transactions are supported by the InnoDB storage engine. MyISAM tables do not support transactions.

## The ACID Properties

Transactions are defined by four properties collectively known as ACID:

**Atomicity** - All operations in a transaction either complete successfully or are all rolled back. There is no partial success.

**Consistency** - A transaction brings the database from one valid state to another. Constraints, rules, and referential integrity are enforced.

**Isolation** - Concurrent transactions do not interfere with each other. The changes made by one transaction are not visible to other transactions until the transaction commits (depending on isolation level).

**Durability** - Once a transaction is committed, the changes are permanently saved even if the server crashes immediately after.

## Starting and Ending a Transaction

By default, MySQL runs in autocommit mode, where each statement is its own transaction. To group multiple statements into one transaction, use `BEGIN` (or `START TRANSACTION`):

```sql
BEGIN;

UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;

COMMIT;
```

`COMMIT` permanently saves all changes made during the transaction. `ROLLBACK` undoes all changes since `BEGIN`:

```sql
BEGIN;

UPDATE accounts SET balance = balance - 500 WHERE id = 1;

-- Something went wrong, undo everything
ROLLBACK;
```

## A Practical Example: Bank Transfer

Transactions are critical when multiple related changes must succeed or fail together. A bank transfer is the classic example:

```sql
BEGIN;

-- Deduct from sender
UPDATE accounts
SET balance = balance - 500
WHERE id = 1 AND balance >= 500;

-- Check if the update affected a row
-- (balance was sufficient)
SET @rows_updated = ROW_COUNT();

-- Credit the receiver
UPDATE accounts
SET balance = balance + 500
WHERE id = 2;

-- Conditional COMMIT/ROLLBACK based on @rows_updated
-- would be handled in application code or a stored procedure,
-- since IF/THEN control flow is not available in plain SQL sessions.
COMMIT;
```

In application code with a MySQL driver, this is typically handled with try/catch:

```javascript
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  await connection.execute(
    'UPDATE accounts SET balance = balance - 500 WHERE id = ?', [1]
  );
  await connection.execute(
    'UPDATE accounts SET balance = balance + 500 WHERE id = ?', [2]
  );
  await connection.commit();
} catch (err) {
  await connection.rollback();
  throw err;
} finally {
  connection.release();
}
```

## Autocommit Mode

MySQL's default autocommit mode treats every statement as an implicit transaction:

```sql
-- Check current autocommit setting
SHOW VARIABLES LIKE 'autocommit';

-- Disable autocommit for the session
SET autocommit = 0;

-- Now statements require explicit COMMIT
INSERT INTO orders (user_id, total) VALUES (1, 99.99);
COMMIT;
```

When autocommit is disabled, you must explicitly `COMMIT` or `ROLLBACK` to end each transaction.

## Savepoints

Savepoints allow partial rollbacks within a transaction:

```sql
BEGIN;

INSERT INTO orders (user_id, total) VALUES (1, 99.99);
SAVEPOINT order_created;

INSERT INTO order_items (order_id, product_id) VALUES (LAST_INSERT_ID(), 5);
-- This insert fails, roll back to savepoint
ROLLBACK TO SAVEPOINT order_created;

-- The order row is still pending, continue with different items
INSERT INTO order_items (order_id, product_id) VALUES (LAST_INSERT_ID(), 6);

COMMIT;
```

## Transaction Visibility and Isolation

What one transaction can see from another depends on the isolation level. The default is `REPEATABLE READ`:

```sql
SHOW VARIABLES LIKE 'transaction_isolation';
```

At `REPEATABLE READ`, a transaction sees a consistent snapshot of the database established by the first read (SELECT) within the transaction. Changes committed by other transactions after that first read are not visible within the current transaction until it commits and starts a new one.

## Monitoring Active Transactions

Check currently running transactions:

```sql
SELECT
  trx_id,
  trx_state,
  trx_started,
  trx_query
FROM information_schema.INNODB_TRX;
```

Long-running transactions can hold locks and block other queries. Alert on transactions running longer than a threshold using monitoring tools like OneUptime.

## Summary

A MySQL transaction groups multiple SQL statements so they succeed or fail together, guaranteed by InnoDB's ACID properties. Use `BEGIN`, `COMMIT`, and `ROLLBACK` to control transaction boundaries. Transactions are essential whenever multiple related rows must be updated atomically, such as financial transfers, order creation, or any operation where partial completion would corrupt data integrity.
