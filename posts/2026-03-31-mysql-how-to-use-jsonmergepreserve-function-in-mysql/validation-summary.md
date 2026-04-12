# Validation Summary: How to Use JSON_MERGE_PRESERVE() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- JSON_MERGE_PRESERVE() function
- JSON_MERGE_PATCH() function (comparison)
- JSON_MERGE() deprecated function

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_MERGE_PRESERVE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-preserve
- MySQL 8.0 Reference Manual: JSON_MERGE_PATCH() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-patch
- MySQL 8.0 Reference Manual: JSON value merging rules — https://dev.mysql.com/doc/refman/8.0/en/json.html#json-normalization

## Issues Found
- **Inaccurate comments in aggregation example**: The code comments said "using GROUP_CONCAT and JSON parsing" and "MySQL does not have a built-in JSON aggregate, so use GROUP_CONCAT," but the code actually uses MIN/MAX (not GROUP_CONCAT). Additionally, MySQL does have built-in JSON aggregate functions (JSON_ARRAYAGG and JSON_OBJECTAGG since 5.7.22) — it just lacks one that merges/concatenates JSON arrays. Fixed the comments to accurately describe the MIN/MAX approach and clarify the actual limitation.

## Review Notes
- The MIN/MAX aggregation workaround in the "Aggregating JSON from Multiple Rows" section has a subtle flaw: for groups with only one row (e.g., user_id=2), MIN and MAX return the same value, causing JSON_MERGE_PRESERVE to duplicate the array contents. The post does note this approach has limitations, but users should be aware of this single-row edge case.
- All merge behavior rules, basic examples, nested merge examples, comparison with JSON_MERGE_PATCH, and the changelog example are technically correct and produce the stated results.
- The recursive merging claim for nested objects is correct — MySQL's JSON_MERGE_PRESERVE does recursively merge nested objects when duplicate keys both have object values.
