# Validation Summary: How to Encrypt Binary Logs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.14+)
- Binary log encryption (`binlog_encryption`)
- MySQL keyring plugin (`keyring_file.so`)
- mysqlbinlog utility
- MySQL replication (relay logs)

## Sources Consulted
- MySQL 8.0 Reference Manual: Encrypting Binary Log Files and Relay Log Files — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption.html
- MySQL 8.0 Reference Manual: `binlog_encryption` system variable — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_encryption
- MySQL 8.0 Reference Manual: ALTER INSTANCE ROTATE BINLOG MASTER KEY — https://dev.mysql.com/doc/refman/8.0/en/alter-instance.html
- MySQL 8.0 Reference Manual: Binary Log Encryption Key Rotation — https://dev.mysql.com/doc/refman/8.0/en/replication-binlog-encryption-key-rotation.html
- MySQL 8.0 Reference Manual: SHOW BINARY LOGS — https://dev.mysql.com/doc/refman/8.0/en/show-binary-logs.html
- MySQL 8.0 Reference Manual: keyring_file plugin — https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html

## Issues Found

### 1. Non-existent `relay_log_encryption` variable (Relay Log Encryption section)
- **What was wrong:** The post used `relay-log-encryption=ON` in the config file and `SET GLOBAL relay_log_encryption = ON;` as the SQL command. The variable `relay_log_encryption` does not exist in MySQL. The `binlog_encryption` variable controls encryption for both binary log files and relay log files.
- **What was changed:** Replaced the entire relay log encryption section to correctly use `binlog_encryption=ON` for encrypting relay logs on replicas, and noted that binary logging does not need to be enabled on the replica for relay log encryption to work.

### 2. Incorrect key rotation behavior description (Rotating the Binary Log Encryption Key section)
- **What was wrong:** The post stated "This generates a new key and re-encrypts the current binary log with it. Existing older log files retain their original keys." This is incorrect. `ALTER INSTANCE ROTATE BINLOG MASTER KEY` re-encrypts the file passwords of all existing encrypted log files using the new master key, and old keys are removed from the keyring.
- **What was changed:** Replaced the description to accurately explain that the command generates a new key, rotates log files, re-encrypts all existing encrypted log file passwords with the new key, and removes old unused keys from the keyring.

### 3. Misleading framing of mysqlbinlog section (Checking Encryption Status section)
- **What was wrong:** The section title "Checking Encryption Status of Individual Log Files" implied that `mysqlbinlog --read-from-remote-server` is used to check whether a file is encrypted. In reality, this flag is used to read encrypted binary logs through the server because they cannot be read directly from disk. The `SHOW BINARY LOGS` command (with its `Encrypted` column) is the correct way to check encryption status.
- **What was changed:** Renamed the section to "Reading Encrypted Binary Log Files", reframed the explanation to clarify that this is for reading encrypted logs (not checking status), and added a note that `SHOW BINARY LOGS` is the proper way to check encryption status.

## Review Notes
- The keyring plugin (`keyring_file.so`) approach shown is valid for MySQL 8.0 but the keyring component infrastructure is preferred starting from MySQL 8.0.34+. Future updates to this post could mention the component-based alternative.
- `SHOW MASTER STATUS` was deprecated in MySQL 8.0.22 in favor of `SHOW BINARY LOG STATUS`. The post uses `SHOW MASTER STATUS` which still works but may be removed in a future MySQL version. This was not changed as it remains functional in MySQL 8.0.
