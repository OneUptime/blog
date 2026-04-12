# Validation Summary: How to Use LAST_INSERT_ID() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- LAST_INSERT_ID() function
- AUTO_INCREMENT
- Stored Procedures
- Transactions
- Python (mysql-connector / pymysql)
- Node.js (mysql2)

## Sources Consulted
- MySQL 8.0 Reference Manual — LAST_INSERT_ID(): https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id
- MySQL 8.0 Reference Manual — AUTO_INCREMENT Handling in InnoDB: https://dev.mysql.com/doc/refman/8.0/en/innodb-auto-increment-handling.html
- MySQL 8.0 Reference Manual — CREATE PROCEDURE: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- Python DB-API 2.0 cursor.lastrowid: https://peps.python.org/pep-0249/

## Issues Found
- **Line 100: "two-argument form" should be "one-argument form"**: The post described `LAST_INSERT_ID(expr)` as "the two-argument form." This is incorrect — `LAST_INSERT_ID(expr)` takes one argument (the expression). The no-argument form `LAST_INSERT_ID()` takes zero arguments. Changed "two-argument" to "one-argument."

## Review Notes
- The technique for retrieving all IDs from a multi-row INSERT (`SELECT id FROM products WHERE id >= LAST_INSERT_ID() LIMIT 3`) assumes contiguous auto-increment values, which is generally reliable within a single statement but can be affected by `innodb_autoinc_lock_mode=2` (interleaved mode) under concurrent inserts. This is a minor caveat, not an error.
- The note about LAST_INSERT_ID() not being affected by ROLLBACK is correct — the auto-increment counter itself is not rolled back, and the user variable `@temp_id` retains its value. However, the row itself is rolled back, so the ID value will be "skipped" in subsequent inserts.
