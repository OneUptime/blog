# What Is Transparent Data Encryption (TDE) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Transparent Data Encryption, Security, Innodb Encryption

Description: Transparent Data Encryption (TDE) in MySQL encrypts InnoDB tablespace files on disk, protecting data at rest without requiring changes to application code.

---

## Overview

Transparent Data Encryption (TDE) in MySQL encrypts data files on disk at the storage engine level. The "transparent" aspect means that data is automatically encrypted when written to disk and decrypted when read into memory - applications and SQL queries require no changes.

MySQL's TDE protects against physical theft of disk media, unauthorized file system access, or exposure of data in backups.

## Prerequisites

TDE requires a keyring plugin to manage encryption keys. Options include:
- `keyring_file` (file-based, development/simple use)
- `keyring_encrypted_file` (encrypted file)
- `keyring_okv` (Oracle Key Vault)
- `keyring_aws` (AWS Key Management Service)
- `keyring_hashicorp` (HashiCorp Vault)

## Setting Up the Keyring Plugin

```text
[mysqld]
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql-keyring/keyring
```

For MySQL 8.0.24+ with the component-based keyring, create a manifest file (`mysqld.my`) in the MySQL installation directory:

```json
{
  "components": "file://component_keyring_file"
}
```

Then create a configuration file (`component_keyring_file.cnf`) in the MySQL data directory:

```json
{
  "path": "/var/lib/mysql-keyring/keyring",
  "read_only": false
}
```

Restart MySQL and verify the component is active:

```sql
SELECT * FROM performance_schema.keyring_component_status;
```

## Enabling Encryption for a New Table

```sql
-- Create an encrypted table
CREATE TABLE sensitive_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  ssn VARCHAR(20),
  dob DATE
) ENGINE = InnoDB ENCRYPTION = 'Y';
```

## Encrypting an Existing Table

```sql
-- Enable encryption on an existing table (triggers table rebuild)
ALTER TABLE customer_pii ENCRYPTION = 'Y';

-- Disable encryption
ALTER TABLE customer_pii ENCRYPTION = 'N';
```

## Encrypting an Entire Schema (Tablespace)

```sql
-- Enable encryption for a general tablespace
ALTER TABLESPACE ts_sensitive ENCRYPTION = 'Y';

-- Check encryption status of tablespaces
SELECT space, name, encryption
FROM information_schema.innodb_tablespaces
WHERE encryption = 'Y';
```

## Enabling Schema-Level Default Encryption

```sql
-- Make encryption the default for all new tables in a schema
ALTER DATABASE sensitive_db DEFAULT ENCRYPTION = 'Y';
```

Or set globally:

```sql
SET GLOBAL default_table_encryption = ON;
```

## Checking Encryption Status

```sql
-- Check which tables are encrypted
SELECT table_schema, table_name, create_options
FROM information_schema.tables
WHERE create_options LIKE '%ENCRYPTION%';

-- Via InnoDB tablespaces
SELECT name, encryption
FROM information_schema.innodb_tablespaces
WHERE encryption = 'Y';
```

## Encrypting the Redo Log and Undo Log

```sql
-- Enable redo log encryption
SET GLOBAL innodb_redo_log_encrypt = ON;

-- Enable undo log encryption
SET GLOBAL innodb_undo_log_encrypt = ON;
```

Persist in config:

```text
[mysqld]
innodb_redo_log_encrypt = ON
innodb_undo_log_encrypt = ON
```

## Rotating Encryption Keys

```sql
-- Rotate the master encryption key
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

Key rotation re-encrypts all tablespace keys with the new master key without re-encrypting the actual data files.

## Performance Impact

TDE has minimal performance overhead (typically 5-10%) because encryption/decryption happens in memory using hardware AES acceleration when available. Check for AES-NI support:

```bash
grep -m1 aes /proc/cpuinfo
```

## Summary

MySQL TDE encrypts InnoDB data files transparently, protecting data at rest without any application code changes. It requires a keyring component for key management and supports per-table, per-tablespace, or schema-wide encryption. Key rotation and redo/undo log encryption provide comprehensive protection for compliance requirements like PCI-DSS, HIPAA, and GDPR.
