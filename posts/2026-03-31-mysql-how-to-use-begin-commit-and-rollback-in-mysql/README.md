# How to Use BEGIN, COMMIT, and ROLLBACK in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transaction, InnoDB, Data Integrity

Description: Learn how to use BEGIN, COMMIT, and ROLLBACK in MySQL to manage transactions, ensure data consistency, and handle errors atomically.

---

## The Three Core Transaction Commands

- `BEGIN` (or `START TRANSACTION`) - starts a new transaction
- `COMMIT` - permanently saves all changes made in the transaction
- `ROLLBACK` - discards all changes made in the transaction since `BEGIN`

## Basic Pattern

```sql
BEGIN;

-- DML statements
INSERT INTO ...;
UPDATE ...;
DELETE FROM ...;

COMMIT;   -- save all changes
-- OR
ROLLBACK; -- discard all changes
```

## Sample Schema

```sql
CREATE TABLE accounts (
    account_id INT NOT NULL AUTO_INCREMENT,
    owner      VARCHAR(50) NOT NULL,
    balance    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (account_id),
    CONSTRAINT chk_balance CHECK (balance >= 0)
);

INSERT INTO accounts (owner, balance) VALUES ('Alice', 1000.00), ('Bob', 500.00);
```

## Successful Transaction with COMMIT

```sql
BEGIN;

UPDATE accounts SET balance = balance - 200 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 200 WHERE account_id = 2;

COMMIT;
```

After `COMMIT`, both changes are permanent and visible to other sessions.

## Failed Transaction with ROLLBACK

```sql
BEGIN;

UPDATE accounts SET balance = balance - 2000 WHERE account_id = 1;
-- This violates the CHECK (balance >= 0) constraint

-- Decide to abort
ROLLBACK;
```

After `ROLLBACK`, no changes were applied.

## Automatic Rollback on Error

In MySQL, certain statement errors automatically roll back only that statement but leave the transaction open. You must explicitly `ROLLBACK` the whole transaction:

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;  -- succeeds

UPDATE accounts SET balance = balance - 9999 WHERE account_id = 2;  -- fails (CHECK constraint)
-- Statement is rolled back, but transaction is still open

ROLLBACK;  -- roll back the first UPDATE too
```

## Using Transactions in Application Code

Python example:

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', password='pass', database='myapp')
cursor = conn.cursor()

try:
    conn.start_transaction()

    cursor.execute(
        "UPDATE accounts SET balance = balance - %s WHERE account_id = %s",
        (200, 1)
    )
    cursor.execute(
        "UPDATE accounts SET balance = balance + %s WHERE account_id = %s",
        (200, 2)
    )

    conn.commit()
    print("Transfer complete")

except Exception as e:
    conn.rollback()
    print(f"Transfer failed, rolled back: {e}")

finally:
    cursor.close()
    conn.close()
```

## Verifying Transaction State

```sql
-- Check if the current connection has an active transaction
SELECT COUNT(*) AS in_transaction
FROM information_schema.innodb_trx
WHERE trx_mysql_thread_id = CONNECTION_ID();

-- Check uncommitted changes within the transaction
SELECT * FROM accounts;   -- shows current session's view
```

## BEGIN vs START TRANSACTION

`BEGIN` and `START TRANSACTION` are functionally equivalent. `START TRANSACTION` supports additional options:

```sql
-- These are equivalent
BEGIN;
START TRANSACTION;

-- START TRANSACTION supports options
START TRANSACTION READ ONLY;
START TRANSACTION WITH CONSISTENT SNAPSHOT;
```

## Nested BEGIN (No True Nesting)

MySQL does not support nested transactions. A `BEGIN` inside a transaction implicitly commits the previous transaction:

```sql
BEGIN;
UPDATE accounts SET balance = 500 WHERE account_id = 1;

BEGIN;  -- implicitly commits the UPDATE above!

UPDATE accounts SET balance = 600 WHERE account_id = 1;
ROLLBACK;  -- only rolls back this second transaction
```

Use `SAVEPOINT` for nested rollback points instead.

## ROLLBACK to SAVEPOINT

```sql
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;

SAVEPOINT after_debit;

UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;

-- Undo only the second update
ROLLBACK TO SAVEPOINT after_debit;

COMMIT;  -- Only the first update is committed
```

## Summary

`BEGIN` starts a transaction, `COMMIT` saves all changes permanently, and `ROLLBACK` discards them. Always use explicit transactions for multi-step operations that must succeed or fail together. In application code, wrap transactions in try/catch blocks and always roll back on exceptions to maintain data consistency. Use `SAVEPOINT` for partial rollbacks within a transaction.
