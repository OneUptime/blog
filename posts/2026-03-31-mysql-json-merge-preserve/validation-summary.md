# Validation Summary: How to Use JSON_MERGE_PRESERVE() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- SQL
- MySQL JSON functions (JSON_MERGE_PRESERVE, JSON_MERGE_PATCH, JSON_ARRAYAGG)

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_MERGE_PRESERVE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-preserve
- MySQL 8.0 Reference Manual: JSON_MERGE_PATCH() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-patch
- MySQL 8.0 Reference Manual: Aggregate Functions (JSON_ARRAYAGG) — https://dev.mysql.com/doc/refman/8.0/en/aggregate-functions.html#function_json-arrayagg

## Issues Found

1. **Broken GROUP_CONCAT example for merging rows**: The original query `JSON_MERGE_PRESERVE(GROUP_CONCAT(meta ...))` passed a single string argument to `JSON_MERGE_PRESERVE()`, which requires at least two arguments. This would produce an "Incorrect parameter count" error at parse time. Replaced with a working self-join approach and kept the MIN/MAX approach as an alternative for exactly two rows. Added a note explaining why aggregated rows cannot be dynamically expanded into separate function arguments.

2. **Broken JSON_ARRAYAGG example for accumulating tags**: The query `JSON_MERGE_PRESERVE(JSON_ARRAYAGG(tags))` also passed only one argument to `JSON_MERGE_PRESERVE()`, causing the same parameter count error. Removed the broken query and replaced the surrounding text with a note explaining the limitation, keeping the working explicit two-argument example that was already present below it.

## Review Notes
- All other code examples (basic merges, recursive object merge, PRESERVE vs PATCH comparison, NULL handling, three-or-more documents) are technically correct and produce the stated output.
- The historical note about `JSON_MERGE()` being deprecated in MySQL 8.0.3 is accurate.
- The mermaid diagram correctly illustrates the merge behavior.
- The MIN/MAX approach works for exactly 2 rows but relies on JSON string comparison order, not insertion order. This is acceptable since JSON_MERGE_PRESERVE is commutative for the purpose of accumulation.
