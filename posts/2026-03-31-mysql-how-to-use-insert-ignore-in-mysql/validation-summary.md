# Validation Summary: How to Use INSERT IGNORE in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL (INSERT IGNORE, INSERT ON DUPLICATE KEY UPDATE)

## Sources Consulted
- MySQL 8.0 Reference Manual — INSERT Statement: https://dev.mysql.com/doc/refman/8.0/en/insert.html
- MySQL 8.0 Reference Manual — The Effect of IGNORE on Statement Execution: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#ignore-effect-on-execution
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — InnoDB AUTO_INCREMENT Handling: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual — Information Functions (ROW_COUNT, FOUND_ROWS): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html

## Issues Found
1. **Incorrect ROW_COUNT() result in "Checking How Many Rows" section**: The VALUES list included `'mysql'`, which already existed in the `tags` table from the earlier "Basic Example" section. This meant both `'mysql'` and the duplicate `'python'` would be skipped, giving ROW_COUNT() of 3, not 4 as the comment claimed. Fixed by changing `'mysql'` to `'go'` in the VALUES list so only the `'python'` duplicate is skipped, making the ROW_COUNT() of 4 correct.
2. **Incorrect use of FOUND_ROWS()**: The post included `SELECT FOUND_ROWS()` after an INSERT IGNORE statement with a comment "Use after SELECT queries". FOUND_ROWS() only works after SELECT statements (specifically with SQL_CALC_FOUND_ROWS), not after INSERT. Additionally, FOUND_ROWS() is deprecated as of MySQL 8.0.17. Removed the misleading line entirely since ROW_COUNT() (already shown) is the correct function for checking affected rows after INSERT.

## Review Notes
- The `ON DUPLICATE KEY UPDATE price = VALUES(price)` syntax using the `VALUES()` function is deprecated as of MySQL 8.0.20. The modern replacement uses a row alias: `INSERT INTO ... VALUES (...) AS new ON DUPLICATE KEY UPDATE price = new.price`. The current syntax still functions but may be removed in a future MySQL version.
- The AUTO_INCREMENT gap behavior described in the post is accurate for InnoDB's default settings but may vary with different `innodb_autoinc_lock_mode` configurations. This is a minor nuance that doesn't affect the correctness of the post for typical use cases.
