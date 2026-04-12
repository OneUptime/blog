# Validation Summary: How to Encrypt MySQL Data at Rest

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MySQL 8.0 InnoDB data-at-rest encryption
- Keyring plugins (`keyring_file`, `keyring_vault` / `keyring_hashicorp`)
- HashiCorp Vault integration
- InnoDB tablespace encryption
- Redo log and undo log encryption
- Binary log encryption
- Master key rotation

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Data-at-Rest Encryption: https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual — Keyring Plugins: https://dev.mysql.com/doc/refman/8.0/en/keyring.html
- MySQL 8.0 Reference Manual — `keyring_file` Plugin: https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html
- MySQL 8.0 Reference Manual — `keyring_hashicorp` Plugin: https://dev.mysql.com/doc/refman/8.0/en/keyring-hashicorp-plugin.html
- MySQL 8.0 Reference Manual — `binlog_encryption` System Variable: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_encryption
- MySQL 8.0 Reference Manual — `default_table_encryption`: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_table_encryption
- MySQL 8.0 Reference Manual — `innodb_redo_log_encrypt` / `innodb_undo_log_encrypt`: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — `INNODB_TABLESPACES` table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html

## Issues Found
1. **Incorrect binary log encryption variable name (Step 7):** The post used `encrypt_binlog = ON`, which is not a valid MySQL system variable. The correct variable is `binlog_encryption = ON`, available since MySQL 8.0.14. Fixed by replacing `encrypt_binlog` with `binlog_encryption`.

## Review Notes
- The `keyring_vault` plugin referenced in the post is specific to Percona Server for MySQL, not standard Oracle MySQL. In Oracle MySQL 8.0 Enterprise Edition (8.0.18+), the equivalent plugin is `keyring_hashicorp`, which uses individual system variables (`keyring_hashicorp_server_url`, `keyring_hashicorp_token`, etc.) rather than a single vault.conf file. The vault.conf format shown is Percona-specific. Since many users run Percona Server and the post does not claim to target Oracle MySQL exclusively, this was not changed, but readers using Oracle MySQL should consult the `keyring_hashicorp` documentation instead.
- The `keyring_hashicorp` plugin (Oracle MySQL) and most non-`keyring_file` keyring plugins require MySQL Enterprise Edition. The post does not mention this licensing distinction, which could confuse Community Edition users.
- MySQL 8.0.24+ introduced keyring components (`component_keyring_file`, `component_keyring_encrypted_file`) as successors to keyring plugins. For new deployments, MySQL documentation recommends the component-based approach. The plugin-based approach shown in the post is still supported but may be deprecated in future versions.
- All SQL syntax, InnoDB encryption commands, `ALTER INSTANCE ROTATE INNODB MASTER KEY`, `ALTER TABLESPACE` encryption, redo/undo log encryption variables, `default_table_encryption`, and monitoring queries are correct for MySQL 8.0.
