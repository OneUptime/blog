# Validation Summary: How to Use TRUNCATE() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- SQL (TRUNCATE(), ROUND(), FLOOR(), CEIL() numeric functions)

## Sources Consulted
- MySQL 8.0 Reference Manual: Mathematical Functions — TRUNCATE(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_truncate
- MySQL 8.0 Reference Manual: Mathematical Functions — ROUND(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual: Mathematical Functions — FLOOR(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_floor
- MySQL 8.0 Reference Manual: Precision Math — Rounding Behavior: https://dev.mysql.com/doc/refman/8.0/en/precision-math-rounding.html

## Issues Found

1. **Confusing comment on first basic example (line 34):** The comment `(not 3.14, because 3.14159 truncated, not rounded)` was nonsensical — it said "not 3.14" but the result IS 3.14. Fixed to: `(digits beyond 2 decimal places are removed)`.

2. **Incorrect use of "rounds" in TRUNCATE context (line 49):** The comment for `TRUNCATE(123.456, -1)` said `(rounds to nearest 10)`. TRUNCATE does not round — this contradicts the core message of the post. Fixed to: `(truncates to nearest 10)`.

3. **Incorrect use of "rounding" in negative D section (line 157):** Comment said "Useful for rounding to display significant figures" but the operation is truncation, not rounding. Fixed to: `(Useful for truncating to display significant figures)`.

## Review Notes
- All SQL syntax is correct per MySQL documentation. `TRUNCATE(X, D)` requires exactly two arguments, and both are shown correctly throughout.
- The TRUNCATE() vs ROUND() comparison values are correct. `ROUND(3.145, 2)` returning `3.15` is consistent with MySQL's "round half away from zero" behavior for exact-value literals.
- The TRUNCATE() vs FLOOR() comparison for negative numbers is correct: TRUNCATE(-9.9, 0) = -9 (toward zero) vs FLOOR(-9.9) = -10 (toward negative infinity).
- The comparison table values are all correct.
- The financial calculation example with DECIMAL(10,4) is correct and the expected results in the table are accurate.
- NULL behavior is correctly documented per MySQL docs.
- Note: The post discusses the `TRUNCATE()` numeric function, which is distinct from the `TRUNCATE TABLE` DDL statement. The post correctly focuses on the numeric function only.
