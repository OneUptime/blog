# How to Rotate Encryption Keys in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Encryption, Security, Keyring, Key Rotation

Description: Learn how to rotate master encryption keys in MySQL for InnoDB tablespaces and binary logs to maintain strong key hygiene and meet compliance requirements.

---

Encryption key rotation is a security best practice and often a compliance requirement. In MySQL, the master encryption key is managed by the keyring plugin and used to protect all per-tablespace, redo log, undo log, and binary log encryption keys. Rotating the master key does not re-encrypt all data immediately - it re-encrypts the subordinate keys, which is efficient and minimizes I/O impact.

## Understanding MySQL's Two-Tier Key Architecture

MySQL uses a two-tier encryption key structure:

1. **Master key** - Stored in the keyring plugin, rotated with `ALTER INSTANCE`
2. **Tablespace encryption keys** - Per-tablespace keys, encrypted by the master key

When you rotate the master key, all tablespace keys are re-encrypted with the new master key, but data blocks are NOT immediately re-written. This makes rotation fast and low-impact.

## Rotating the InnoDB Master Key

```sql
ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

This is the primary key rotation command. It:
- Generates a new master key in the keyring
- Re-encrypts all tablespace encryption keys
- Re-encrypts redo and undo log keys if those are enabled

## Rotating the Binary Log Master Key

Binary log files use a separate encryption key:

```sql
ALTER INSTANCE ROTATE BINLOG MASTER KEY;
```

This generates a new binary log encryption key and re-encrypts the file passwords in all existing binary log and relay log files with the new key. After successful re-encryption, the old binary log master key is removed from the keyring.

## Verifying Keys in the Keyring

```sql
-- List all keys managed by the keyring plugin
SELECT KEY_ID, KEY_OWNER, BACKEND_KEY_ID
FROM performance_schema.keyring_keys
ORDER BY KEY_ID;
```

After rotation, you will see both old and new key entries. Old keys remain until all files encrypted with them are either purged or re-encrypted.

## Scheduling Key Rotation

Automate key rotation with a MySQL event:

```sql
-- Rotate InnoDB master key monthly
CREATE EVENT rotate_innodb_key
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-04-01 02:00:00'
DO
  ALTER INSTANCE ROTATE INNODB MASTER KEY;
```

## Checking Encrypted Tablespaces

```sql
-- See which tablespaces are currently encrypted
SELECT SPACE, NAME, ENCRYPTION
FROM information_schema.INNODB_TABLESPACES
WHERE ENCRYPTION = 'Y';
```

## Re-encrypting a Tablespace with a New Key

After master key rotation, force a specific table to use the new key by cycling its encryption:

```sql
ALTER TABLE sensitive_orders ENCRYPTION='N';
ALTER TABLE sensitive_orders ENCRYPTION='Y';
```

This rewrites the tablespace with a new tablespace key encrypted under the current master key.

## Enabling Encryption on a New Table

```sql
-- Create a table with encryption enabled
CREATE TABLE financial_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  amount DECIMAL(12,2)
) ENGINE=InnoDB ENCRYPTION='Y';
```

## Keyring Plugin Backup Before Rotation

Always back up the keyring file before rotation:

```bash
cp /var/lib/mysql-keyring/keyring \
   /secure-backup/keyring-$(date +%Y%m%d-%H%M%S)
chmod 600 /secure-backup/keyring-*
```

## Monitoring Key Rotation in Logs

```bash
grep -i "rotate\|master key\|keyring" /var/log/mysql/error.log
```

## Summary

MySQL encryption key rotation is a low-impact operation that generates a new master key and re-encrypts all subordinate keys without rewriting data. Run `ALTER INSTANCE ROTATE INNODB MASTER KEY` regularly (monthly or quarterly), rotate binary log keys separately, back up the keyring before each rotation, and automate the process with MySQL events. Monitor the keyring via `performance_schema.keyring_keys` to verify rotation completed successfully.
