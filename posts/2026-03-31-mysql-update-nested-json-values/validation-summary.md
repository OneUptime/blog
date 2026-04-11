# Validation Summary: How to Update Nested JSON Values in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (8.0+)
- MySQL JSON data type
- MySQL JSON modification functions: JSON_SET(), JSON_REPLACE(), JSON_INSERT(), JSON_MERGE_PATCH(), JSON_REMOVE(), JSON_ARRAY_APPEND()
- MySQL JSON path expressions

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Modification Functions: https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json-path-syntax.html
- MySQL 8.0 Reference Manual — JSON_MERGE_PATCH(): https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-patch

## Issues Found
No technical issues found.

## Review Notes
- The comparison table correctly describes the upsert/replace/insert semantics of JSON_SET(), JSON_REPLACE(), and JSON_INSERT().
- All JSON path expressions (e.g., `$.user.age`, `$.roles[0]`) use valid MySQL JSON path syntax.
- The multi-path/value pair syntax for JSON_SET() is correct per the function signature `JSON_SET(json_doc, path, val[, path, val] ...)`.
- The use of SQL `TRUE` as a value argument in JSON_SET() is valid — MySQL correctly maps it to the JSON boolean `true`.
- The JSON_MERGE_PATCH() example correctly demonstrates RFC 7396 merge semantics, including recursive merging of nested objects.
- The result comment on line 32 shows keys in alphabetical order, which is accurate — MySQL does not guarantee key ordering in JSON objects and commonly reorders them alphabetically.
- One minor note: the post says "MySQL provides three functions for modifying existing JSON documents" but then covers six functions total. The "three" refers to the trio in the comparison table, which reads fine in context but could briefly confuse a reader. This is a stylistic observation, not a technical error.
- The post does not mention that JSON_MERGE_PATCH() removes keys when the patch value is JSON `null` — this is not an error but could be a useful addition in the future.
