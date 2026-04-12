# How to Configure InnoDB Tablespace Encryption in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Encryption, Security, Tablespace

Description: Learn how to enable and configure InnoDB tablespace encryption in MySQL to protect data at rest using the keyring plugin.

---

InnoDB tablespace encryption protects data at rest by encrypting the physical files on disk. MySQL uses a two-tier key architecture: a master encryption key stored in the keyring and per-tablespace keys that encrypt the actual data.

## Prerequisites and Keyring Setup

Before enabling encryption, install a keyring plugin. The simplest option for testing is the file-based keyring:

```sql
-- Check available keyring plugins
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

Add the keyring plugin to `my.cnf`:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

For production environments, use `keyring_okv` (Oracle Key Vault) or `keyring_aws` instead of the file-based plugin, as the file keyring does not provide true key separation.

## Enabling Encryption on a New Tablespace

Once the keyring is active, you can create encrypted tables or tablespaces:

```sql
-- Create a new table with encryption enabled
CREATE TABLE sensitive_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ssn VARCHAR(20),
    credit_card VARCHAR(20)
) ENCRYPTION='Y';

-- Verify encryption status
SELECT NAME, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE NAME LIKE '%sensitive_data%';
```

## Encrypting an Existing Table

You can enable encryption on an existing table with an `ALTER TABLE` statement:

```sql
-- Enable encryption on an existing table
ALTER TABLE customer_records ENCRYPTION='Y';

-- Disable encryption if needed
ALTER TABLE customer_records ENCRYPTION='N';
```

This operation performs an in-place rebuild of the tablespace, so it can be slow for large tables. Monitor progress using `performance_schema.events_stages_current`.

## Encrypting General and System Tablespaces

For general tablespaces, specify encryption at creation time:

```sql
-- Create an encrypted general tablespace
CREATE TABLESPACE encrypted_ts
    ADD DATAFILE 'encrypted_ts.ibd'
    ENCRYPTION='Y';

-- Move a table into the encrypted tablespace
ALTER TABLE orders TABLESPACE encrypted_ts;
```

To enable encryption for the redo and undo logs, set these variables in `my.cnf`:

```text
[mysqld]
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
```

To encrypt the `mysql` system tablespace (available in MySQL 8.0.16+), run:

```sql
ALTER TABLESPACE mysql ENCRYPTION = 'Y';
```

## Rotating the Master Key

Periodic key rotation is a security best practice. MySQL allows online master key rotation without downtime:

```sql
-- Rotate the master encryption key
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This operation re-encrypts the per-tablespace keys using the new master key but does not re-encrypt the tablespace data itself, making it fast.

## Checking Encryption Status

Use `information_schema` views to audit which tablespaces are encrypted:

```sql
SELECT NAME, SPACE_TYPE, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE ENCRYPTION = 'Y'
ORDER BY NAME;
```

You can also check the keyring status:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

## Performance Considerations

InnoDB tablespace encryption has minimal CPU overhead on modern hardware with AES-NI instructions. The encryption and decryption occur in the InnoDB buffer pool layer, so cached pages are unencrypted in memory. The main performance impact is during initial encryption of existing tables, which requires a full table rebuild.

## Summary

InnoDB tablespace encryption provides transparent data-at-rest protection. Install a keyring plugin first, then use `ENCRYPTION='Y'` on tables or tablespaces. For comprehensive coverage, also enable redo log and undo log encryption. Rotate the master key regularly with `ALTER INSTANCE ROTATE INNODB MASTER KEY` to maintain strong security posture.
