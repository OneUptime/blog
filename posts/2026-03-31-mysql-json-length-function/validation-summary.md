# Validation Summary: How to Use JSON_LENGTH() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (JSON functions)
- SQL
- JSON data type

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_LENGTH(): https://dev.mysql.com/doc/refman/8.0/en/json-attribute-functions.html#function_json-length
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json.html#json-path-syntax
- MySQL 8.0 Reference Manual — JSON value creation and extraction (-> and ->> operators): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html

## Issues Found
1. **Incorrect root_key_count for Laptop Pro in the "Object Length (Key Count)" section.** The JSON object for Laptop Pro has 4 root-level keys (`brand`, `cpu`, `tags`, `specs`), but the output table listed `root_key_count` as 5. Fixed to 4.

## Review Notes
- All other query outputs were manually verified against the sample data and are correct.
- The syntax, path expressions (`$.tags`, `$.specs.ports`, `$.tags[2]`), and operator usage (`->`, `->>`) are all valid MySQL 5.7+/8.0 syntax.
- The explanation of JSON_LENGTH() behavior for arrays, objects, scalars, and NULL is accurate per the MySQL documentation.
- The distinction between SQL NULL (argument is NULL → returns NULL) and JSON null literal (`'null'` → scalar → returns 1) is correctly handled.
- The NULL-safe filtering pattern using `OR ... IS NULL` in the "Filtering by Array Length" section is correct, since `NULL <= 1` evaluates to NULL (not TRUE) in SQL.
- The tip about using `CHAR_LENGTH(JSON_UNQUOTE(...))` for string length is accurate and helpful.
