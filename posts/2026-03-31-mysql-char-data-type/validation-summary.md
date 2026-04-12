# Validation Summary: How to Use CHAR Data Type in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (CHAR data type, storage engine behavior, collations, INFORMATION_SCHEMA)

## Sources Consulted
- MySQL 8.0 Reference Manual: The CHAR and VARCHAR Types — https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual: SQL Mode — https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html#sqlmode_strict_trans_tables
- MySQL 8.0 Reference Manual: String Data Type Syntax — https://dev.mysql.com/doc/refman/8.0/en/string-type-syntax.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html

## Issues Found
1. **Incorrect strict mode behavior**: The post stated "Values longer than the defined length are truncated (with a warning in strict mode)." This is incorrect. In strict SQL mode, MySQL raises an error and rejects the statement entirely. Truncation with a warning only occurs in non-strict mode. Fixed to accurately describe both modes: error in strict mode, truncation with warning in non-strict mode.

## Review Notes
- The statement "Even though MySQL stored three bytes plus two padding bytes" is a simplification. For single-byte character sets (e.g., latin1) this is accurate, but with multi-byte character sets like utf8mb4 (the default in MySQL 8.0+), InnoDB may store CHAR columns using variable-length encoding internally. This is acceptable for a beginner-level tutorial.
- The PAD_CHAR_TO_FULL_LENGTH SQL mode (which prevented trailing space stripping on retrieval) was deprecated in MySQL 8.0.13 and removed in MySQL 8.0.29. The post correctly describes the default behavior without mentioning this mode, which is appropriate since it is no longer available.
- All SQL examples are syntactically correct and would execute as described.
