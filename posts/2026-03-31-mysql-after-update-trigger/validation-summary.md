# Validation Summary: How to Create an AFTER UPDATE Trigger in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (triggers, AFTER UPDATE, BEFORE UPDATE)
- SQL (DDL, DML, SIGNAL, DELIMITER)
- Database auditing and change-tracking patterns

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE TRIGGER Statement: https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual — Trigger Syntax and Examples: https://dev.mysql.com/doc/refman/8.0/en/trigger-syntax.html
- MySQL 8.0 Reference Manual — SIGNAL Statement: https://dev.mysql.com/doc/refman/8.0/en/signal.html
- MySQL 8.0 Reference Manual — INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html
- MySQL 8.0 Reference Manual — NULL-safe equal operator (<=>): https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#operator_equal-to

## Issues Found

### Issue 1: Incorrect transaction semantics in BEFORE vs AFTER comparison table
- **What was wrong:** The comparison table stated that AFTER UPDATE triggers sync other tables with "row is committed." AFTER UPDATE triggers fire within the same transaction — the row is written but NOT committed. This contradicted the Best Practices section which correctly states "AFTER UPDATE triggers run inside the same transaction as the UPDATE."
- **What was changed:** Updated the AFTER UPDATE column from "YES (row is committed)" to "YES (row is written but not committed)" and the BEFORE UPDATE column from "YES (but row not committed yet)" to "YES (but row not yet written)" for clarity.
- **Why:** The distinction between "written" and "committed" matters. If the AFTER trigger raises an error or the transaction is rolled back, all changes (including the original UPDATE) are undone. Telling readers the row "is committed" could lead to incorrect assumptions about data durability and error handling.

### Issue 2: Incorrect transaction semantics in Summary section
- **What was wrong:** The Summary stated "AFTER UPDATE triggers fire after MySQL commits a row change." Triggers fire after the row change is applied to the table, but before the transaction commits.
- **What was changed:** Changed "commits" to "applies" — "AFTER UPDATE triggers fire after MySQL applies a row change."
- **Why:** Same reason as above — triggers run within the transaction, not after commit.

## Review Notes
- The `VALUES()` function used in Example 3's `ON DUPLICATE KEY UPDATE` clause is deprecated in MySQL 8.0.20+ in favor of row alias syntax. The code still works but readers on newer MySQL versions may see deprecation warnings. A future update could show the modern alias syntax.
- The post creates multiple AFTER UPDATE triggers on the same table without using `FOLLOWS`/`PRECEDES` clauses. This works in MySQL 5.7+ (triggers fire in creation order), but readers should be aware that MySQL 5.6 and earlier only allowed one trigger of each type per table.
- The `salary` and `department` columns in the `employees` table are nullable, yet Example 1 uses `!=` instead of the NULL-safe `<=>` operator for salary comparison. This is acceptable since the sample data never inserts NULL salaries, but the post correctly covers the NULL-safe approach in the "Checking Which Columns Changed" section.
- The percentage calculations in Example 1's output are mathematically verified as correct (Alice: 10.53%, Bob: -5.56%).
