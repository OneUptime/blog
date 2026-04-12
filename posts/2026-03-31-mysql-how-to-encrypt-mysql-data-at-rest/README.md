# How to Encrypt MySQL Data at Rest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Encryption, Security, InnoDB, Data at Rest

Description: Learn how to enable MySQL data-at-rest encryption using InnoDB tablespace encryption, keyring plugins, and encrypted undo/redo logs.

---

## Why Encrypt Data at Rest

Encrypting data at rest protects sensitive information if physical media is stolen or if unauthorized access occurs to the underlying storage. MySQL InnoDB tablespace encryption encrypts data pages before writing them to disk, making the raw files unreadable without the encryption key.

## Prerequisites

MySQL 8.0 supports InnoDB data-at-rest encryption natively. You need a keyring plugin configured before enabling encryption.

## Step 1: Configure a Keyring Plugin

MySQL 8.0 includes two options:

- `keyring_file` - stores keys in a local file (simple but less secure)
- `keyring_vault` - stores keys in HashiCorp Vault (recommended for production)

### Using keyring_file (Development/Testing)

```text
[mysqld]
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

Create the keyring directory:

```bash
mkdir -p /var/lib/mysql-keyring
chown mysql:mysql /var/lib/mysql-keyring
chmod 750 /var/lib/mysql-keyring
```

Restart MySQL and verify:

```sql
SELECT plugin_name, plugin_status
FROM information_schema.plugins
WHERE plugin_name = 'keyring_file';
```

### Using keyring_vault (Production)

```text
[mysqld]
early-plugin-load = keyring_vault.so
keyring_vault_config = /etc/mysql/vault.conf
```

```text
# /etc/mysql/vault.conf
vault_url = https://vault.example.com
secret_mount_point = mysql-keyring
token = hvs.XXXXXXXX
vault_ca = /etc/vault/ca.pem
```

## Step 2: Encrypt New Tables

Once the keyring plugin is loaded, enable encryption per table:

```sql
CREATE TABLE sensitive_data (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  ssn      VARCHAR(20),
  card_num VARCHAR(20)
) ENCRYPTION = 'Y';
```

Verify encryption status:

```sql
SELECT table_schema, table_name, create_options
FROM information_schema.tables
WHERE create_options LIKE '%ENCRYPTION%';
```

## Step 3: Encrypt Existing Tables

```sql
-- Encrypt an existing unencrypted table
ALTER TABLE customers ENCRYPTION = 'Y';

-- Decrypt a table (remove encryption)
ALTER TABLE customers ENCRYPTION = 'N';
```

## Step 4: Enable Default Table Encryption

In MySQL 8.0.16+, enforce encryption for all new tables:

```text
[mysqld]
default_table_encryption = ON
```

```sql
-- Verify
SHOW VARIABLES LIKE 'default_table_encryption';
```

## Step 5: Encrypt the InnoDB System Tablespace

```sql
-- Check system tablespace encryption status
SELECT name, encryption FROM information_schema.innodb_tablespaces
WHERE name = 'innodb_system';

-- Enable encryption
ALTER TABLESPACE innodb_system ENCRYPTION = 'Y';
```

## Step 6: Encrypt Redo and Undo Logs

```text
[mysqld]
innodb_redo_log_encrypt = ON
innodb_undo_log_encrypt = ON
```

```sql
SHOW VARIABLES LIKE 'innodb_%log_encrypt%';
```

## Step 7: Encrypt Binary Logs

```text
[mysqld]
binlog_encryption = ON
```

## Key Rotation

Regularly rotate encryption keys to limit exposure if a key is compromised:

```sql
-- Rotate the master key
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This generates a new master key. Existing table keys are re-encrypted with the new master key; table data is not re-encrypted (only the key wrapping changes).

## Monitor Encryption Status

```sql
-- Check all tablespace encryption status
SELECT
  space,
  name,
  encryption
FROM information_schema.innodb_tablespaces
ORDER BY encryption DESC, name;
```

## Summary

MySQL data-at-rest encryption uses a two-tier key architecture: a master key (stored in a keyring plugin) encrypts individual tablespace keys, which in turn encrypt data pages. Enable it by loading a keyring plugin, setting `default_table_encryption = ON`, and encrypting redo/undo logs and binary logs for complete coverage. Rotate the master key regularly and store keyring credentials securely using Vault for production deployments.
