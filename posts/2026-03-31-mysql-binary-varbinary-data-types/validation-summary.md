# Validation Summary: How to Use BINARY and VARBINARY Data Types in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (BINARY and VARBINARY data types)
- SQL (DDL, DML, built-in functions: HEX, UNHEX, SHA2, UUID_TO_BIN, BIN_TO_UUID)

## Sources Consulted
- MySQL 8.0 Reference Manual — The BINARY and VARBINARY Types: https://dev.mysql.com/doc/refman/8.0/en/binary-varbinary.html
- MySQL 8.0 Reference Manual — String Functions (HEX, UNHEX, SHA2): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual — Miscellaneous Functions (UUID_TO_BIN, BIN_TO_UUID): https://dev.mysql.com/doc/refman/8.0/en/miscellaneous-functions.html
- MySQL 8.0 Reference Manual — Data Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html

## Issues Found
- **VARBINARY storage description was inaccurate**: The storage table stated VARBINARY(M) uses "actual length + 1 byte". Per MySQL documentation, VARBINARY uses a 1-byte length prefix if M ≤ 255, or a 2-byte length prefix if M > 255. Changed to "actual length + 1 or 2 bytes" to reflect this.

## Review Notes
- The `BINARY` cast operator used in the "Comparing BINARY Values" section (`SELECT BINARY 'abc' = BINARY 'ABC'`) has been deprecated since MySQL 8.0.28. The code still works and the results shown are correct, but future readers on newer MySQL versions may see deprecation warnings. The recommended replacement is `CAST(expr AS BINARY)` or using `CONVERT(expr USING BINARY)`.
- The hash values used in the file_checksums example (d41d8cd98f00b204e9800998ecf8427e for MD5, e3b0c44298fc1c149afbf4c8996fb924... for SHA-256) are the correct hashes of the empty string, consistent with size_bytes=0.
- All SQL syntax, function usage, and data type specifications are accurate for MySQL 8.0+.
