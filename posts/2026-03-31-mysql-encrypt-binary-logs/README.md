# How to Encrypt Binary Logs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Encryption, Security, Replication

Description: Learn how to enable binary log encryption in MySQL 8.0 to protect replication data and point-in-time recovery logs stored on disk.

---

MySQL binary logs record all data-changing statements and are essential for replication and point-in-time recovery. However, binary log files can contain sensitive data - including raw INSERT and UPDATE values. MySQL 8.0.14 introduced binary log encryption to protect these files at rest using the same keyring infrastructure used for tablespace encryption.

## Prerequisites

Binary log encryption requires:

1. Binary logging enabled (`log_bin=ON`)
2. A keyring plugin installed and active

## Installing the Keyring Plugin

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf` before enabling encryption:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

## Enabling Binary Log Encryption

Add the encryption setting to `my.cnf`:

```text
[mysqld]
log_bin=/var/lib/mysql/mysql-bin
binlog_encryption=ON
```

Restart MySQL to apply:

```bash
systemctl restart mysql
```

## Enabling Binary Log Encryption at Runtime

You can also enable it dynamically without a restart (MySQL 8.0.14+):

```sql
SET GLOBAL binlog_encryption = ON;
```

## Verifying Binary Log Encryption Is Active

```sql
SHOW VARIABLES LIKE 'binlog_encryption';
```

```text
+-------------------+-------+
| Variable_name     | Value |
+-------------------+-------+
| binlog_encryption | ON    |
+-------------------+-------+
```

Check binary log files and their encryption status:

```sql
SHOW BINARY LOGS;
```

```sql
SHOW MASTER STATUS\G
```

## Reading Encrypted Binary Log Files

Encrypted binary logs cannot be read directly from disk without the keyring. Use `mysqlbinlog` with `--read-from-remote-server` to read them through the server:

```bash
mysqlbinlog --read-from-remote-server \
  --host=localhost \
  --user=root \
  --password \
  mysql-bin.000001 | head -20
```

To check which log files are encrypted, use `SHOW BINARY LOGS` - the `Encrypted` column indicates `Yes` or `No` for each file.

## Relay Log Encryption for Replicas

The `binlog_encryption` variable controls encryption for both binary log files and relay log files. To encrypt relay logs on a replica, enable `binlog_encryption` on that server - binary logging does not need to be enabled on the replica for relay log encryption to work:

```text
[mysqld]
binlog_encryption=ON
```

Or set dynamically:

```sql
SET GLOBAL binlog_encryption = ON;
```

## Rotating the Binary Log Encryption Key

```sql
-- Rotate the binary log master key
ALTER INSTANCE ROTATE BINLOG MASTER KEY;
```

This generates a new binary log encryption key, rotates the binary log and relay log files, and re-encrypts the file passwords of all existing encrypted log files using the new key. Previous keys that are no longer in use are removed from the keyring.

## Disabling Binary Log Encryption

```sql
SET GLOBAL binlog_encryption = OFF;
```

Note: Existing encrypted log files remain encrypted even after disabling. New log files will be unencrypted.

## Summary

Binary log encryption in MySQL 8.0 protects replication and recovery logs from unauthorized disk access. Enable it via `binlog_encryption=ON` in `my.cnf` or dynamically at runtime. Always pair binary log encryption with keyring management and rotate the binary log master key periodically. Relay log encryption on replicas provides end-to-end protection across your entire replication topology.
