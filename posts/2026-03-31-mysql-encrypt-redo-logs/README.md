# How to Encrypt Redo Logs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Encryption, Redo Log, Security

Description: Learn how to enable InnoDB redo log encryption in MySQL 8.0 to protect transaction logs stored on disk from unauthorized access.

---

InnoDB redo logs record all changes made to data pages before those changes are written to the actual tablespace files. These logs are critical for crash recovery but can expose sensitive data if disk files are accessed by unauthorized parties. MySQL 8.0.1 introduced redo log encryption to address this risk, encrypting redo log files using the same keyring infrastructure as tablespace encryption.

## Prerequisites

Redo log encryption requires a keyring plugin to be loaded. Configure this in `my.cnf`:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

Create the keyring directory:

```bash
mkdir -p /var/lib/mysql-keyring
chown mysql:mysql /var/lib/mysql-keyring
chmod 750 /var/lib/mysql-keyring
```

## Enabling Redo Log Encryption

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
innodb_redo_log_encrypt=ON
```

Restart MySQL:

```bash
systemctl restart mysql
```

## Enabling Redo Log Encryption Dynamically

MySQL 8.0 allows enabling redo log encryption at runtime without restart:

```sql
SET GLOBAL innodb_redo_log_encrypt = ON;
```

## Verifying Redo Log Encryption Status

```sql
SHOW VARIABLES LIKE 'innodb_redo_log_encrypt';
```

```text
+-------------------------+-------+
| Variable_name           | Value |
+-------------------------+-------+
| innodb_redo_log_encrypt | ON    |
+-------------------------+-------+
```

## Checking Redo Log Files

Redo log files are located in the MySQL data directory (or in the dedicated redo log directory if configured):

```bash
ls -la /var/lib/mysql/#innodb_redo/
```

In MySQL 8.0.30+, redo log files are named `#ib_redo0`, `#ib_redo1`, etc. in the `#innodb_redo` directory.

## Checking Redo Log Status via Performance Schema

The `log_status` table provides redo log position information useful for online backup coordination:

```sql
SELECT * FROM performance_schema.log_status\G
```

Note: This table shows log sequence numbers and checkpoint positions, not encryption status directly. Use `SHOW VARIABLES LIKE 'innodb_redo_log_encrypt'` to confirm encryption is enabled.

## Combined Encryption Configuration

For comprehensive at-rest encryption, combine all InnoDB encryption settings:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
default_table_encryption=ON
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
binlog_encryption=ON
```

## Rotating the Master Encryption Key

The redo log encryption key is derived from the InnoDB master key. Rotate it with:

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This re-encrypts tablespace and redo log encryption keys without re-encrypting all data.

## Performance Considerations

Redo log encryption adds minimal CPU overhead on modern hardware with AES-NI support. On systems without hardware AES acceleration, expect a 5-10% write performance impact. Check AES support:

```bash
grep -m1 aes /proc/cpuinfo
```

## Disabling Redo Log Encryption

```sql
SET GLOBAL innodb_redo_log_encrypt = OFF;
```

New redo log records will be unencrypted, but in-flight encrypted records complete normally.

## Summary

InnoDB redo log encryption in MySQL 8.0 protects transaction log files at rest using the keyring plugin infrastructure. Enable it with `innodb_redo_log_encrypt=ON` either in `my.cnf` or dynamically. Pair it with tablespace and undo log encryption for comprehensive at-rest protection, and rotate the master key periodically for strong key hygiene.
