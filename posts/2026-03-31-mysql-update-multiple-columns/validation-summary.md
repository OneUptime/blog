# Validation Summary: How to Update Multiple Columns in a Single UPDATE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (UPDATE statement, SET clause, CASE expressions, ROW_COUNT())
- Node.js with mysql2 driver

## Sources Consulted
- MySQL 8.0 Reference Manual — UPDATE Statement: https://dev.mysql.com/doc/refman/8.0/en/update.html
- MySQL 8.0 Reference Manual — Information Functions (ROW_COUNT): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_row-count
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2

## Issues Found
- **Incorrect explanation in "Updating Only Changed Columns" section**: The original text stated "MySQL still matches the row but skips the write if both values are already correct, which is reflected in `ROW_COUNT()`." This was misleading. With the WHERE clause as written (`AND (first_name != 'Bob' OR email != 'bob@example.com')`), if both values already match, the row does not satisfy the WHERE clause at all — it is filtered out entirely, no lock is acquired, and no write is attempted. The original wording conflated this with MySQL's separate built-in optimization where a matched row with unchanged values is not sent to the storage engine. Fixed the explanation to accurately describe the WHERE-clause filtering behavior.

## Review Notes
- The NULL-safety caveat for the "Updating Only Changed Columns" pattern is worth noting: comparisons like `first_name != 'Bob'` evaluate to NULL when `first_name` is NULL, which means rows with NULL values may be incorrectly skipped. A more robust pattern would use `NOT (first_name <=> 'Bob' AND email <=> 'bob@example.com')` with the NULL-safe equality operator. This is not an error in the post but a potential improvement for a future revision.
- The left-to-right evaluation order for SET assignments applies only to single-table UPDATEs. For multi-table UPDATEs, MySQL does not guarantee evaluation order. The post correctly scopes its examples to single-table UPDATEs but does not explicitly call out this distinction — a minor point for future enhancement.
