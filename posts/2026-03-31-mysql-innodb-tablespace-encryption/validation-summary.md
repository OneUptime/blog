# Validation Summary: How to Configure InnoDB Tablespace Encryption in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- InnoDB storage engine
- InnoDB tablespace encryption (data-at-rest)
- MySQL keyring plugins (keyring_file, keyring_okv, keyring_aws)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: SHOW PLUGINS Statement — https://dev.mysql.com/doc/refman/8.0/en/show-plugins.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: keyring_file Plugin — https://dev.mysql.com/doc/refman/8.0/en/keyring-file-plugin.html
- MySQL 8.0 Reference Manual: ALTER INSTANCE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-instance.html
- MySQL 8.0 Reference Manual: ALTER TABLESPACE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-tablespace.html

## Issues Found

1. **Invalid `SHOW PLUGINS LIKE` syntax**: The post used `SHOW PLUGINS LIKE 'keyring%'`, but MySQL's `SHOW PLUGINS` statement does not support a `LIKE` clause. Replaced with an equivalent `SELECT` query against `information_schema.PLUGINS` with a `WHERE PLUGIN_NAME LIKE` filter.

2. **`innodb_sys_tablespace_encrypt` is a Percona-only variable**: The post listed `innodb_sys_tablespace_encrypt=ON` as a MySQL configuration option, but this variable does not exist in Oracle MySQL — it is specific to Percona Server for MySQL. In standard MySQL 8.0.16+, the `mysql` system tablespace is encrypted using `ALTER TABLESPACE mysql ENCRYPTION = 'Y'`. Replaced the incorrect config entry with the correct `ALTER TABLESPACE` statement and removed the non-existent variable.

## Review Notes
- The `keyring_file` plugin used in the examples is deprecated as of MySQL 8.0.34 in favor of `component_keyring_file`. The post's approach still works on older versions, but readers on 8.0.34+ should use the component-based keyring instead.
- The `keyring_okv` and `keyring_aws` plugins mentioned for production use are only available in MySQL Enterprise Edition, not Community Edition. The post does not note this distinction.
- The InnoDB system tablespace (`ibdata1` / `innodb_system`) cannot be encrypted in Oracle MySQL. Only the `mysql` system tablespace (containing the data dictionary) can be encrypted via `ALTER TABLESPACE mysql ENCRYPTION = 'Y'`.
