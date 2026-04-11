# Validation Summary: How to Rotate Encryption Keys in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 8.0 InnoDB Transparent Data Encryption (TDE)
- MySQL keyring plugin (keyring_file)
- MySQL binary log encryption
- MySQL Event Scheduler
- Performance Schema (keyring_keys table)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: Binary Log Master Key Rotation — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption-key-rotation.html
- MySQL 8.0 Reference Manual: Binary Log Encryption — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption.html
- MySQL 8.0 Reference Manual: INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: keyring_keys Table — https://dev.mysql.com/doc/mysql-perfschema-excerpt/8.0/en/performance-schema-keyring-keys-table.html
- MySQL 8.0 Reference Manual: Keyring System Variables — https://dev.mysql.com/doc/refman/8.0/en/keyring-system-variables.html
- MariaDB Knowledge Base: InnoDB Encryption Keys — https://mariadb.com/kb/en/innodb-encryption-keys/

## Issues Found

### Issue 1: Incorrect binary log key rotation behavior (High severity)
- **What was wrong:** The post stated "Existing binary log files retain their old keys; only new log files use the new key." This is incorrect — `ALTER INSTANCE ROTATE BINLOG MASTER KEY` re-encrypts the file passwords in all existing binary log and relay log files with the new key, then removes the old key from the keyring.
- **What was changed:** Updated the description to accurately state that file passwords in all existing binary/relay log files are re-encrypted and the old key is removed from the keyring.
- **Why:** The MySQL documentation explicitly describes this re-encryption behavior. A reader following the original advice might incorrectly assume old binary log files are still protected only by the old key.

### Issue 2: Non-existent ENCRYPTION_KEY_ID column in INNODB_TABLESPACES (High severity)
- **What was wrong:** The "Checking Current Encryption Key IDs" section queried `ENCRYPTION_KEY_ID` from `information_schema.INNODB_TABLESPACES`. This column does not exist in standard Oracle MySQL — it is a MariaDB/Percona Server feature. The standard MySQL table only has an `ENCRYPTION` column (Y/N).
- **What was changed:** Replaced `ENCRYPTION_KEY_ID` with `ENCRYPTION` in the query and updated the section heading to "Checking Encrypted Tablespaces."
- **Why:** Running the original query on standard MySQL 8.0 would produce an "Unknown column" error.

### Issue 3: Non-existent ENCRYPTION_KEY_ID table option in CREATE TABLE (High severity)
- **What was wrong:** The "Using a Custom Key ID" section used `ENCRYPTION_KEY_ID=2` as a CREATE TABLE option. This is a MariaDB-specific feature — standard MySQL only supports `ENCRYPTION='Y'` or `ENCRYPTION='N'` as table options, with no per-table key ID assignment.
- **What was changed:** Removed the `ENCRYPTION_KEY_ID=2` option from the CREATE TABLE statement and updated the section heading to "Enabling Encryption on a New Table."
- **Why:** Running the original CREATE TABLE statement on standard MySQL 8.0 would produce a syntax error.

## Review Notes
- The `performance_schema.keyring_keys` table was introduced in MySQL 8.0.16. Readers on older MySQL 8.0 versions may not have access to this table.
- The default keyring file path `/var/lib/mysql-keyring/keyring` is correct for DEB/RPM package installations but may differ for other installation methods.
- MySQL 8.0.34+ deprecates the `keyring_file` plugin in favor of keyring components (e.g., `component_keyring_file`). The blog's references to the keyring plugin are still functional but readers should be aware of the migration path to keyring components.
- The post correctly describes the two-tier key architecture and the efficiency of master key rotation (re-encrypting subordinate keys without rewriting data blocks).
