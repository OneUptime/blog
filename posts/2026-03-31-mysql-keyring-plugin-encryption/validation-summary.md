# Validation Summary: How to Use the MySQL Keyring Plugin for Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL Keyring Plugin (`keyring_file`, `keyring_encrypted_file`, `keyring_okv`, `keyring_aws`, `keyring_hashicorp`)
- InnoDB tablespace encryption
- InnoDB redo/undo log encryption
- Binary log encryption

## Sources Consulted
- MySQL 8.0 Reference Manual: Keyring Plugins — https://dev.mysql.com/doc/refman/8.0/en/keyring.html
- MySQL 8.0 Reference Manual: keyring_file Plugin — https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html
- MySQL 8.0 Reference Manual: keyring_encrypted_file Plugin — https://dev.mysql.com/doc/refman/8.0/en/keyring-encrypted-file-plugin.html
- MySQL 8.0 Reference Manual: Keyring Key Management Functions — https://dev.mysql.com/doc/refman/8.0/en/keyring-functions-general-purpose.html
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: Migrating Keys Between Keyring Keystores — https://dev.mysql.com/doc/refman/8.0/en/keyring-key-migration.html
- MySQL 8.0 Reference Manual: performance_schema.keyring_keys Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-keyring-keys-table.html

## Issues Found

1. **Incorrect return type description for `keyring_key_fetch`**: The comment stated the function "returns base64-encoded value." In reality, `keyring_key_fetch()` returns the raw binary key material as a VARBINARY value, not a base64-encoded string. Fixed the comment to say "returns raw binary value."

2. **Wrong binary for keyring migration command**: The migration command used `mysql` (the client binary), which has no keyring migration capability. Keyring migration is performed using `mysqld` (the server binary) or the `mysql_migrate_keyring` utility (available since MySQL 8.0.24). Changed `mysql` to `mysqld`.

3. **Invalid migration option `--keyring-migration-destination-password`**: This is not a valid MySQL server option. When migrating to `keyring_encrypted_file`, the destination plugin's password must be specified via `--keyring_encrypted_file_password` (the plugin's own configuration variable). Also added `--keyring_encrypted_file_data` to specify the destination file path, which is required for the destination plugin configuration.

## Review Notes
- As of MySQL 8.0.34, keyring plugins are deprecated in favor of keyring components (`component_keyring_file`, `component_keyring_encrypted_file`, etc.). The post covers plugins, which still work but may be removed in a future release. A note about this deprecation could be valuable for readers using newer MySQL versions.
- The `performance_schema.keyring_keys` table was introduced in MySQL 8.0.16. Readers on older 8.0 versions won't have it.
- The `default_table_encryption` system variable was introduced in MySQL 8.0.16. It sets the default encryption for schemas and tablespaces, but individual tables can still override it with an explicit `ENCRYPTION` clause.
