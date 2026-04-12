# Validation Summary: How to Fix ERROR 1215 Cannot Add Foreign Key Constraint in MySQL

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL: CREATE TABLE, ALTER TABLE)
- Foreign key constraints
- information_schema system tables

## Sources Consulted
- MySQL 8.0 Reference Manual, Section 13.1.20.5 FOREIGN KEY Constraints (https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html)
- MySQL 8.0 Reference Manual, SHOW ENGINE Statement (https://dev.mysql.com/doc/refman/8.0/en/show-engine.html)
- MySQL 8.0 Reference Manual, information_schema KEY_COLUMN_USAGE Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-key-column-usage-table.html)

## Issues Found
1. **Incorrect index requirement for referenced columns**: The post stated "The referenced column must be a primary key or have a unique index." According to the MySQL documentation, InnoDB permits a foreign key to reference any indexed column — a regular (non-unique) index is also sufficient. Fixed the text to clarify that a primary key, unique index, or regular index all satisfy the requirement, and added an example showing `ADD INDEX` as a valid option. Also updated the summary paragraph to say "the parent column has an index" instead of "the parent column has a primary key or unique index."

## Review Notes
- The error number (1215), SQLSTATE (HY000), and error message text are all accurate.
- The `SHOW ENGINE INNODB STATUS` advice and the `LATEST FOREIGN KEY ERROR` section reference are correct and practical.
- All SQL syntax in code examples is valid MySQL.
- The data type matching advice (including UNSIGNED attribute) is correct and is one of the most common causes of this error.
- The collation mismatch discussion is accurate — character set and collation must match for string-type foreign key columns.
- The `information_schema.KEY_COLUMN_USAGE` verification query is correct.
- The post could mention in a future update that MySQL 8.0.16+ also supports `CHECK` constraints if relevant context is needed, but this is not necessary for the current scope.
