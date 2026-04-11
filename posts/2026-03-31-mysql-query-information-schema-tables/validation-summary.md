# Validation Summary: How to Query INFORMATION_SCHEMA.TABLES in MySQL

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL
- INFORMATION_SCHEMA.TABLES virtual table
- SQL querying for database metadata

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table (https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html)
- MySQL 8.0 Reference Manual: SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/select.html)

## Issues Found
No technical issues found.

## Review Notes
- All SQL queries are syntactically correct and use valid INFORMATION_SCHEMA.TABLES columns.
- The key columns table accurately describes each column's purpose. TABLE_TYPE values (BASE TABLE, VIEW, SYSTEM VIEW) are correct per MySQL documentation.
- The note that TABLE_ROWS is approximate for InnoDB is an important and accurate caveat.
- The "Generating Total Database Size" query does not filter by TABLE_TYPE = 'BASE TABLE', but this is not an error since views have NULL for DATA_LENGTH and INDEX_LENGTH, and SUM ignores NULLs.
- The "Finding Tables with High Index-to-Data Ratios" query correctly guards against division by zero with `WHERE DATA_LENGTH > 0`.
- Column alias usage in ORDER BY clauses is valid MySQL syntax.
- UPDATE_TIME behavior varies by storage engine; for InnoDB it requires innodb_file_per_table to be enabled (which is the default since MySQL 5.6.6). This is a minor caveat not mentioned in the post but not an error.
