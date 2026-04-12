# Validation Summary: How to Use GREATEST() and LEAST() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (GREATEST() and LEAST() comparison functions)
- SQL (DDL, DML, user variables, COALESCE)

## Sources Consulted
- MySQL 8.0 Reference Manual — GREATEST() and LEAST(): https://dev.mysql.com/doc/refman/8.0/en/comparison-operators.html#function_greatest
- MySQL 8.0 Reference Manual — Precision Math / DECIMAL data type: https://dev.mysql.com/doc/refman/8.0/en/precision-math-decimal-characteristics.html
- MySQL 8.0 Reference Manual — Type Conversion in Expression Evaluation: https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html

## Issues Found

1. **Section title mismatch (line 96):** The heading read "Enforcing Business Rules with LEAST()" but the code example underneath uses `GREATEST(sale_price * 0.90, floor_price)`. Changed the heading to "Enforcing Business Rules with GREATEST()".

2. **Incorrect type coercion claim (line 177):** The post stated `LEAST('100', '99', '200')` returns `99`, claiming MySQL applies numeric comparison when string arguments "look like numbers." This is wrong. Per MySQL documentation, when all arguments are character strings they are compared as strings (lexicographic order). Lexicographically `'100' < '200' < '99'` (compared character-by-character: `'1' < '2' < '9'`), so `LEAST` returns `'100'`. Fixed the comment and explanation.

3. **Incorrect decimal precision in output table (lines 110–118):** The `discounted_price` column showed values rounded to 2 decimal places (e.g., `22.49`). Because `sale_price` is `DECIMAL(10,2)` and the literal `0.90` is `DECIMAL(3,2)`, multiplication produces `DECIMAL(13,4)`. The `GREATEST()` result inherits this 4-decimal-place precision. Corrected the output to show 4 decimal places (e.g., `22.4910`, `80.9910`, `107.9910`, `31.5000`).

## Review Notes
- The date comparison examples pass date values as strings (e.g., `'2026-01-01'`). This works correctly in MySQL because the `YYYY-MM-DD` format is lexicographically sortable, but readers should be aware that for DATE-typed columns, explicit CAST may be preferable for clarity.
- The NULL handling advice to use COALESCE() is sound. The "Comparing Dates Across Columns" section demonstrates this well with the Gamma project where actual_end is NULL.
- The clamping pattern `LEAST(GREATEST(val, min), max)` is correct and a useful idiom.
