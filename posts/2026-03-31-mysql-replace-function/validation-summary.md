# Validation Summary: How to Use REPLACE() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL REPLACE() string function
- MySQL REGEXP_REPLACE() (MySQL 8.0+)
- SQL UPDATE with string manipulation
- SQL string function chaining

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions: REPLACE() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_replace)
- MySQL 8.0 Reference Manual — String Functions: REGEXP_REPLACE() (https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace)
- MySQL 8.0 Reference Manual — String Literals and escape sequences (https://dev.mysql.com/doc/refman/8.0/en/string-literals.html)

## Issues Found
1. **Chained REPLACE missing `+` character removal**: The phone number test data includes `'+1-800-555-0100'` which contains a `+` sign, but the chained REPLACE example only removed `(`, `)`, `-`, `.`, and spaces. The comment claimed to "strip all non-numeric characters" yet the `+` would remain in the output. Added `REPLACE(..., '+', '')` as an additional outer call to the chain so the example correctly matches its stated purpose.

## Review Notes
- The post's claim that "REPLACE is always case-sensitive" is consistent with the official MySQL documentation, which states "REPLACE() performs a case-sensitive match when searching for from_str." However, in practice, REPLACE() behavior follows the collation of its string arguments. With the default case-insensitive collation in most MySQL installations (e.g., `utf8mb4_0900_ai_ci`), REPLACE() may actually perform case-insensitive matching. The blog post aligns with the docs, but readers using default collations may observe different behavior than the case-sensitivity example suggests.
- The `\r\n` and `\n` escape sequences in the line-ending examples are correctly interpreted by MySQL in string literals — this is accurate.
- The REGEXP_REPLACE `(?i)` inline flag usage is correct; MySQL 8.0 uses ICU for regex, which supports inline flags.
- All SQL syntax is correct and examples produce the stated results.
