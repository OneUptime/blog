# Validation Summary: How to Use MySQL CAST and CONVERT Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CAST and CONVERT functions)
- SQL (data type conversion)

## Sources Consulted
- MySQL 8.0 Reference Manual — CAST Functions and Operators: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual — Date and Time Literals: https://dev.mysql.com/doc/refman/8.0/en/date-and-time-literals.html
- MySQL 5.7 Reference Manual — CAST Functions and Operators: https://dev.mysql.com/doc/refman/5.7/en/cast-functions.html
- MySQL 8.0 Reference Manual — The JSON Data Type: https://dev.mysql.com/doc/refman/8.0/en/json.html

## Issues Found

1. **Incorrect date CAST result for `'2026/01/20'`**: The output table showed NULL for both `CAST('2026/01/20' AS DATE)` and `CAST('2026/01/20' AS DATETIME)`. MySQL's relaxed date parsing accepts any punctuation character as a delimiter between date parts, so `'2026/01/20'` is a valid date literal and should produce `2026-01-20` and `2026-01-20 00:00:00` respectively. Fixed the output table to show the correct non-NULL results.

2. **Wrong version annotation for JSON CAST target**: The post stated JSON was "MySQL 8.0+" but `CAST(expr AS JSON)` has been available since MySQL 5.7.8, when the JSON data type was introduced. Corrected to "MySQL 5.7.8+".

3. **Missing version annotation for YEAR CAST target**: YEAR was added as a valid CAST target type in MySQL 8.0.22. The post annotated FLOAT and JSON with version information but omitted it for YEAR, which could mislead users on older MySQL versions. Added "(MySQL 8.0.22+)" annotation.

## Review Notes
- The FLOAT version annotation says "MySQL 8.0+" — more precisely it was added in MySQL 8.0.17, but "8.0+" is an acceptable simplification.
- The `CAST(3.14159 AS CHAR(4))` example will produce a data truncation warning at runtime; the post doesn't mention this, but it's a minor omission since the alias `float_truncated` implies the truncation is intentional.
- The DOUBLE type is also available as a CAST target since MySQL 8.0.17 but is not listed. This is acceptable since the post is not aiming to be exhaustive and FLOAT covers the floating-point use case.
