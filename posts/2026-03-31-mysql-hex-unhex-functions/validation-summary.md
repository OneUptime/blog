# Validation Summary: How to Use HEX() and UNHEX() Functions in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (HEX(), UNHEX(), SHA2(), MD5(), UUID(), CONV(), BIN(), OCT() functions)
- SQL (DDL and DML statements)

## Sources Consulted
- [MySQL 8.0 Reference Manual — String Functions and Operators (UNHEX, HEX)](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html)
- [MySQL 8.0 Reference Manual — Hexadecimal Literals](https://dev.mysql.com/doc/refman/8.0/en/hexadecimal-literals.html)
- [MySQL 8.0 Reference Manual — Encryption and Compression Functions (SHA2, MD5)](https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html)
- [MariaDB Documentation — UNHEX](https://mariadb.com/kb/en/unhex/)

## Issues Found
- **HEX(SHA2(...)) double-encoding (Checksums and Fingerprints section):** The original code used `HEX(SHA2(CONCAT(first_name, last_name, email), 256))`. MySQL's `SHA2()` already returns a hexadecimal string (e.g., a 64-character hex string for SHA-256). Wrapping it in `HEX()` would double-encode the result — converting each ASCII hex character to its own hex representation (e.g., `'a'` → `'61'`), producing a 128-character string that is not a valid hash. Removed the `HEX()` wrapper so the query correctly returns the SHA-256 hex digest directly.

## Review Notes
- The claim that `UNHEX('ABC')` returns NULL due to odd number of characters is not explicitly documented in the MySQL 8.0 reference manual. The manual only states NULL is returned for non-hexadecimal characters or NULL input. The behavior with odd-length strings may be version-dependent. Authors may wish to verify this example against their target MySQL version.
- The `HEX('cafe')` example has a comment about multi-byte encoding for accented characters, but the string `'cafe'` contains no accented characters (unlike `'café'`). The comment is not technically wrong (it says "may show") but could be clearer by using an actually accented string.
- The comparison table lists `BIN(n)` and `OCT(n)` as "Integer only" — while their documented signatures take numeric arguments, MySQL will implicitly convert string arguments to numbers. This is a reasonable simplification for a tutorial.
