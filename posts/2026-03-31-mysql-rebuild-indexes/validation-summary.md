# Validation Summary: How to Rebuild Indexes in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- OPTIMIZE TABLE statement
- ALTER TABLE FORCE (online DDL)
- ANALYZE TABLE statement
- information_schema.TABLES
- Percona Toolkit (pt-online-schema-change)

## Sources Consulted
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE and Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- Percona Toolkit Documentation: pt-online-schema-change — https://docs.percona.com/percona-toolkit/pt-online-schema-change.html

## Issues Found
No technical issues found.

## Review Notes
- The OPTIMIZE TABLE output message ("Table does not support optimize, doing recreate + analyze instead") accurately reflects actual MySQL InnoDB behavior.
- The `DATA_FREE` metric from information_schema.TABLES is a reasonable but imperfect proxy for fragmentation. For InnoDB with `innodb_file_per_table=ON`, it reflects free space within the .ibd file. For shared tablespace configurations, it reflects free space in the shared tablespace, which may be less meaningful per-table. The post's simplified explanation is acceptable for a tutorial.
- The fragmentation query has a theoretical division-by-zero risk if both DATA_LENGTH and INDEX_LENGTH are 0 (empty table), but this is an edge case unlikely to matter in practice.
- The `ALGORITHM=INPLACE, LOCK=NONE` options for ALTER TABLE FORCE are available from MySQL 5.6+. The post does not specify a minimum version, which is fine since MySQL 5.6 reached end-of-life in 2021.
