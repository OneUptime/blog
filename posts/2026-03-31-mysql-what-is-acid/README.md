# What Is ACID in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ACID, Transaction, InnoDB, Database

Description: ACID stands for Atomicity, Consistency, Isolation, and Durability - the four properties that guarantee reliable transaction processing in MySQL's InnoDB engine.

---

## Overview

ACID is an acronym describing four properties that database transactions must have to ensure data validity even in the face of errors, crashes, and concurrent access. MySQL's InnoDB storage engine is ACID-compliant, making it suitable for applications where data integrity is critical. Understanding ACID helps you write better transactions and reason about what guarantees your database provides.

## Atomicity

Atomicity means a transaction is all-or-nothing. Either all the SQL statements in a transaction succeed and are committed, or none of them take effect. There is no partial transaction.

```sql
START TRANSACTION;

-- Transfer $100 from account 1 to account 2
UPDATE accounts SET balance = balance - 100 WHERE account_id = 1;
UPDATE accounts SET balance = balance + 100 WHERE account_id = 2;

-- If any error occurs here, both updates are rolled back
COMMIT;
```

If the connection drops after the first UPDATE but before the second, InnoDB automatically rolls back the partial transaction. Account 1 is not debited without Account 2 being credited.

## Consistency

Consistency means a transaction brings the database from one valid state to another valid state. All database rules - constraints, cascades, triggers - must hold both before and after the transaction.

```sql
CREATE TABLE accounts (
  account_id INT PRIMARY KEY,
  balance DECIMAL(10,2) NOT NULL,
  CONSTRAINT chk_balance CHECK (balance >= 0)
);

START TRANSACTION;
-- This will fail if balance would go negative, preserving consistency
UPDATE accounts SET balance = balance - 500 WHERE account_id = 1;
-- ERROR 3819 if balance < 500: check constraint violation prevents inconsistency
COMMIT;
```

Consistency is partly enforced by the database (constraints, foreign keys) and partly the application's responsibility (ensuring business rules are followed within transactions).

## Isolation

Isolation means concurrent transactions execute as if they were serial - one after another. Changes made by an in-progress transaction are not visible to other transactions until committed (depending on isolation level).

```sql
-- Session 1: reading account balance
START TRANSACTION;
SELECT balance FROM accounts WHERE account_id = 1; -- returns 500

-- Session 2 (concurrently): updates the same account
UPDATE accounts SET balance = 400 WHERE account_id = 1;
COMMIT;

-- Session 1: reads again - with REPEATABLE READ (default), still sees 500
-- The transaction has a consistent snapshot from when it started
SELECT balance FROM accounts WHERE account_id = 1;
COMMIT;
```

```sql
-- Check current isolation level
SHOW VARIABLES LIKE 'transaction_isolation';

-- InnoDB default is REPEATABLE READ
-- Options: READ UNCOMMITTED, READ COMMITTED, REPEATABLE READ, SERIALIZABLE
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

## Durability

Durability means once a transaction is committed, it remains committed even if the system crashes immediately afterward. InnoDB achieves this through the redo log - committed changes are written to durable storage before the commit returns success to the client.

```sql
-- This setting controls durability vs performance tradeoff
SHOW VARIABLES LIKE 'innodb_flush_log_at_trx_commit';
-- 1 = full durability (flush redo log to disk on every COMMIT)
-- 2 = flush to OS buffer (survives MySQL crash, not OS crash)
-- 0 = flush once per second (can lose last second of commits)
```

```sql
-- After COMMIT returns with innodb_flush_log_at_trx_commit=1,
-- the data is guaranteed durable even if MySQL crashes immediately
START TRANSACTION;
INSERT INTO orders (customer_id, total) VALUES (42, 149.99);
COMMIT; -- Safe - data is on disk
```

## ACID in Practice

```sql
-- Verify InnoDB is being used (ACID-compliant)
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND ENGINE != 'InnoDB';
-- Any non-InnoDB tables may not be fully ACID-compliant

-- Example: Non-atomic operation with MyISAM (no transactions)
-- CREATE TABLE log ENGINE=MyISAM ...
-- A crash mid-INSERT can leave partial data
```

## Summary

ACID stands for Atomicity (all-or-nothing transactions), Consistency (database rules enforced before and after), Isolation (concurrent transactions do not interfere), and Durability (committed data survives crashes). MySQL's InnoDB engine provides all four ACID properties through mechanisms including the redo log (durability), undo log (atomicity and isolation via MVCC), row-level locking (isolation), and constraint enforcement (consistency). ACID compliance is the foundation of reliable transactional applications and is a primary reason InnoDB is MySQL's default storage engine.
