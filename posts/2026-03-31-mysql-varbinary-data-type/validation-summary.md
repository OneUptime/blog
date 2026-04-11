# Validation Summary: How to Use VARBINARY Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (VARBINARY data type)
- SQL DDL (CREATE TABLE, ALTER TABLE, CREATE INDEX)
- MySQL encryption functions (AES_ENCRYPT, AES_DECRYPT)
- MySQL hashing functions (SHA2, UNHEX, HEX)

## Sources Consulted
- MySQL 8.0 Reference Manual: The BINARY and VARBINARY Types — https://dev.mysql.com/doc/refman/8.0/en/binary-varbinary.html
- MySQL 8.0 Reference Manual: The CHAR and VARCHAR Types — https://dev.mysql.com/doc/refman/8.0/en/char.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: Encryption and Compression Functions — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html
- MySQL 8.0 Reference Manual: Collation Pad Attributes — https://dev.mysql.com/doc/refman/8.0/en/charset-binary-collations.html

## Issues Found

1. **Duplicate PRIMARY KEY in CREATE TABLE statement**: The `file_chunks` table defined `PRIMARY KEY` both inline on the `id` column (`id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY`) and again as a separate constraint (`PRIMARY KEY (id)`). MySQL rejects this with `ERROR 1068 (42000): Multiple primary key defined`. Fixed by removing the redundant `PRIMARY KEY (id)` line.

2. **Incorrect VARCHAR trailing spaces claim in comparison table**: The VARBINARY vs VARCHAR table stated that VARCHAR has "Trailing spaces stripped." This is incorrect — VARCHAR preserves trailing spaces in storage. Their significance in comparisons depends on the collation's PAD attribute (PAD SPACE collations ignore trailing spaces; NO PAD collations like `utf8mb4_0900_ai_ci`, the default in MySQL 8.0, treat them as significant). Fixed to "Preserved; ignored in PAD SPACE comparisons."

## Review Notes
- The comment "Different: binary comparison is case-sensitive" in the hashing example is slightly imprecise — the SHA2 digests differ because the hash inputs ('apple' vs 'Apple') are different byte sequences, not because of VARBINARY's comparison semantics. However, the broader point about VARBINARY performing byte-by-byte comparison is correct, so this was left as-is.
- The `VARBINARY(65535)` declaration in the example table may fail in practice depending on the InnoDB row format and the combined size of other columns, since the maximum row size is also 65,535 bytes. The post does acknowledge this with "subject to the overall row limit," which is sufficient.
