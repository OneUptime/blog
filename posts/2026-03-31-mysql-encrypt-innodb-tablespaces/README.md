# How to Encrypt InnoDB Tablespaces in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Encryption, Security, Tablespace

Description: Learn how to encrypt InnoDB tablespaces in MySQL to protect data at rest, including file-per-table and general tablespace encryption.

---

MySQL InnoDB supports tablespace encryption to protect database files stored on disk. Encryption operates at the tablespace level, meaning each table or general tablespace gets its own encrypted data file. This approach allows selective encryption without encrypting the entire database, giving fine-grained control over what data is protected at rest.

## Understanding InnoDB Tablespace Types

InnoDB uses two main tablespace types:

- **File-per-table tablespaces** - Each table has its own `.ibd` file (enabled by default with `innodb_file_per_table=ON`)
- **General tablespaces** - Shared tablespaces containing multiple tables
- **System tablespace** - The `ibdata1` file (cannot be encrypted directly)

## Prerequisite: Enable a Keyring Plugin

Tablespace encryption requires a keyring plugin. Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

## Encrypting a File-per-Table Tablespace

When `innodb_file_per_table=ON` (the default), each table gets its own `.ibd` file:

```sql
-- Create a new encrypted table
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  status ENUM('pending','paid','shipped') NOT NULL
) ENGINE=InnoDB ENCRYPTION='Y';

-- Encrypt an existing table
ALTER TABLE legacy_orders ENCRYPTION='Y';
```

## Creating an Encrypted General Tablespace

General tablespaces can hold multiple tables with shared encryption:

```sql
-- Create an encrypted general tablespace
CREATE TABLESPACE `secure_ts`
  ADD DATAFILE 'secure_ts.ibd'
  ENCRYPTION = 'Y';

-- Move existing tables into the encrypted tablespace
ALTER TABLE payments TABLESPACE secure_ts;
ALTER TABLE pii_records TABLESPACE secure_ts;
```

## Checking Tablespace Encryption Status

```sql
-- Check which tablespaces are encrypted
SELECT SPACE, NAME, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE ENCRYPTION = 'Y'
ORDER BY NAME;
```

```sql
-- Check individual tables
SELECT TABLE_SCHEMA, TABLE_NAME, CREATE_OPTIONS
FROM information_schema.TABLES
WHERE CREATE_OPTIONS LIKE '%ENCRYPTION="Y"%';
```

## Enabling Encryption by Default

To encrypt all new tables automatically, add to `my.cnf`:

```text
[mysqld]
default_table_encryption=ON
```

With this setting, `CREATE TABLE` statements without an `ENCRYPTION` clause will default to encrypted.

## Verifying Encryption at the File Level

```bash
# Confirm the .ibd file is encrypted (first bytes will not be readable text)
strings /var/lib/mysql/mydb/orders.ibd | head -5
```

An unencrypted tablespace would show readable SQL identifiers; an encrypted one shows binary garbage.

## Rotating Tablespace Encryption Keys

```sql
-- Rotate the master key (re-encrypts all tablespace keys with the new master key)
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

## Removing Encryption

```sql
-- Decrypt a single table
ALTER TABLE orders ENCRYPTION='N';

-- Decrypt a general tablespace
ALTER TABLESPACE secure_ts ENCRYPTION='N';
```

## Summary

InnoDB tablespace encryption in MySQL protects `.ibd` files at rest with minimal performance overhead (typically 5-10% depending on hardware). Use file-per-table encryption for granular control or general tablespaces for grouping sensitive tables. Always pair tablespace encryption with keyring plugin configuration and rotate the master key regularly.
