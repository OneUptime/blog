# Validation Summary: How to Create Generated Columns from JSON in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- SQL (DDL: CREATE TABLE, ALTER TABLE; DML: SELECT, INSERT)
- MySQL JSON functions (JSON_EXTRACT, JSON_UNQUOTE, ->, ->> operators)
- MySQL generated columns (VIRTUAL and STORED)
- MySQL multi-value indexes (MySQL 8.0.17+)
- MEMBER OF, JSON_OVERLAPS functions

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: The JSON Data Type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: Functions That Search JSON Values — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: Multi-Valued Indexes — https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-multi-valued

## Issues Found
1. **Incorrect claim about generated column cross-references (Limitations section):** The post stated "The expression cannot reference other generated columns or non-deterministic functions." This is incorrect. MySQL allows a generated column expression to reference other generated columns, provided they are defined earlier in the table definition (no forward references). Fixed to: "The expression can reference other generated columns only if they are defined earlier in the table (no forward references), and cannot use non-deterministic functions." This same error was previously caught and corrected in sibling posts (`mysql-how-to-use-generated-virtual-columns-in-mysql` and `mysql-what-is-a-generated-column-in-mysql`).

## Review Notes
- The `in_stock` generated column uses `attributes -> '$.in_stock' = 'true'` to compare a JSON boolean with a SQL string. This works correctly because MySQL parses the SQL string `'true'` as a JSON literal (since `true` is valid JSON), converting it to JSON boolean `true` for the comparison. However, this behavior is non-obvious and could confuse readers. A comment or use of `CAST('true' AS JSON)` would improve clarity, but it is not technically wrong.
- The `age` column uses `profile -> '$.age' + 0` to coerce a JSON number to a SQL numeric type. The `->` operator binds tighter than `+` in MySQL's grammar, so this evaluates correctly as `(profile -> '$.age') + 0`. An alternative approach using `CAST` or `->>` with implicit type conversion would be equally valid.
- All SQL syntax, table definitions, INSERT statements, and query examples are correct and would execute as expected on MySQL 8.0.
- The multi-value index section correctly requires MySQL 8.0.17+ and uses proper syntax with `CAST(... AS CHAR(50) ARRAY)`.
- The EXPLAIN output comment (`-- key: idx_users_city_tier`) is a reasonable expectation, though actual optimizer behavior may vary with data distribution.
