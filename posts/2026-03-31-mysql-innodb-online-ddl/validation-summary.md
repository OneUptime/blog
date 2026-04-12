# Validation Summary: How to Perform InnoDB Online DDL in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- Online DDL (INSTANT, INPLACE, COPY algorithms)
- performance_schema
- Percona Toolkit (pt-online-schema-change)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Server System Variables (tmpdir) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_tmpdir
- MySQL 8.0 Reference Manual: innodb_sort_buffer_size — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_sort_buffer_size
- MySQL 8.0 Reference Manual: Monitoring Online DDL Progress — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-performance.html
- Percona Toolkit: pt-online-schema-change — https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found
1. **`SET GLOBAL tmpdir` is invalid**: The `tmpdir` system variable is read-only in MySQL and cannot be changed at runtime with `SET GLOBAL`. It can only be set in the MySQL configuration file (`my.cnf`) and requires a server restart. Fixed by replacing the `SET GLOBAL` statement with a configuration file example and an explanation that `tmpdir` is read-only.

2. **`DEFAULT NOW()` is invalid SQL for column defaults**: The pt-online-schema-change example used `DEFAULT NOW()` which is not valid syntax for a column default value. `NOW()` works in queries but not in `DEFAULT` clauses. The correct syntax is `DEFAULT CURRENT_TIMESTAMP`. This is especially important since the section targets pre-8.0 MySQL where expression defaults (`DEFAULT (NOW())`) are not available. Fixed by changing to `DEFAULT CURRENT_TIMESTAMP`.

## Review Notes
- The claim that INPLACE "rebuilds the table in-place" is a simplification — not all INPLACE operations trigger a table rebuild (e.g., adding a secondary index does not rebuild table data). This is acceptable for a blog post but could be clarified in a future revision.
- The INSTANT ADD COLUMN "at any position" capability was introduced in MySQL 8.0.29. Earlier 8.0 releases only supported adding columns at the end of the table. The post says "MySQL 8.0" generically, which is technically correct but could be more precise.
- The performance_schema monitoring query requires that the `events_stages_current` consumer and related instruments are enabled, which is not the default configuration. The post does not mention this prerequisite.
