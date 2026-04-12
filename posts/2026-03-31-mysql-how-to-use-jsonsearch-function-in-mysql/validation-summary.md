# Validation Summary: How to Use JSON_SEARCH() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions: JSON_SEARCH, JSON_EXTRACT, JSON_CONTAINS, JSON_UNQUOTE)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_SEARCH() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-search
- MySQL 8.0 Reference Manual: JSON_EXTRACT() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-extract
- MySQL 8.0 Reference Manual: JSON_UNQUOTE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-unquote
- MySQL 8.0 Reference Manual: JSON_CONTAINS() — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-contains

## Issues Found

1. **Syntax missing multiple path support**: The basic syntax showed `JSON_SEARCH(json_doc, one_or_all, search_str[, escape_char[, path]])` but the MySQL documentation specifies `JSON_SEARCH(json_doc, one_or_all, search_str[, escape_char[, path] ...])` — multiple path arguments can be provided. Fixed the syntax and updated the parameter description to note this.

2. **JSON_EXTRACT with JSON_SEARCH result requires JSON_UNQUOTE**: In the "Extracting the Found Value's Path for Further Use" section, `JSON_EXTRACT(@doc, @path)` was used directly with the result of `JSON_SEARCH()`. Since `JSON_SEARCH()` returns a JSON string (whose representation includes surrounding double quotes, e.g., `"$.roles[1]"`), assigning it to a user variable stores the quoted form. `JSON_EXTRACT()` expects a raw path expression (e.g., `$.roles[1]`), so `JSON_UNQUOTE(@path)` is needed to strip the JSON string quotes before passing the path. Fixed to `JSON_EXTRACT(@doc, JSON_UNQUOTE(@path))`.

## Review Notes
- All other code examples (basic searches, wildcard searches, table queries, JSON_CONTAINS comparison) are technically correct with accurate expected results.
- The wildcard behavior description (% and _ matching, like LIKE) is accurate.
- The NULL return behavior description is correct.
- The advice to prefer JSON_CONTAINS() for simple existence checks over JSON_SEARCH() is sound practical guidance.
