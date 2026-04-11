# Validation Summary: How to Use ROUND() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (ROUND, TRUNCATE, FLOOR, CEIL functions)
- SQL (SELECT, UPDATE, GROUP BY, CASE, AVG, STDDEV, MAX, MIN)
- DECIMAL vs FLOAT/DOUBLE data types

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions (ROUND): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_round
- MySQL 8.0 Reference Manual — Precision Math: https://dev.mysql.com/doc/refman/8.0/en/precision-math.html

## Issues Found

### 1. Incorrect rounding rule description (opening section and summary)
- **What was wrong:** The post stated that ROUND() universally uses the "round half away from zero" rule. Per MySQL documentation, this rule only applies to exact-value numbers (integers, DECIMAL). For approximate-value numbers (FLOAT, DOUBLE), MySQL defers to the C library, which typically uses "round to nearest even" (banker's rounding).
- **What was changed:** Added the data-type distinction to both the opening paragraph and the closing summary, clarifying that exact-value and approximate-value types are rounded differently.
- **Why:** This is a significant behavioral difference that can cause subtle bugs. The MySQL docs explicitly demonstrate that `ROUND(2.5)` returns 3 while `ROUND(25E-1)` returns 2 — same mathematical value, different results based on type.

### 2. Misleading floating-point precision example
- **What was wrong:** The example `SELECT ROUND(2.445, 2)` with the comment "May return 2.44 on some platforms" was misleading. MySQL treats the literal `2.445` as an exact-value DECIMAL, so this query consistently returns 2.45. The issue is not platform-dependent — it is data-type-dependent.
- **What was changed:** Replaced the single example with two contrasting examples: `ROUND(2.445, 2)` returning 2.45 (DECIMAL literal) and `ROUND(2.445E0, 2)` returning 2.44 (DOUBLE value), clearly showing that the data type determines the behavior.
- **Why:** The original example would never actually produce the "surprising" result it warned about, which could confuse readers trying to reproduce it.

## Review Notes
- All SQL syntax is correct and uses current, non-deprecated MySQL functions.
- The comparison examples (ROUND vs TRUNCATE vs FLOOR vs CEIL) are all accurate, including the negative number cases.
- The practical examples (financial rounding, statistical summaries, grade assignment) are well-constructed and syntactically valid.
- NULL handling is correctly documented — ROUND() returns NULL when either argument is NULL.
- The recommendation to use DECIMAL columns for monetary values is good standard advice.
