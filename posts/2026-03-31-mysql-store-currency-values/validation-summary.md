# Validation Summary: How to Store Currency Values in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DECIMAL, FLOAT, DOUBLE data types)
- SQL DDL (CREATE TABLE with generated columns, indexes)
- SQL DML (INSERT, SELECT, aggregate functions)
- ISO 4217 currency codes (CHAR(3))

## Sources Consulted
- MySQL 8.0 Reference Manual — Precision Math: https://dev.mysql.com/doc/refman/8.0/en/precision-math.html
- MySQL 8.0 Reference Manual — Fixed-Point Types (DECIMAL, NUMERIC): https://dev.mysql.com/doc/refman/8.0/en/fixed-point-types.html
- MySQL 8.0 Reference Manual — Floating-Point Types (FLOAT, DOUBLE): https://dev.mysql.com/doc/refman/8.0/en/floating-point-types.html
- MySQL 8.0 Reference Manual — Literal Values (numeric literals vs scientific notation): https://dev.mysql.com/doc/refman/8.0/en/number-literals.html
- MySQL 8.0 Reference Manual — CREATE TABLE and Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Reference Manual — CAST and CONVERT Functions: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- IEEE 754 floating-point arithmetic standard

## Issues Found

### Issue 1: Incorrect floating-point demonstration (line 17-18)
- **What was wrong:** The example `SELECT 0.1 + 0.2;` was annotated as returning `0.30000000000000004`. In MySQL, bare decimal literals (e.g., `0.1`) are treated as exact `DECIMAL` values, not `DOUBLE`. So `SELECT 0.1 + 0.2` actually returns `0.3` exactly. The `0.30000000000000004` result is what JavaScript or Python would produce, not MySQL. The second example used `CAST(0.1 AS FLOAT)`, but `CAST AS FLOAT` was only added in MySQL 8.0.17 and is less common than `CAST AS DOUBLE`.
- **What was changed:** Changed `SELECT 0.1 + 0.2` to `SELECT 0.1e0 + 0.2e0` (scientific notation forces `DOUBLE` type in MySQL), added a comment explaining why `e0` is needed. Changed `CAST(0.1 AS FLOAT)` to `CAST(0.1 AS DOUBLE)` for broader MySQL version compatibility, and corrected the result comment.
- **Why:** The original example would actually demonstrate the opposite of what was claimed — MySQL would return an exact `0.3`, undermining the floating-point warning.

### Issue 2: Incorrect maximum value for DECIMAL(14, 2) (line 55)
- **What was wrong:** The comment stated `DECIMAL(14, 2)` supports "up to 9,999,999,999.99" (10 digits before the decimal point). `DECIMAL(14, 2)` has 14 total digits with 2 after the decimal, meaning 12 digits before the decimal. The actual maximum is 999,999,999,999.99.
- **What was changed:** Corrected the comment from "up to 9,999,999,999.99" to "up to 999,999,999,999.99".
- **Why:** The stated maximum was 100x lower than the actual capacity of the data type.

## Review Notes
- The claim "MySQL performs exact arithmetic on DECIMAL values" is correct for addition, subtraction, and multiplication. However, `AVG()` (used in the aggregate example) involves division, which may introduce rounding since the quotient could have more decimal places than the result type allows. This is technically inherent to division rather than an inaccuracy in the post, but worth noting for readers doing financial calculations with averages.
- The generated column `amount_usd` approach is valid but note that the expression `amount * exchange_rate` may produce a result exceeding `DECIMAL(14, 2)` precision depending on the input values. MySQL will round or truncate to fit the declared type. For financial applications, explicit rounding with `ROUND()` in the generated column expression would make the rounding behavior explicit.
- The integer cents approach section is correct and well-presented. The division `amount_cents / 100.0` correctly produces a DECIMAL result in MySQL since `100.0` is a DECIMAL literal.
