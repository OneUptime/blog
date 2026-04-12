# How to Decrypt Encrypted Binary Logs in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary Log, Encryption, Security, Keyring

Description: Learn how to decrypt encrypted MySQL binary logs using the keyring plugin and mysqlbinlog to read and replay encrypted log files.

---

MySQL supports binary log encryption using the keyring infrastructure. When enabled, binary log files are encrypted at rest, protecting sensitive data from filesystem-level access. Reading or replaying encrypted binary logs requires the correct keyring configuration, as `mysqlbinlog` cannot read them directly without credentials.

## How Binary Log Encryption Works

MySQL encrypts binary log data using AES-256-CTR, with file passwords encrypted using AES-256-CBC. Each binary log file has its own file password, which is itself encrypted by a master key stored in the keyring. Only a MySQL server with access to the keyring can decrypt the binary logs.

## Enabling Binary Log Encryption

First, configure a keyring plugin in `my.cnf`:

```ini
[mysqld]
# Using keyring_file plugin
early-plugin-load = keyring_file.so
keyring_file_data = /var/lib/mysql/keyring/keyring

# Enable binary log encryption
binlog_encryption = ON
log_bin = /var/lib/mysql/binlogs/mysql-bin
```

Verify encryption is active:

```sql
SHOW VARIABLES LIKE 'binlog_encryption';
SHOW BINARY LOGS;
-- Encrypted column shows 'Yes' for encrypted files
```

## Checking Binary Log Encryption Status

```sql
-- Check if current logs are encrypted
SHOW BINARY LOGS;
```

```text
+------------------+-----------+-----------+
| Log_name         | File_size | Encrypted |
+------------------+-----------+-----------+
| mysql-bin.000010 |  10485760 | Yes       |
| mysql-bin.000011 |   5242880 | Yes       |
+------------------+-----------+-----------+
```

```sql
-- Check encryption details via performance_schema
SELECT variable_name, variable_value
FROM performance_schema.global_variables
WHERE variable_name LIKE '%binlog_encrypt%';
```

## Reading Encrypted Binary Logs with mysqlbinlog

`mysqlbinlog` cannot directly open encrypted binary log files. Instead, use it in server-connection mode to let the MySQL server handle decryption:

```bash
mysqlbinlog \
  --read-from-remote-server \
  --host=127.0.0.1 \
  --port=3306 \
  --user=root \
  --password=YourPassword \
  --verbose \
  mysql-bin.000010
```

The `--read-from-remote-server` flag connects to the running MySQL instance, which uses its keyring to decrypt and stream the binary log events.

## Extracting Events for Recovery

For point-in-time recovery with encrypted logs, always connect through the server:

```bash
mysqlbinlog \
  --read-from-remote-server \
  --host=127.0.0.1 \
  --user=root \
  --password=YourPassword \
  --start-datetime="2024-03-15 14:00:00" \
  --stop-datetime="2024-03-15 15:00:00" \
  --base64-output=DECODE-ROWS \
  --verbose \
  mysql-bin.000010 \
  | mysql -u root -p mydb
```

## Key Rotation for Binary Logs

Rotate the binary log master key periodically for security:

```sql
ALTER INSTANCE ROTATE BINLOG MASTER KEY;
```

After rotation, the file passwords for all existing encrypted binary log files and relay log files are re-encrypted with the new master key. Old master keys that are no longer in use are removed from the keyring.

## Backing Up the Keyring

The keyring is as important as the backup itself. Without it, encrypted backups and binary logs cannot be decrypted:

```bash
# Back up the keyring file along with binary logs
cp /var/lib/mysql/keyring/keyring /var/backups/mysql/keyring_$(date +%Y%m%d)

# Store keyring backup separately from the database backup
# for security - the two should not be co-located
```

## Disabling Binary Log Encryption

To decrypt and disable encryption:

```sql
SET GLOBAL binlog_encryption = OFF;
FLUSH BINARY LOGS;
```

New binary logs are unencrypted after this point. Existing encrypted logs still require server-mode `mysqlbinlog` access.

## Troubleshooting Decryption Errors

If `mysqlbinlog` returns an error when trying to read an encrypted log:

```bash
# Error: "File is encrypted but keyring plugin is not loaded"
# Solution: ensure keyring plugin is loaded
mysql -u root -p -e "SELECT plugin_name, plugin_status FROM information_schema.plugins WHERE plugin_name LIKE 'keyring%';"

# If using keyring_file, verify the keyring file exists
ls -la /var/lib/mysql/keyring/
```

## Summary

MySQL binary log encryption uses the keyring infrastructure to protect log files at rest. Encrypted binary logs cannot be read directly with `mysqlbinlog` - you must use `--read-from-remote-server` to route decryption through the running MySQL server. Always back up the keyring file separately from binary logs, as losing the keyring makes encrypted logs permanently unreadable. Rotate the master key periodically with `ALTER INSTANCE ROTATE BINLOG MASTER KEY`.
