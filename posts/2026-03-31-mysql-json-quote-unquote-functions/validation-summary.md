# Validation Summary: How to Use JSON_QUOTE() and JSON_UNQUOTE() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (JSON functions: JSON_QUOTE, JSON_UNQUOTE, JSON_OBJECT, JSON_EXTRACT)
- MySQL `->` and `->>` JSON path extraction operators

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_QUOTE() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-quote
- MySQL 8.0 Reference Manual: JSON_UNQUOTE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-unquote
- MySQL 8.0 Reference Manual: JSON Path Syntax and Operators (-> and ->>) — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#operator_json-inline-path
- MySQL 8.0 Reference Manual: JSON_OBJECT() — https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object

## Issues Found

1. **Extra backslash in JSON_QUOTE() result (line 31)**: The comment `-- Result: "line1\\nline2"` showed a double backslash (`\\n`) instead of a single backslash (`\n`). In a code block, `\\n` renders literally as two backslash characters + n, but MySQL's JSON_QUOTE() output for an embedded newline is the JSON escape `\n` (single backslash + n). Fixed to `-- Result: "line1\nline2"`.

2. **Incorrect function name in comment (line 52)**: The comment said `-- Safe with JSON_QUOTE()` but the accompanying code used `JSON_OBJECT()`, not `JSON_QUOTE()`. While the post correctly notes that `JSON_OBJECT()` calls `JSON_QUOTE()` internally, the comment was misleading. Fixed to `-- Safe with JSON_OBJECT()`.

3. **Extra closing parenthesis (line 98)**: The text `(or \`->>\`))` had a doubled closing parenthesis. Fixed to `(or \`->>\`)`.

4. **Extra backslash in round-trip example (line 114)**: Same issue as #1 — the comment `-- "tab\tand newline\\n"` had `\\n` instead of `\n`. Fixed to `-- "tab\tand newline\n"`.

## Review Notes
- The explanation on line 101 that `profile->'$.city'` comparison fails is correct in substance — the `->` operator returns a JSON-typed value whose string representation includes enclosing double quotes, so a direct comparison with a plain SQL string will not match. The wording `returns "\"New York\""` is slightly confusing but not technically wrong.
- All SQL syntax, function signatures, and operator behavior (`->`, `->>`) are accurate per MySQL 8.0+ documentation.
- The note that `JSON_UNQUOTE('null')` returns the string `"null"` (not SQL NULL) is correct and a useful clarification.
