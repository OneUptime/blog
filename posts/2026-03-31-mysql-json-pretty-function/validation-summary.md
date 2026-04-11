# Validation Summary: How to Use JSON_PRETTY() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.22+, 8.0)
- SQL
- MySQL JSON functions (JSON_PRETTY, JSON_OBJECT, JSON_ARRAY, JSON_EXTRACT / -> operator)

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_PRETTY() — https://dev.mysql.com/doc/refman/8.0/en/json-utility-functions.html#function_json-pretty
- MySQL 8.0 Reference Manual: JSON_OBJECT() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object
- MySQL 8.0 Reference Manual: JSON value normalization and key ordering — https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization
- MySQL 8.0 Reference Manual: Boolean literals — https://dev.mysql.com/doc/refman/8.0/en/boolean-literals.html

## Issues Found

1. **Basic Example output had wrong key order**: MySQL normalizes JSON objects by sorting keys alphabetically. The output showed keys in the original insertion order ("name", "roles", "active") instead of alphabetical order ("active", "name", "roles"). Fixed to show correct alphabetical ordering.

2. **Pretty-Printing Stored JSON output had wrong key order**: Same normalization issue. The output for the `/users/1` row showed keys in insertion order ("id", "name", "email", "roles", "settings") instead of alphabetical order ("email", "id", "name", "roles", "settings"). The nested "settings" object also had keys in wrong order ("theme", "lang" instead of "lang", "theme"). Fixed both the top-level and nested key ordering.

3. **Pretty-Printing Constructed JSON output had two errors**:
   - **Wrong key order**: Keys were shown as "user", "tags", "active" instead of alphabetical "active", "tags", "user".
   - **Incorrect boolean representation**: `JSON_OBJECT('active', TRUE)` was shown as producing `"active": true` (JSON boolean), but in MySQL, `TRUE` is the integer `1`, so `JSON_OBJECT` produces `"active": 1` (JSON integer). Fixed the output to show `1` instead of `true`.

## Review Notes
- The sub-document example ($.settings) already had correct alphabetical key ordering ("lang", "theme"), so no fix was needed there.
- The post correctly notes that JSON_PRETTY() is available from MySQL 5.7.22+, which is accurate.
- The advice to avoid storing JSON_PRETTY() output and to avoid using it in production queries is sound.
- The `\G` terminator explanation is correct.
- If the author wanted JSON boolean `true` in the constructed JSON example instead of integer `1`, they could use `CAST('true' AS JSON)` instead of `TRUE`, but the current code with corrected output is accurate as-is.
