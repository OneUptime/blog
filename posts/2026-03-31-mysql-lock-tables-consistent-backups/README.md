# How to Use LOCK TABLES for Consistent Backups in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, LOCK TABLES, Consistency, mysqldump

Description: Learn how to use LOCK TABLES and FLUSH TABLES WITH READ LOCK to take consistent MySQL backups while minimizing the impact on application availability.

---

## Overview

Taking a consistent backup of a MySQL database requires ensuring that data does not change during the export. For InnoDB databases, you can achieve consistency without long-duration locks, but for mixed or MyISAM databases, table locks are often necessary.

## Why Locking Matters for Backups

Without locking, a backup taken while data is being modified will be inconsistent - some tables will reflect state before a transaction and others will reflect state after it.

```text
Without locking:
  Table A exported at T=0: 100 rows
  Transaction commits at T=1: moves 10 rows from A to B
  Table B exported at T=2: already has the 10 rows
  Result: backup shows 110 rows total (10 rows duplicated)
```

## FLUSH TABLES WITH READ LOCK

`FLUSH TABLES WITH READ LOCK` (FTWRL) acquires a global read lock, preventing any writes to any table:

```sql
-- Acquire global read lock
FLUSH TABLES WITH READ LOCK;

-- Record the binary log position for replication
SHOW BINARY LOG STATUS;

-- (Take your backup here - typically with mysqldump or filesystem snapshot)

-- Release the lock
UNLOCK TABLES;
```

This is used internally by `mysqldump` when backing up mixed-engine databases.

## Using mysqldump with Consistent Locking

```bash
# For InnoDB tables - uses consistent snapshot, no long lock
mysqldump \
  --single-transaction \
  --host=localhost \
  --user=backup_user \
  --password=backup_password \
  --databases myapp \
  --routines \
  --triggers \
  --events \
  > /backup/myapp-$(date +%Y%m%d).sql

# For MyISAM tables - requires LOCK TABLES
mysqldump \
  --lock-tables \
  --host=localhost \
  --user=backup_user \
  --password=backup_password \
  --databases myapp \
  > /backup/myapp-$(date +%Y%m%d).sql

# For mixed environments (some MyISAM, some InnoDB)
mysqldump \
  --lock-all-tables \
  --host=localhost \
  --user=backup_user \
  --password=backup_password \
  --databases myapp \
  > /backup/myapp-$(date +%Y%m%d).sql
```

## The --single-transaction Option for InnoDB

For pure InnoDB databases, `--single-transaction` is vastly preferable to locking:

```bash
mysqldump --single-transaction --databases myapp > backup.sql
```

This starts a transaction with `REPEATABLE READ` isolation before the dump begins. InnoDB's MVCC (Multi-Version Concurrency Control) provides a consistent snapshot without blocking writes to the tables.

```sql
-- What --single-transaction does internally:
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION WITH CONSISTENT SNAPSHOT;
-- (dump proceeds here)
COMMIT;
```

## LOCK TABLES for Specific Tables

If you only need to lock specific tables:

```sql
-- Lock multiple tables for reading
LOCK TABLES
    orders READ,
    order_items READ,
    customers READ;

-- Perform backup operations
SELECT * INTO OUTFILE '/tmp/orders.csv' FROM orders;
SELECT * INTO OUTFILE '/tmp/order_items.csv' FROM order_items;

-- Release all locks
UNLOCK TABLES;
```

## Required Privileges for Backup Locks

```sql
-- Create a dedicated backup user with appropriate privileges
CREATE USER 'backup_user'@'localhost'
  IDENTIFIED BY 'backup_password';

GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER
  ON myapp.*
  TO 'backup_user'@'localhost';

-- For FTWRL (needed for mixed-engine backups)
GRANT RELOAD ON *.* TO 'backup_user'@'localhost';
```

## Summary

For consistent MySQL backups, use `--single-transaction` with `mysqldump` for InnoDB-only databases to take a consistent snapshot without blocking writes. For databases with MyISAM tables, use `--lock-tables` or `--lock-all-tables` to ensure consistency, accepting the write-blocking trade-off. Always record the binary log position during backup for point-in-time recovery and replication setup. Create a dedicated backup user with only the minimum required privileges rather than using the root account for backups.
