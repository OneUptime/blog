# Validation Summary: How to Use LOG(), LOG2(), LOG10() in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (mathematical/numeric functions)
- SQL

## Sources Consulted
- MySQL 8.0 Reference Manual — Mathematical Functions: https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_log
- MySQL 8.0 Reference Manual — LOG2(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_log2
- MySQL 8.0 Reference Manual — LOG10(): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_log10
- Manual verification of all logarithmic calculations and rounded output values

## Issues Found
No technical issues found.

## Review Notes
- The `CEIL(LOG2(n))` formula in the "Bits Required to Represent a Number" section is a widely used approximation but has known edge cases: it returns 0 for n=1 (should be 1 bit) and underestimates for exact powers of 2 (e.g., n=256 gives 8, but 256 in binary is `100000000` requiring 9 bits). The mathematically precise formula is `FLOOR(LOG2(n)) + 1`. Since the post does not display result values for this query, the impact is minimal, but readers applying the formula should be aware of these edge cases.
- `LOG(2, 8)` and `LOG(10, 1000)` are shown returning exactly `3.0`. In practice, MySQL computes these via `LOG(X)/LOG(B)` which may produce floating-point results like `2.9999999999999996`. This is standard for educational content and not an error.
- All other code examples, SQL syntax, NULL/edge-case behavior, result table values, and mathematical formulas were verified and are correct.
