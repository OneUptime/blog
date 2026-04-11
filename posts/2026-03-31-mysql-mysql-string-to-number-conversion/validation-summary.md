# Validation Summary: How to Convert a String to a Number in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (CAST, CONVERT, implicit type coercion, JSON_EXTRACT, FORMAT, REGEXP)

## Sources Consulted
- MySQL 8.0 Reference Manual: Cast Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual: Type Conversion in Expression Evaluation — https://dev.mysql.com/doc/refman/8.0/en/type-conversion.html
- MySQL 8.0 Reference Manual: Out-of-Range and Overflow Handling — https://dev.mysql.com/doc/refman/8.0/en/out-of-range-and-overflow.html
- MySQL 8.0 Reference Manual: JSON Functions — https://dev.mysql.com/doc/refman/8.0/en/json-functions.html

## Issues Found
- **`CAST('-1' AS UNSIGNED)` return value was incorrect.** The post claimed this returns `0` with the comment "negative clipped to 0". In MySQL, casting a negative value to UNSIGNED does not clip to zero — it wraps around using two's complement unsigned integer semantics. `CAST('-1' AS UNSIGNED)` returns `18446744073709551615` (2^64 - 1, the maximum BIGINT UNSIGNED value). Fixed the code comment to show the correct return value and note the wrap-around behavior.

## Review Notes
- The FLOAT and DOUBLE CAST targets are correctly noted as MySQL 8.0.17+ features.
- The JSON_EXTRACT example works correctly; CAST from a JSON string type to DECIMAL handles the unquoting implicitly in MySQL 8.0.
- The bulk conversion REGEXP `[^0-9.]` is a simple heuristic that won't catch all edge cases (e.g., multiple decimal points, negative signs) but is reasonable for a tutorial example.
- The advice about avoiding CAST in WHERE clauses for index usage is sound.
