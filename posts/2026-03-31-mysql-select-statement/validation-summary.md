# Validation Summary: How to Use SELECT Statement in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (SELECT statement, DDL for table creation, DML for data insertion)
- SQL (standard query syntax, aggregation, subqueries, NULL handling)

## Sources Consulted
- MySQL 8.0 Reference Manual: SELECT Statement (https://dev.mysql.com/doc/refman/8.0/en/select.html)
- MySQL 8.0 Reference Manual: String Functions - CONCAT (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_concat)
- MySQL 8.0 Reference Manual: Date and Time Functions - DATEDIFF, CURDATE, NOW (https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html)
- MySQL 8.0 Reference Manual: Flow Control Functions - IFNULL, COALESCE (https://dev.mysql.com/doc/refman/8.0/en/flow-control-functions.html)
- MySQL 8.0 Reference Manual: Aggregate Functions - COUNT, AVG, MAX, MIN (https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html)
- MySQL 8.0 Reference Manual: Information Functions - USER, DATABASE, VERSION (https://dev.mysql.com/doc/refman/8.0/en/information-functions.html)

## Issues Found
No technical issues found.

All SQL syntax is correct and compatible with MySQL 5.7+/8.0+. All sample query outputs were manually verified against the provided sample data:

- WHERE filter (Engineering AND salary > 90000): correctly returns Alice (95000) and Carol (105000).
- ORDER BY salary DESC LIMIT 3: correctly returns Carol, Alice, Eve.
- Aggregation results: all COUNT, AVG, MAX, MIN values verified by manual calculation against the 7-row dataset.
- Computed expressions (salary/12, CONCAT, DATEDIFF): output values are accurate.
- DISTINCT departments: correctly produces 3 rows in alphabetical order.
- Logical processing order (FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT) is accurately described.

## Review Notes
- The `years_tenure` computation using `DATEDIFF(CURDATE(), hired_on) / 365.0` is an approximation that does not account for leap years. This is acceptable for a tutorial and the post does not claim exactness; the sample output uses ellipsis to indicate approximate values.
- The NULL handling examples (IFNULL, IS NULL) demonstrate correct syntax but will produce no interesting results with the sample data since `department` is defined as NOT NULL. This is fine for illustrative purposes.
- The aliases `current_time` and `current_user` in the "Selecting Constants and Functions" section are MySQL reserved words. While they work as aliases in practice, using backtick-quoted identifiers would be more robust.
- The BETWEEN tip in Best Practices is correct — MySQL's BETWEEN is inclusive on both ends, so `'2021-01-01'` to `'2021-12-31'` correctly covers the entire year for DATE columns.
