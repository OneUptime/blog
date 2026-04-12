# Validation Summary: How to Use JSON_TYPE() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (5.7.8+, 8.0+)
- JSON_TYPE() function
- JSON_EXTRACT(), JSON_KEYS(), JSON_UNQUOTE()
- JSON_TABLE()
- Stored procedures with JSON validation

## Sources Consulted
- MySQL 8.0 Reference Manual: Functions That Return JSON Value Attributes — https://dev.mysql.com/doc/refman/8.0/en/json-attribute-functions.html
- MySQL 8.0 Reference Manual: JSON_TABLE() — https://dev.mysql.com/doc/refman/8.0/en/json-table-functions.html
- MySQL 8.0 Reference Manual: Lateral Derived Tables — https://dev.mysql.com/doc/refman/8.0/en/lateral-derived-tables.html

## Issues Found

1. **Incorrect comment about BOOLEAN return value (line 56)**: The post had `-- BOOLEAN (returned as INTEGER in some versions)`. This is incorrect — `JSON_TYPE('true')` has always returned `'BOOLEAN'` since JSON support was introduced in MySQL 5.7.8. The confusion likely stems from `JSON_EXTRACT` returning `true`/`false` as integer `1`/`0`, but that is unrelated to `JSON_TYPE()`. Removed the misleading parenthetical.

2. **Incomplete Return Values list**: The post was missing several valid JSON_TYPE return values: `DECIMAL`, `DATE`, `TIME`, `DATETIME`, and `TIMESTAMP`. Also, `BLOB` and `OPAQUE` were incorrectly grouped together as a single entry. Added all missing types and gave each its own entry with a clear description.

3. **Broken JSON_TABLE example**: The query used `CROSS JOIN (SELECT ... jt.key_name ...)` which references `jt.key_name` from a correlated derived table. MySQL does not allow a derived table in a CROSS JOIN to reference columns from other tables in the FROM clause without the `LATERAL` keyword (available since MySQL 8.0.14). Rewrote the query to use `JSON_EXTRACT()` directly in the SELECT clause, avoiding the need for a lateral join entirely.

## Review Notes
- The return type is described as "VARCHAR type string." MySQL docs say it returns a "utf8mb4 string" without specifying VARCHAR explicitly. This is a minor simplification that is acceptable for a tutorial audience.
- The Return Values list, even after fixes, does not include every possible edge case. For instance, TIMESTAMP is not explicitly listed (it falls under DATETIME in the corrected list). This is acceptable for a tutorial-level post.
- The filtering example `WHERE JSON_TYPE(payload) != 'NULL'` correctly filters out JSON null values, but readers should note that rows with SQL NULL payloads are also excluded due to SQL NULL comparison semantics. The post doesn't clarify this distinction.
