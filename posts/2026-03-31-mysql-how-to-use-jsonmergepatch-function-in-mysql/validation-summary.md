# Validation Summary: How to Use JSON_MERGE_PATCH() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.22+ / 8.0+)
- JSON_MERGE_PATCH() function
- JSON_MERGE_PRESERVE() function (comparison)
- JSON_EXTRACT() function
- RFC 7396 JSON Merge Patch

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_MERGE_PATCH() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-patch
- MySQL 8.0 Reference Manual: JSON_MERGE_PRESERVE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-preserve
- RFC 7396: JSON Merge Patch — https://datatracker.ietf.org/doc/html/rfc7396

## Issues Found
No technical issues found.

## Review Notes
- The JSON key ordering shown in expected results (e.g., `{"name": "Alice", "age": 30, "city": "NYC"}`) may not match MySQL's actual output ordering, which sorts keys by length then lexicographically. Since JSON objects are unordered by definition, this does not constitute a technical error, but readers running the examples may see keys in a different order.
- The syntax description uses `patch` for the second and subsequent arguments rather than `json_doc` as in the official MySQL docs. This is a reasonable clarity choice, not an error.
- The `JSON_MERGE_PATCH()` function was introduced in MySQL 5.7.22. The post does not specify a minimum version, which is fine for a general tutorial.
- The bulk patch example using `JSON_EXTRACT(profile, '$.verified') IS NULL` correctly identifies rows where the key is absent (SQL NULL), but would not match rows where the key exists with a JSON null value. This is appropriate for the stated use case.
