# Validation Summary: How to Use TABLE Statement in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.19+
- TABLE statement (DML)
- SET operations (UNION, INTERSECT, EXCEPT)

## Sources Consulted
- MySQL 8.0 Reference Manual — TABLE Statement: https://dev.mysql.com/doc/refman/8.0/en/table.html
- MySQL 8.0 Reference Manual — INSERT ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/insert-select.html
- MySQL 8.0 Reference Manual — CREATE TABLE ... SELECT: https://dev.mysql.com/doc/refman/8.0/en/create-table-select.html
- MySQL 8.0 Reference Manual — SET Operations (UNION, INTERSECT, EXCEPT): https://dev.mysql.com/doc/refman/8.0/en/set-operations.html
- MySQL 8.0 Reference Manual — VALUES Statement: https://dev.mysql.com/doc/refman/8.0/en/values.html

## Issues Found

1. **Incorrect `CREATE TABLE ... AS TABLE` syntax (was lines 98-109)**: The post contained a self-contradictory section that first showed the correct syntax (`CREATE TABLE employees_snapshot TABLE employees;`), then "corrected" itself to an incorrect form (`CREATE TABLE employees_snapshot AS TABLE employees;`). Per the official MySQL docs, the correct syntax is without `AS`. Removed the erroneous self-correction and the stray editorial note ("Wait - the correct syntax for MySQL 8.0.19+ is:").

2. **Incorrect `ORDER BY column_0` in UNION ALL example (was line 119)**: The `column_0` naming convention is specific to the VALUES statement, not the TABLE statement. When TABLE is used in a UNION, column names come from the actual table columns. Changed `column_0` to `order_date` as a realistic placeholder column name for an orders table.

3. **Incorrect tag: DDL changed to DML**: The TABLE statement is classified as DML (Data Manipulation Language) in the official MySQL documentation, not DDL (Data Definition Language). Updated the tags accordingly.

## Review Notes
- The post omits the `INTO OUTFILE`/`INTO DUMPFILE`/`INTO var_name` clauses from the TABLE syntax, which is a reasonable simplification for an introductory tutorial.
- The subquery example (`FROM (TABLE employees) AS t WHERE ...`) is syntactically valid but somewhat contrived — wrapping TABLE in a derived table just to add WHERE filtering defeats the purpose of TABLE's simplicity. It's not technically wrong, but a future revision could add a note about this.
