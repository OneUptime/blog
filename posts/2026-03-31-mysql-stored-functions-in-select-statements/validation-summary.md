# Validation Summary: How to Use Stored Functions in SELECT Statements in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (Stored Functions, SELECT statements, DELIMITER syntax)
- SQL (WHERE, ORDER BY, GROUP BY, HAVING clauses)
- MySQL query optimization (EXPLAIN, generated columns, index considerations)

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE FUNCTION Statement: https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual — DETERMINISTIC characteristic: https://dev.mysql.com/doc/refman/8.0/en/stored-programs-logging.html
- MySQL 8.0 Reference Manual — TIMESTAMPDIFF(): https://dev.mysql.com/doc/refman/8.0/en/date-and-time-functions.html#function_timestampdiff
- MySQL 8.0 Reference Manual — Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html

## Issues Found
1. **`age_in_years` function incorrectly declared as `DETERMINISTIC`**: The function calls `CURDATE()`, which returns the current date and changes daily. This means the same input (`p_birthdate`) produces different results on different days, making the function non-deterministic. MySQL does not enforce the correctness of the `DETERMINISTIC` declaration — it trusts the creator — but mislabeling a function as deterministic can cause incorrect query cache hits or flawed optimizer decisions. Changed `DETERMINISTIC` to `NOT DETERMINISTIC`.

## Review Notes
- The `calculate_discount_price` function used in the ORDER BY example is not defined in the post. This is acceptable since it serves as a syntax illustration, but readers may find it slightly inconsistent compared to the other sections where functions are fully defined before use.
- The claim "Every row in the result set triggers a function call" in the Performance section is slightly imprecise — for functions in a WHERE clause, the function is called for every row *scanned*, not just those in the final result set. The distinction matters for understanding performance impact, but the overall advice is sound.
- All SQL syntax (DELIMITER, CREATE FUNCTION, RETURN, CASE expressions, GROUP BY with function calls) is correct for MySQL 5.7+/8.0+.
