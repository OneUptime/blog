# Validation Summary: How to Convert Between Binary and Text in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (HEX, UNHEX, BINARY, CAST, CONVERT functions)
- SHA-256 hashing via SHA2()
- UUID storage via UUID_TO_BIN / BIN_TO_UUID
- RANDOM_BYTES() function
- Character set conversion (utf8mb4, latin1, ascii)

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: HEX() — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_hex
- MySQL 8.0 Reference Manual: UNHEX() — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_unhex
- MySQL 8.0 Reference Manual: CAST and CONVERT — https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html
- MySQL 8.0 Reference Manual: Encryption and Compression Functions (SHA2) — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2
- MySQL 8.0 Reference Manual: Miscellaneous Functions (UUID_TO_BIN, BIN_TO_UUID) — https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html
- SHA-256 test vectors verified via `shasum -a 256` command-line utility

## Issues Found

### 1. Incorrect SHA-256 hash in query example
- **What was wrong:** The hardcoded hash `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824` in the "Storing Hex as Binary for Efficiency" section is the SHA-256 of "hello", not "data". The INSERT statement uses `SHA2('data', 256)`, so the subsequent WHERE clause would not match the inserted row.
- **What was changed:** Replaced with the correct SHA-256 hash of "data": `3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7`.
- **Why:** A reader following the tutorial step by step would get no results from the query, which would be confusing.

### 2. Missing accented characters in character set conversion example
- **What was wrong:** The SQL `SELECT CONVERT('Cafe cafe' USING ascii)` used plain ASCII characters 'Cafe cafe', but the expected output `Caf? caf?` implies non-ASCII characters (accented e) should be present. Plain ASCII 'e' would not be replaced with '?' when converting to ASCII.
- **What was changed:** Changed the input string from `'Cafe cafe'` to `'Café café'` (with accented é characters).
- **Why:** Without accented characters, the conversion to ASCII produces no replacements, making the example output incorrect.

## Review Notes
- The `BINARY` operator (e.g., `SELECT BINARY 'Hello' = 'hello'`) was deprecated in MySQL 8.0.28. The recommended alternative `CAST(expr AS BINARY)` is already shown alongside it in the post. Future readers on MySQL 8.0.28+ will see a deprecation warning, and the operator may be removed in MySQL 9.0. The post does not mention this deprecation.
- The comment "default for utf8mb4_general_ci" on the case-insensitive comparison example is slightly dated — MySQL 8.0+ defaults to `utf8mb4_0900_ai_ci`, not `utf8mb4_general_ci`. Both collations are case-insensitive, so the example result (1) is correct regardless.
- All other code examples, function signatures, and SQL syntax are correct and verified against MySQL 8.0 documentation.
