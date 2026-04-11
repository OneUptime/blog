# Validation Summary: How to Roll Back a Failed Schema Migration in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (DDL, DML, transactions, ALTER TABLE, information_schema)
- Flyway (undo migrations, schema history table)
- Liquibase (rollback-count, rollback by tag)
- pt-online-schema-change (referenced indirectly via `_tablename_new` temp table pattern)

## Sources Consulted
- MySQL 8.0 Reference Manual: Statements That Cause an Implicit Commit — https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html
- MySQL 8.0 Reference Manual: Atomic Data Definition Statement Support — https://dev.mysql.com/doc/refman/8.0/en/atomic-ddl.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Space Requirements — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-space-requirements.html
- Flyway Documentation: Undo Migrations — https://documentation.red-gate.com/flyway/flyway-concepts/migrations/undo-migrations
- Flyway Documentation: Schema History Table — https://documentation.red-gate.com/fd/flyway-schema-history-table-273973417.html
- Liquibase Documentation: rollback-count — https://docs.liquibase.com/commands/rollback/rollback-count.html
- Liquibase Documentation: rollback by tag — https://docs.liquibase.com/commands/rollback/rollback-by-tag.html
- Liquibase Documentation: Automatic Rollback Support — https://docs.liquibase.com/pro/user-guide/what-automatic-rollbacks-does-liquibase-support

## Issues Found

1. **Transaction example showed ROLLBACK and COMMIT sequentially (line 33-41)**: The original code block had `ROLLBACK;` followed by `COMMIT;` as sequential statements. If executed as a script, this would always roll back the transaction, making the COMMIT a no-op. Fixed by restructuring to show ROLLBACK and COMMIT as alternatives with clarifying comments.

2. **Liquibase commands used legacy camelCase syntax (lines 68-73)**: `liquibase rollbackCount 1` and `liquibase rollback v1.0` used the pre-4.4 positional argument syntax. Updated to modern kebab-case syntax: `liquibase rollback-count --count=1` and `liquibase rollback --tag=v1.0`.

3. **Inaccurate description of NOT NULL failure scenario (line 90)**: The text said "adding a NOT NULL column" but the SQL example uses `MODIFY COLUMN` to convert an existing nullable column to NOT NULL. Fixed to "converting a column to NOT NULL."

## Review Notes
- The `_orders_new` temp table reference in the "Manual Rollback for Failed ALTER TABLE" section is the naming convention used by pt-online-schema-change, not native MySQL. Native MySQL uses `#sql-ib` or `#sql-` prefixed intermediate tables. The blog text is conditional ("If a temp table was left behind"), so it is not technically wrong, but readers doing native ALTER TABLE operations would not encounter a `_orders_new` table.
- Liquibase auto-generates rollback for many common change types (createTable, addColumn, createIndex) without requiring explicit rollback blocks. The blog states "Liquibase supports rollback if rollback blocks are defined in the changeset," which is not wrong but omits auto-rollback capability.
- The Flyway section correctly notes that `flyway undo` is a Teams feature. An alternative community-edition approach is `flyway repair`, which automatically cleans up failed migration entries — this could be a useful addition but is not an error.
- All SQL syntax is valid for MySQL 5.7+ and 8.0+. The NOT NULL enforcement behavior described is accurate for MySQL strict mode (default since 5.7).
