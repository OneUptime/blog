# Validation Summary: How to Add and Drop Columns with ALTER TABLE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB storage engine
- SQL DDL (ALTER TABLE, ADD COLUMN, DROP COLUMN)
- Online DDL algorithms (INSTANT, INPLACE, COPY)
- information_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: Online DDL Operations — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html
- MySQL 8.0 Reference Manual: INSTANT ADD/DROP Column — https://dev.mysql.com/doc/refman/8.0/en/innodb-online-ddl-operations.html#online-ddl-column-operations
- MySQL 8.0 Reference Manual: information_schema.COLUMNS — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found
1. **Incorrect DESCRIBE output column ordering**: The DESCRIBE output showed `view_count` and `published_at` appearing before `created_at`, but these columns were added without positional clauses (no FIRST or AFTER), so they are appended to the end of the table — after the existing `created_at` column. Fixed by swapping `created_at` to appear before `view_count` and `published_at` in the DESCRIBE output.

## Review Notes
- The best practices bullet "metadata-only changes with no locking" is a common simplification. INSTANT DDL does briefly acquire a metadata lock, but it does not block concurrent DML. This is accurate enough for a tutorial context.
- The claim that "all column drops" support INSTANT on the new row format is slightly broad — there are edge-case restrictions (e.g., cannot drop the only remaining column, columns in certain index configurations). These are uncommon enough that the simplification is reasonable for a tutorial.
- The statement "Combining multiple changes in one ALTER TABLE is more efficient because it performs only one table rebuild" is true for non-INSTANT operations. For INSTANT operations there is no rebuild at all, but combining is still beneficial for reducing metadata lock overhead.
- All SQL syntax is correct and current for MySQL 8.0.
- The note about MySQL lacking `ADD COLUMN IF NOT EXISTS` is correct (MariaDB supports this, but MySQL does not as of 8.0).
