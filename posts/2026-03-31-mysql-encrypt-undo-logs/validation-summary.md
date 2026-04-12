# Validation Summary: How to Encrypt Undo Logs in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- InnoDB undo log encryption (`innodb_undo_log_encrypt`)
- InnoDB keyring plugin (`keyring_file`)
- InnoDB tablespace encryption
- Redo log and binary log encryption

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: `innodb_undo_log_encrypt` variable — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_undo_log_encrypt
- MySQL 8.0 Reference Manual: `information_schema.FILES` table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: `information_schema.INNODB_TABLESPACES` table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: Undo Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-undo-tablespaces.html
- MySQL 8.0 Reference Manual: `performance_schema.keyring_keys` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-keyring-keys-table.html

## Issues Found
1. **Invalid column in `information_schema.FILES` query**: The query under "Checking Undo Tablespace Status" selected `ENCRYPTION` from `information_schema.FILES`, but this table does not have an `ENCRYPTION` column. The `ENCRYPTION` column exists in `information_schema.INNODB_TABLESPACES` (already correctly used in the second query in the same section). Fixed by replacing `ENCRYPTION` with `FILE_TYPE` and updating the comment to reflect that this query lists undo tablespace files rather than their encryption state.

## Review Notes
- The `ALTER UNDO TABLESPACE ... SET INACTIVE/ACTIVE` syntax and `CREATE UNDO TABLESPACE` syntax require MySQL 8.0.14+. The post targets MySQL 8.0 generally but does not note this version minimum. This is a minor gap that could be clarified in a future revision.
- The `performance_schema.keyring_keys` table was introduced in MySQL 8.0.16. Readers on earlier 8.0.x releases would not have this table available.
- The `keyring_file` plugin is suitable for development/testing but MySQL documentation recommends `keyring_encrypted_file` or an external keyring service (e.g., HashiCorp Vault via `keyring_hashicorp`) for production environments. The post does not mention this distinction.
- All other SQL syntax, configuration directives, variable names, and technical explanations are accurate.
