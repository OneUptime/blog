# Validation Summary: How to Fix Inconsistent Case in MySQL Data

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (string functions: UPPER, LOWER, CONCAT, LEFT, SUBSTRING, SUBSTRING_INDEX, REPLACE, LENGTH)
- MySQL stored functions (DELIMITER, CREATE FUNCTION, DETERMINISTIC)
- MySQL triggers (BEFORE INSERT)
- MySQL collations (utf8mb4_bin, case-sensitive vs case-insensitive)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: Collation and Character Set — https://dev.mysql.com/doc/refman/8.0/en/charset-general.html
- MySQL 8.0 Reference Manual: CREATE FUNCTION Statement — https://dev.mysql.com/doc/refman/8.0/en/create-procedure.html
- MySQL 8.0 Reference Manual: CREATE TRIGGER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-trigger.html
- MySQL 8.0 Reference Manual: The BINARY Operator — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html#operator_binary

## Issues Found
- **All WHERE clauses using `!=` for case comparison were broken with default collations.** MySQL's default collations (e.g., `utf8mb4_0900_ai_ci`, `utf8mb4_general_ci`) are case-insensitive, meaning `'Alice' != 'alice'` evaluates to FALSE. This caused every detection query (SELECT) to return empty results, and every conditional UPDATE to match zero rows — effectively making the core technique in the post non-functional. Fixed by adding the `BINARY` keyword before the column reference in all affected WHERE clauses (10 occurrences across detection queries, lowercase updates, uppercase updates, and the title-case update). Also added a brief explanatory note in the detection section to alert readers to why `BINARY` is necessary.

## Review Notes
- The `BINARY` operator is deprecated as of MySQL 8.0.28 in favor of `CAST(expr AS BINARY)`. The `BINARY` keyword still works in all current MySQL versions and is more readable for a tutorial context, but readers on newer MySQL versions may see deprecation warnings.
- The `title_case` stored function uses `LENGTH()` (byte length) to count spaces, which works correctly since space is a single-byte character in all MySQL character sets. Using `CHAR_LENGTH()` would also work and be slightly more semantically clear, but `LENGTH()` is not incorrect here.
- The trigger example only covers `BEFORE INSERT`. In production, a `BEFORE UPDATE` trigger would also be needed to maintain case normalization when rows are modified. The post scopes itself to INSERT only, which is technically accurate but worth noting.
- The title_case function handles single-space-delimited words correctly but does not handle edge cases like multiple consecutive spaces, tabs, or leading/trailing whitespace. This is acceptable for a tutorial-level function.
