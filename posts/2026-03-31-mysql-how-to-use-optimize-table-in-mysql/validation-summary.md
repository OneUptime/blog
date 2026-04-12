# Validation Summary: How to Use OPTIMIZE TABLE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (OPTIMIZE TABLE statement)
- InnoDB storage engine
- MyISAM storage engine
- MySQL Event Scheduler
- Percona Toolkit (pt-online-schema-change)
- mysqlcheck CLI utility
- information_schema.tables

## Sources Consulted
- MySQL 8.0 Reference Manual — OPTIMIZE TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual — InnoDB Online DDL Operations: https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual — CREATE EVENT Statement: https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual — information_schema.tables: https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- Percona Toolkit — pt-online-schema-change: https://docs.percona.com/percona-toolkit/pt-online-schema-change.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that InnoDB maps OPTIMIZE TABLE to `ALTER TABLE ... ENGINE=InnoDB` internally. More precisely, MySQL maps it to `ALTER TABLE ... FORCE`, which is equivalent. Both produce the same result, so the post's description is accurate.
- The Online DDL claim (MySQL 5.6+) is correct — specifically, this was introduced in MySQL 5.6.17. Brief exclusive metadata locks are still acquired at the start and end of the operation, but the bulk of the rebuild allows concurrent DML. The post's simplification is appropriate for the audience level.
- The pt-online-schema-change example includes a plaintext password (`--password=secret`), which is typical for blog demonstrations but worth noting as a security consideration in production use.
