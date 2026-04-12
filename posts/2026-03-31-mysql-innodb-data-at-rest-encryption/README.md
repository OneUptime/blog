# How to Use InnoDB Data-at-Rest Encryption in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Encryption, Security, Tablespace

Description: Learn how to enable and manage InnoDB data-at-rest encryption in MySQL to protect sensitive data stored on disk using tablespace-level encryption.

---

## Overview of InnoDB Data-at-Rest Encryption

InnoDB data-at-rest encryption protects tablespace files (`.ibd` files) stored on disk by encrypting them using a two-tier key architecture. A master key encrypts tablespace keys, and each tablespace has its own encryption key. This means that even if someone gains physical access to the disk, they cannot read the data without the master key stored in a keyring.

Encryption happens at the tablespace level and is transparent to SQL queries - applications do not need any code changes.

## Prerequisites: Installing a Keyring Plugin

Encryption requires a keyring plugin. MySQL ships with several options. The simplest for testing is the file-based keyring:

```ini
[mysqld]
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

For production, use `keyring_encrypted_file` or `keyring_okv` (Oracle Key Vault). After editing `my.cnf`, restart MySQL:

```bash
systemctl restart mysql
```

Verify the keyring plugin is loaded:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

## Enabling Encryption for a New Tablespace

When creating a new table, add `ENCRYPTION='Y'` to enable encryption:

```sql
CREATE TABLE sensitive_data (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ssn VARCHAR(11) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB ENCRYPTION='Y';
```

## Enabling Encryption on an Existing Table

Use `ALTER TABLE` to encrypt an existing table in place:

```sql
ALTER TABLE sensitive_data ENCRYPTION='Y';
```

This is an online DDL operation in MySQL 8.0+ and does not require a table lock in most cases. Monitor progress:

```sql
SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED
FROM performance_schema.events_stages_current
WHERE EVENT_NAME LIKE '%encryption%';
```

## Enabling Default Encryption for All New Tables

To enforce encryption by default for all new InnoDB tables, set:

```ini
[mysqld]
default_table_encryption = ON
```

Or set it at runtime:

```sql
SET GLOBAL default_table_encryption = ON;
```

## Checking Encryption Status

Query the `information_schema.INNODB_TABLESPACES` view to see which tablespaces are encrypted:

```sql
SELECT SPACE, NAME, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE ENCRYPTION = 'Y';
```

## Rotating the Master Key

Periodic master key rotation is a security best practice. After rotating, existing tablespace keys are re-encrypted with the new master key but the data itself is not re-encrypted:

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

## Disabling Encryption on a Table

To remove encryption from an existing table:

```sql
ALTER TABLE sensitive_data ENCRYPTION='N';
```

Note: This only works if `default_table_encryption` is OFF and the general tablespace allows unencrypted tables.

## Performance Considerations

InnoDB encryption uses AES-256 in CBC mode and leverages hardware AES-NI instructions when available. On modern CPUs the overhead is typically 3-8% for I/O-bound workloads. You can check if AES-NI is available:

```bash
grep -m1 aes /proc/cpuinfo
```

For CPU-bound workloads, the overhead is negligible since encryption happens only during disk reads and writes, not in-memory operations.

## Summary

InnoDB data-at-rest encryption provides transparent disk-level protection using a two-tier key architecture. Install a keyring plugin, use `ENCRYPTION='Y'` on tables or set `default_table_encryption = ON` globally, and rotate the master key periodically with `ALTER INSTANCE ROTATE INNODB MASTER KEY`. The feature integrates seamlessly with existing queries and incurs minimal performance overhead on hardware with AES-NI support.
