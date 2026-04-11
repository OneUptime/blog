# Validation Summary: How to Use MySQL OPTIMIZE TABLE to Defragment InnoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6+ and 8.0+)
- InnoDB storage engine
- OPTIMIZE TABLE / ALTER TABLE FORCE
- information_schema.TABLES
- mysqlcheck CLI utility
- MySQL Event Scheduler
- Percona Toolkit (pt-online-schema-change)

## Sources Consulted
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE and Online DDL — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl.html
- MySQL 8.0 Reference Manual: The INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: mysqlcheck — https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual: CREATE EVENT Statement — https://dev.mysql.com/doc/refman/8.0/en/create-event.html
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table

## Issues Found
No technical issues found.

## Review Notes
- The locking description ("Shared metadata lock during rebuild, DML allowed") is a correct simplification. In practice, brief exclusive metadata locks are acquired at the very start and end of the operation. This is standard behavior and the simplification is appropriate for this audience.
- The post references MySQL 5.6+ throughout. All claims are accurate for MySQL 5.6+ and remain current through MySQL 8.x.
- The `DEFAULT NOW()` usage in the CREATE TABLE example is valid since MySQL treats `NOW()` as a synonym for `CURRENT_TIMESTAMP` in column defaults for DATETIME columns (supported since MySQL 5.6.5).
- The fragmentation percentage query correctly handles operator precedence and the `DATA_FREE > 0` WHERE clause prevents any division-by-zero risk.
