# Validation Summary: What Is a Generated Column in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 5.7+ (Generated Columns feature)
- InnoDB storage engine
- MySQL JSON functions (JSON_EXTRACT, JSON_UNQUOTE)
- INFORMATION_SCHEMA

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE TABLE and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table-generated-columns.html
- MySQL 8.0 Reference Manual: Secondary Indexes and Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-secondary-indexes.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found

### Issue 1: Non-deterministic function in "Allowed Expressions" example
- **What was wrong:** The `days_old` example used `DATEDIFF(CURDATE(), birth_date)` as a generated column expression. `CURDATE()` is non-deterministic and MySQL rejects it in generated column definitions. This contradicted the post's own Limitations section, which correctly states expressions must be deterministic.
- **What was changed:** Replaced the date arithmetic example with a conditional logic example using `IF(price < original_price, 1, 0)`, which is a valid deterministic expression.

### Issue 2: Incorrect claim about referencing other generated columns
- **What was wrong:** The Limitations section stated "Generated columns cannot reference other generated columns." Per MySQL documentation, a generated column *can* reference other generated columns, but only those defined earlier in the table definition (forward references are disallowed).
- **What was changed:** Corrected to: "Generated columns can only reference other generated columns defined earlier in the table (no forward references)."

## Review Notes
- All SQL syntax (CREATE TABLE, ALTER TABLE, INSERT, SELECT, INFORMATION_SCHEMA queries) is correct.
- The distinction between VIRTUAL and STORED columns is accurately described.
- The JSON indexing example is a valid and practical use case.
- The error code 3105 for inserting into a generated column is correct.
- The EXTRA LIKE '%GENERATED%' filter in the INFORMATION_SCHEMA query correctly matches both VIRTUAL GENERATED and STORED GENERATED values.
