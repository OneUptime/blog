# Validation Summary: How to Query INFORMATION_SCHEMA.SCHEMATA in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (8.0+)
- INFORMATION_SCHEMA.SCHEMATA
- SQL (DDL generation, metadata queries)

## Sources Consulted
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA.SCHEMATA Table: https://dev.mysql.com/doc/refman/8.0/en/information-schema-schemata-table.html
- MySQL 8.0 Reference Manual — SHOW DATABASES Statement: https://dev.mysql.com/doc/refman/8.0/en/show-databases.html
- MySQL 8.0 Reference Manual — INFORMATION_SCHEMA and Privileges: https://dev.mysql.com/doc/refman/8.0/en/information-schema-introduction.html

## Issues Found
1. **Incorrect privilege description (Required Privileges section):** The post stated users need "the `SELECT` privilege on `INFORMATION_SCHEMA`" to view schemas they do not own. This is inaccurate — `INFORMATION_SCHEMA` is a virtual database that is always accessible to every MySQL user; you cannot grant privileges on it. Visibility in `SCHEMATA` is determined by the user's privileges on the actual databases. The text was corrected to: "Any MySQL user can query `INFORMATION_SCHEMA.SCHEMATA`, but each user sees only the databases on which they hold at least one privilege. Users with any global privilege (such as `SHOW DATABASES`) can see all databases."

## Review Notes
- The `DEFAULT_ENCRYPTION` column was introduced specifically in MySQL 8.0.16, not 8.0.0. The post says "MySQL 8.0+" which is technically correct but imprecise. This is acceptable shorthand and was not changed.
- All SQL queries are syntactically correct and use valid MySQL syntax, including the implicit string literal concatenation in the CONCAT call for generating ALTER DATABASE statements.
- The list of system schemas filtered out (information_schema, performance_schema, mysql, sys) is correct and complete for standard MySQL installations.
- The column descriptions for INFORMATION_SCHEMA.SCHEMATA are accurate per the MySQL 8.0 reference manual.
