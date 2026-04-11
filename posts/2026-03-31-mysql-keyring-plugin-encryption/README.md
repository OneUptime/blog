# How to Use the MySQL Keyring Plugin for Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Keyring, Encryption, Security, Plugin

Description: Learn how to configure and use the MySQL keyring plugin to manage encryption keys for InnoDB tablespace and log encryption.

---

The MySQL keyring plugin provides a secure key management facility used by InnoDB encryption features. It acts as the backbone of MySQL's at-rest encryption, generating, storing, and managing the master encryption key. MySQL offers several keyring plugin implementations, from simple file-based storage to enterprise key management system integrations.

## Available Keyring Plugins

| Plugin | Storage | Use Case |
|--------|---------|----------|
| `keyring_file` | Local file | Development/testing |
| `keyring_encrypted_file` | Encrypted local file | Single-server production |
| `keyring_okv` | Oracle Key Vault | Enterprise key management |
| `keyring_aws` | AWS KMS | Cloud deployments |
| `keyring_hashicorp` | HashiCorp Vault | Multi-cloud/hybrid |

## Installing keyring_file (Basic)

The `keyring_file` plugin must be loaded via `early-plugin-load` so it is available before InnoDB initializes:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

```bash
mkdir -p /var/lib/mysql-keyring
chown mysql:mysql /var/lib/mysql-keyring
chmod 750 /var/lib/mysql-keyring
systemctl restart mysql
```

## Installing keyring_encrypted_file (Recommended for Single-Server)

```text
[mysqld]
early-plugin-load=keyring_encrypted_file.so
keyring_encrypted_file_data=/var/lib/mysql-keyring/keyring.enc
keyring_encrypted_file_password=YourStrongPassphrase
```

## Verifying the Keyring Plugin Is Loaded

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS, PLUGIN_TYPE
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

```text
+------------------------+---------------+-------------+
| PLUGIN_NAME            | PLUGIN_STATUS | PLUGIN_TYPE |
+------------------------+---------------+-------------+
| keyring_file           | ACTIVE        | KEYRING     |
+------------------------+---------------+-------------+
```

## Generating a Key with the Keyring UDFs

MySQL provides User-Defined Functions (UDFs) for keyring management. Install them first:

```sql
INSTALL PLUGIN keyring_udf SONAME 'keyring_udf.so';

-- Generate a new AES 256-bit key
SELECT keyring_key_generate('MyAppKey', 'AES', 32);

-- Fetch a key (returns raw binary value)
SELECT keyring_key_fetch('MyAppKey');

-- Remove a key
SELECT keyring_key_remove('MyAppKey');
```

## Listing Keys in the Keyring

```sql
SELECT * FROM performance_schema.keyring_keys;
```

## Using the Keyring with InnoDB Encryption

Once the keyring plugin is active, enable InnoDB encryption features:

```text
[mysqld]
default_table_encryption=ON
innodb_redo_log_encrypt=ON
innodb_undo_log_encrypt=ON
binlog_encryption=ON
```

## Rotating the InnoDB Master Key

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This creates a new master key in the keyring and re-encrypts all tablespace encryption keys. Individual data blocks are not re-encrypted immediately.

## Backing Up the Keyring File

The keyring file must be backed up alongside your data backups or the encrypted data will be unrecoverable:

```bash
cp /var/lib/mysql-keyring/keyring /secure-backup/keyring-$(date +%Y%m%d)
chmod 600 /secure-backup/keyring-*
```

## Migrating Between Keyring Plugins

```bash
mysqld --keyring-migration-source=keyring_file.so \
  --keyring-migration-destination=keyring_encrypted_file.so \
  --keyring_encrypted_file_data=/var/lib/mysql-keyring/keyring.enc \
  --keyring_encrypted_file_password=NewPassword
```

## Summary

The MySQL keyring plugin is the foundation of all at-rest encryption in MySQL. Start with `keyring_file` for development and move to `keyring_encrypted_file` or an enterprise KMS for production. Always back up your keyring file - without it, encrypted data cannot be recovered. Rotate the master key periodically and monitor `performance_schema.keyring_keys` to track key usage.
