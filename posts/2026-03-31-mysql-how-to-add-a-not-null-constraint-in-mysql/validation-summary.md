# Validation Summary: How to Add a NOT NULL Constraint in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, ALTER TABLE, MODIFY COLUMN)
- SQL strict mode (STRICT_TRANS_TABLES)
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: NOT NULL Constraints — https://dev.mysql.com/doc/refman/8.0/en/constraint-not-null.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: SQL Mode — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html

## Issues Found
No technical issues found.

## Review Notes
- The statement "MySQL will reject the ALTER TABLE" when NULLs exist is accurate for strict SQL mode (the default since MySQL 5.7.5). In non-strict mode, MySQL would instead convert NULLs to the type's implicit default and issue warnings. The post does discuss SQL mode nuances later, so this is acceptable.
- The claim that providing a DEFAULT "allows MySQL to automatically use the default for any NULLs during the schema change" is slightly imprecise — in non-strict mode NULLs get converted regardless of whether a DEFAULT is specified, and in strict mode the DEFAULT does not prevent the error. However, the post qualifies this with "(this behavior depends on SQL mode)" and the follow-up strict mode note, which is sufficient.
- `TINYINT(1)` display width is deprecated as of MySQL 8.0.17 but still functional and widely used. Not an error, but worth noting for future updates.
- The "NOT NULL alone: must provide a value on every INSERT" simplification is accurate for strict mode (the modern default) but would not hold in non-strict mode where MySQL uses implicit type defaults. Acceptable for a practical tutorial.
