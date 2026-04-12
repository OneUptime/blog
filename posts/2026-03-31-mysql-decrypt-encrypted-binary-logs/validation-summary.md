# Validation Summary: How to Decrypt Encrypted Binary Logs in MySQL

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- MySQL 8.0+ (binary log encryption introduced in 8.0.14)
- MySQL keyring infrastructure (keyring_file plugin)
- mysqlbinlog utility
- AES-256-CTR / AES-256-CBC encryption

## Sources Consulted
- MySQL 8.0 Reference Manual: Encrypting Binary Log Files and Relay Log Files — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption.html
- MySQL 8.0 Reference Manual: Binary Log Encryption Keys — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption-encryption-keys.html
- MySQL 8.0 Reference Manual: Binary Log Master Key Rotation — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption-key-rotation.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: mysqlbinlog — https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html
- MySQL 8.0 Reference Manual: keyring_file Plugin — https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html
- MySQL 8.0 Reference Manual: keyring_component_status Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-keyring-component-status-table.html

## Issues Found

1. **Incorrect encryption algorithm description** (line 15): The post stated MySQL encrypts binary logs using "AES-256-CBC." This is an oversimplification. MySQL uses AES-256-CTR to encrypt the actual binary log data, and AES-256-CBC to encrypt the per-file password stored in the file header. Fixed to accurately describe the dual-algorithm scheme.

2. **Incorrect key rotation behavior** (line 106): The post stated "existing log files remain encrypted with the old key. New log files use the new key. MySQL retains old keys to decrypt older files." This is wrong. During master key rotation, MySQL re-encrypts the file passwords of all existing encrypted binary log and relay log files with the new master key. Old master keys that are no longer in use are then removed from the keyring. Fixed to match the actual rotation behavior documented by MySQL.

3. **Inconsistent keyring status check** (line 138): The post configured `keyring_file` (a plugin) but used `performance_schema.keyring_component_status` for troubleshooting, which only works for keyring components (e.g., `component_keyring_file`), not keyring plugins. Fixed to query `information_schema.plugins` instead, which correctly shows plugin status for `keyring_file`.

## Review Notes
- The `keyring_file` plugin is deprecated as of MySQL 8.0.34. MySQL recommends migrating to `component_keyring_file`. The post could be updated in the future to use the component-based keyring configuration instead.
- The `--read-from-remote-server` option for mysqlbinlog is correct but `--read-from-remote-master` was deprecated in MySQL 8.0.26 in favor of `--read-from-remote-source`. The post uses `--read-from-remote-server` which remains valid.
- The `FLUSH BINARY LOGS` after disabling encryption is technically redundant since MySQL automatically rotates logs when `binlog_encryption` is changed, but it is harmless and not incorrect.
