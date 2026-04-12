# Validation Summary: How to Use InnoDB Data-at-Rest Encryption in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine (data-at-rest encryption)
- MySQL keyring plugins (keyring_file, keyring_encrypted_file, keyring_okv)
- Performance Schema (events_stages_current)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: Keyring Plugins — https://dev.mysql.com/doc/refman/8.0/en/keyring.html
- MySQL 8.0 Reference Manual: ALTER INSTANCE — https://dev.mysql.com/doc/refman/8.0/en/alter-instance.html
- MySQL 8.0 Reference Manual: default_table_encryption system variable — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_default_table_encryption
- MySQL 8.0 Reference Manual: Performance Schema events_stages_current table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-events-stages-current-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TABLESPACES table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html

## Issues Found
1. **Incorrect columns in performance_schema monitoring query**: The query used `STAGE` and `STATE` as column names in the `performance_schema.events_stages_current` table, but these columns do not exist. The valid columns for monitoring DDL progress are `EVENT_NAME`, `WORK_COMPLETED`, and `WORK_ESTIMATED`. Changed `SELECT STAGE, STATE, WORK_COMPLETED, WORK_ESTIMATED` to `SELECT EVENT_NAME, WORK_COMPLETED, WORK_ESTIMATED`, and updated the `WHERE` filter from `LIKE '%alter%'` to `LIKE '%encryption%'` to more accurately match the encryption-specific stage event name (`stage/innodb/alter tablespace (encryption)`).

## Review Notes
- The `keyring_file` plugin demonstrated in the prerequisites section is deprecated as of MySQL 8.0.34 in favor of component-based keyring (`component_keyring_file`). The plugin still functions in MySQL 8.0 but users starting new deployments should consider the component-based approach. This is not an error in the post since it doesn't claim a specific MySQL minor version and the plugin remains functional.
- The `default_table_encryption` system variable was introduced in MySQL 8.0.16. The post does not mention this version requirement explicitly, which could be noted in a future update.
- The performance overhead claim of 3-8% for I/O-bound workloads is consistent with published benchmarks and MySQL documentation guidance.
- All SQL syntax, configuration directives, and CLI commands are correct and current for MySQL 8.0.
