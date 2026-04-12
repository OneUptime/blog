# Validation Summary: How to Use CONV() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL
- CONV() function
- INET_ATON() / INET_NTOA() functions
- LPAD() function
- Base conversion (binary, octal, decimal, hexadecimal, base-36)

## Sources Consulted
- MySQL 8.0 Reference Manual - Mathematical Functions (CONV): https://dev.mysql.com/doc/refman/8.0/en/mathematical-functions.html#function_conv
- MySQL 8.0 Reference Manual - Miscellaneous Functions (INET_ATON, INET_NTOA): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html
- MySQL 8.0 Reference Manual - String Functions (LPAD): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_lpad

## Issues Found

1. **N parameter described as string-only (line 21 and summary)**: The post stated N must be "provided as a string." Per MySQL docs, N "may be specified as an integer or a string." Fixed the parameter description and the summary paragraph to reflect this.

2. **Undocumented out-of-range behavior claim (line 25)**: The post stated "If the result is out of range, MySQL returns the maximum unsigned 64-bit value." The official MySQL documentation does not make this claim; it only states "CONV() works with 64-bit precision." Replaced with the documented wording.

## Review Notes
- All mathematical conversions in the code examples are correct and verified.
- The negative base examples (signed conversion) work as described, though MySQL docs primarily document negative `from_base` behavior explicitly; negative `to_base` is demonstrated in their examples but less thoroughly documented.
- The INET_NTOA(CONV(...)) example relies on MySQL's implicit string-to-integer cast, which works but is not explicitly called out. This is a minor style point, not an error.
- The base-36 short code example (71 -> '1Z') is mathematically correct: 1*36 + 35 = 71, where Z represents 35.
