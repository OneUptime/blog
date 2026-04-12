# Validation Summary: How to Avoid Common MySQL Anti-Patterns

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL (InnoDB storage engine)
- SQL (DDL and DML)
- MySQL JSON functions and generated columns

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE Foreign Keys — https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: The JSON Column Type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: JSON_UNQUOTE and ->> operator — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Reference Manual: CREATE TABLE Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: LIMIT Query Optimization — https://dev.mysql.com/doc/refman/8.0/en/limit-optimization.html

## Issues Found

1. **Redundant `JSON_UNQUOTE` with `->>` operator**: The generated column expression used `JSON_UNQUOTE(attributes->>'$.color')`. The `->>` operator is already shorthand for `JSON_UNQUOTE(JSON_EXTRACT(...))`, so wrapping it in another `JSON_UNQUOTE()` is redundant. Fixed to use `attributes->>'$.color'` alone.

2. **Incorrect claim that MySQL does not auto-index foreign key columns**: The post stated "MySQL does not automatically index foreign key columns." This is incorrect for InnoDB (the default engine). Per the MySQL docs, InnoDB automatically creates an index on foreign key columns if one does not already exist. Rewrote to acknowledge the auto-indexing behavior while explaining why explicit indexes are still best practice (clarity of intent, control over composite/covering indexes).

3. **Misleading implicit type conversion example**: The original example compared an INT column (`customer_id`) to a string literal (`'42'`). In this case, MySQL converts the string constant to a number and CAN still use the index on the INT column. The real anti-pattern is comparing a VARCHAR column to a numeric literal, which forces MySQL to cast every row's column value. Replaced the example with `phone_number = 5551234567` (VARCHAR vs numeric literal) to accurately demonstrate the problem.

## Review Notes
- The keyset pagination example uses `WHERE id > 50000` as a direct substitute for `OFFSET 50000`, which only holds if IDs are sequential with no gaps. This is a common simplification in educational material and is acceptable as an illustration of the concept.
- The EAV-to-JSON recommendation is solid for MySQL 8.0+ but worth noting that JSON column support was introduced in MySQL 5.7.8 and generated columns on JSON expressions improved significantly in 8.0.
