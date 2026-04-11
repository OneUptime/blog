# Validation Summary: How to Use JSON_EXTRACT() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7+ / 8.0+)
- SQL
- MySQL JSON functions (JSON_EXTRACT, JSON_UNQUOTE)
- MySQL JSON path expressions
- MySQL generated columns and indexing

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_EXTRACT() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-extract
- MySQL 8.0 Reference Manual: JSON Path Syntax — https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual: The -> and ->> operators — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#operator_json-inline-path
- MySQL 8.0 Reference Manual: CREATE TABLE / Generated Columns — https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual: Indexing a Generated Column to Provide a JSON Column Index — https://dev.mysql.com/doc/refman/8.0/en/create-table-secondary-indexes.html#json-column-indirect-index

## Issues Found
No technical issues found.

## Review Notes
- The `@doc->>'$.product'` example using the `->>` operator with a user variable (rather than a table column) only works in MySQL 8.0.31+. Prior to that release, `->` and `->>` only accepted column identifiers on the left-hand side. Since MySQL 8.0.31 has been available since October 2022, this is unlikely to be a problem for most readers, but could be noted for users on older versions.
- The generated column example uses implicit JSON-to-DECIMAL coercion, which works correctly but some users may prefer an explicit `CAST(JSON_EXTRACT(...) AS DECIMAL(10,2))` for clarity. Both approaches are valid.
- MySQL's path expression syntax is a subset of JSONPath. The post uses the term "JSONPath" which is a common and understood simplification, though MySQL's documentation refers to them as "path expressions."
