# Validation Summary: How to Use DROP TABLESPACE Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- InnoDB general tablespaces
- InnoDB file-per-table tablespaces
- INFORMATION_SCHEMA views (TABLES, INNODB_TABLES, INNODB_TABLESPACES)
- DDL statements (DROP TABLESPACE, CREATE TABLESPACE, ALTER TABLE ... TABLESPACE)

## Sources Consulted
- MySQL 8.0 Reference Manual — DROP TABLESPACE: https://dev.mysql.com/doc/refman/8.0/en/drop-tablespace.html
- MySQL 8.4 Reference Manual — DROP TABLESPACE: https://dev.mysql.com/doc/refman/8.4/en/drop-tablespace.html
- MySQL 8.0 Reference Manual — CREATE TABLESPACE: https://dev.mysql.com/doc/refman/8.0/en/create-tablespace.html
- MySQL 8.0 Reference Manual — General Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 8.0 Reference Manual — INNODB_TABLES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html
- MySQL 8.0 Reference Manual — INNODB_TABLESPACES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA TABLES: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual — InnoDB Data-at-Rest Encryption: https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Server Error Reference: https://dev.mysql.com/doc/mysql-errors/8.0/en/server-error-reference.html

## Issues Found
1. **Incorrect claim about encryption key removal (line 86)**: The post stated "The keyring plugin key associated with the tablespace is also removed" when dropping an encrypted tablespace. The official MySQL documentation does not confirm that keyring keys are automatically removed upon dropping an encrypted tablespace. Changed to note that the encryption key remains in the keyring and to refer to the keyring documentation for key management best practices.

## Review Notes
- The `DROP TABLESPACE` syntax is correct. The optional `ENGINE` clause (available in MySQL 8.0, removed in 8.4) is omitted, which is fine since InnoDB is the default engine.
- The `CREATE TABLESPACE` example uses both `ADD DATAFILE` and `ENGINE` clauses. Both are optional in MySQL 8.0.14+ (and `ENGINE` is removed in 8.4), but including them is not an error and improves clarity.
- The `INFORMATION_SCHEMA.TABLES WHERE CREATE_OPTIONS LIKE '%TABLESPACE=...'` query works in practice, though the officially recommended approach is to join `INNODB_TABLESPACES` and `INNODB_TABLES` on the `SPACE` column. The post already shows the recommended approach as an alternative, so this is acceptable.
- The `INFORMATION_SCHEMA.INNODB_TABLES` and `INNODB_TABLESPACES` views and their column names (NAME, SPACE_TYPE, SPACE) are correct for MySQL 8.0+. These were renamed from `INNODB_SYS_TABLES`/`INNODB_SYS_TABLESPACES` in MySQL 8.0.3.
- Error code 3120 (HY000) for a non-empty tablespace is confirmed correct.
