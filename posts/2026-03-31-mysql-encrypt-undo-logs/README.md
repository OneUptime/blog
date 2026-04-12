# How to Encrypt Undo Logs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Encryption, Undo Log, Security

Description: Learn how to enable InnoDB undo log encryption in MySQL 8.0 to protect rollback segment data stored on disk from unauthorized access.

---

InnoDB undo logs store the previous versions of rows needed for transaction rollback and MVCC (Multi-Version Concurrency Control). These logs can contain sensitive data from ongoing transactions. MySQL 8.0.1 introduced undo log encryption, allowing you to encrypt undo tablespace files stored on disk using the keyring plugin.

## Understanding Undo Log Storage

In MySQL 8.0, undo logs are stored in undo tablespace files (`undo_001`, `undo_002`) located in the data directory by default. These are separate from the system tablespace and can be encrypted independently.

## Prerequisites

Undo log encryption requires a keyring plugin. Configure it in `my.cnf`:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

## Enabling Undo Log Encryption

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
innodb_undo_log_encrypt=ON
```

Or set it dynamically:

```sql
SET GLOBAL innodb_undo_log_encrypt = ON;
```

## Verifying Undo Log Encryption

```sql
SHOW VARIABLES LIKE 'innodb_undo_log_encrypt';
```

```text
+-------------------------+-------+
| Variable_name           | Value |
+-------------------------+-------+
| innodb_undo_log_encrypt | ON    |
+-------------------------+-------+
```

## Checking Undo Tablespace Status

```sql
-- List all undo tablespace files
SELECT TABLESPACE_NAME, FILE_NAME, FILE_TYPE
FROM information_schema.FILES
WHERE FILE_TYPE = 'UNDO LOG';
```

```sql
-- Check from INNODB_TABLESPACES
SELECT NAME, ENCRYPTION, STATE
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE 'innodb_undo%';
```

## Encrypting Existing Undo Tablespaces

If you enable encryption after creation, existing undo tablespace files are not automatically re-encrypted. You can rotate them using:

```sql
-- Mark undo tablespace inactive, then active to trigger re-encryption
ALTER UNDO TABLESPACE innodb_undo_001 SET INACTIVE;
-- Wait for purge to complete...
ALTER UNDO TABLESPACE innodb_undo_001 SET ACTIVE;
```

## Creating New Encrypted Undo Tablespaces

```sql
-- Create a new undo tablespace (will be encrypted if innodb_undo_log_encrypt=ON)
CREATE UNDO TABLESPACE extra_undo_001
  ADD DATAFILE 'extra_undo_001.ibu';
```

## Full At-Rest Encryption Configuration

For complete protection, combine all InnoDB encryption options:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
default_table_encryption=ON
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
binlog_encryption=ON
```

## Rotating the Master Key

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This rotates the master key used to protect all InnoDB encryption keys, including those for undo tablespaces.

## Monitoring Key Usage

```sql
SELECT * FROM performance_schema.keyring_keys
ORDER BY KEY_ID;
```

## Summary

InnoDB undo log encryption protects rollback segment data at rest by encrypting the undo tablespace files. Enable it with `innodb_undo_log_encrypt=ON` and pair it with keyring plugin configuration. Use alongside tablespace and redo log encryption for a complete at-rest encryption strategy, and rotate the InnoDB master key regularly.
