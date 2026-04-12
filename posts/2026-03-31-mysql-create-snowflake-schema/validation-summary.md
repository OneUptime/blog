# Validation Summary: How to Create Snowflake Schema in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (InnoDB storage engine)
- Snowflake schema (data warehouse design pattern)
- SQL DDL (CREATE TABLE, PRIMARY KEY, FOREIGN KEY, INDEX, UNIQUE KEY)
- SQL DML (INSERT ... ON DUPLICATE KEY UPDATE, INSERT ... SELECT)
- SQL query hints (STRAIGHT_JOIN)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: INSERT ... ON DUPLICATE KEY UPDATE — https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual: JOIN Clause / STRAIGHT_JOIN — https://dev.mysql.com/doc/refman/8.0/en/join.html
- MySQL 8.0 Reference Manual: FOREIGN KEY Constraints — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- Kimball Group data warehouse design methodology (star and snowflake schema definitions)

## Issues Found
No technical issues found.

## Review Notes
- The `VALUES(col)` function used in `ON DUPLICATE KEY UPDATE` clauses (e.g., `region = VALUES(region)`) was deprecated in MySQL 8.0.20. The recommended replacement uses a row alias: `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE region = new.region`. The current syntax still works but will produce deprecation warnings on MySQL 8.0.20+. This is a minor forward-compatibility concern, not a correctness issue.
- The fact table `fact_sales` includes a `date_key` column but no corresponding `dim_date` table is defined. This is an intentional simplification to focus on the snowflake normalization pattern (product/category and customer/geography hierarchies), not an error.
- The fact table omits foreign key constraints to dimension tables. This is a common and deliberate practice in data warehousing to avoid ETL performance overhead, so it is not an error.
