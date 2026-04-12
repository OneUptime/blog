# How to Configure Transparent Data Encryption (TDE) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Encryption, Security, InnoDB, TDE

Description: Learn how to configure Transparent Data Encryption (TDE) in MySQL using the InnoDB tablespace encryption and keyring plugin.

---

Transparent Data Encryption (TDE) in MySQL encrypts data at rest, protecting database files stored on disk from unauthorized access without requiring application changes. MySQL implements TDE through InnoDB tablespace encryption combined with a keyring plugin that manages encryption keys securely.

## Prerequisites

TDE requires a keyring plugin installed and active. MySQL provides several options:

- `keyring_file` - Stores keys in a local file (development use)
- `keyring_encrypted_file` - Stores keys in an encrypted local file
- `keyring_okv` - Integrates with Oracle Key Vault
- `keyring_aws` - Integrates with AWS KMS (MySQL Enterprise)

## Installing the Keyring File Plugin

Add the keyring plugin to `my.cnf` before starting MySQL:

```text
[mysqld]
early-plugin-load=keyring_file.so
keyring_file_data=/var/lib/mysql-keyring/keyring
```

Create the keyring directory with proper permissions:

```bash
mkdir -p /var/lib/mysql-keyring
chown mysql:mysql /var/lib/mysql-keyring
chmod 750 /var/lib/mysql-keyring
```

## Enabling Tablespace Encryption by Default

To automatically encrypt all new InnoDB tables, add to `my.cnf`:

```text
[mysqld]
default_table_encryption=ON
```

## Verifying the Keyring Plugin Is Active

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM information_schema.PLUGINS
WHERE PLUGIN_NAME LIKE 'keyring%';
```

## Creating an Encrypted Table

```sql
CREATE TABLE sensitive_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ssn VARCHAR(11) NOT NULL,
  credit_card VARCHAR(19) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB ENCRYPTION='Y';
```

## Encrypting an Existing Table

```sql
ALTER TABLE existing_table ENCRYPTION='Y';
```

## Checking Which Tables Are Encrypted

```sql
SELECT TABLE_SCHEMA, TABLE_NAME, CREATE_OPTIONS
FROM information_schema.TABLES
WHERE CREATE_OPTIONS LIKE '%ENCRYPTION%';
```

Or query the InnoDB tablespace view:

```sql
SELECT NAME, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE ENCRYPTION = 'Y';
```

## Enabling General Tablespace Encryption

```sql
-- Create an encrypted general tablespace
CREATE TABLESPACE encrypted_ts
  ADD DATAFILE 'encrypted_ts.ibd'
  ENCRYPTION = 'Y';

-- Create a table in the encrypted tablespace
CREATE TABLE secure_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(10,2),
  customer_id INT
) TABLESPACE encrypted_ts;
```

## Rotating the Master Encryption Key

Rotating the master key re-encrypts all tablespace keys without re-encrypting data:

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

## Disabling Encryption on a Table

```sql
ALTER TABLE sensitive_data ENCRYPTION='N';
```

## Summary

MySQL TDE encrypts InnoDB tablespaces at rest using a two-tier key architecture: a master key managed by the keyring plugin and per-tablespace encryption keys. Enable it by installing a keyring plugin, setting `default_table_encryption=ON`, and using `ENCRYPTION='Y'` on tables or tablespaces. Rotate the master key periodically with `ALTER INSTANCE ROTATE INNODB MASTER KEY` to maintain strong security posture.
