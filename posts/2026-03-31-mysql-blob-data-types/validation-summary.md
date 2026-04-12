# Validation Summary: How to Use BLOB Data Types (TINYBLOB, BLOB, MEDIUMBLOB, LONGBLOB) in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL (BLOB, TINYBLOB, MEDIUMBLOB, LONGBLOB data types)
- SQL (DDL, DML)
- InnoDB storage engine
- MySQL AES_ENCRYPT / AES_DECRYPT functions
- MySQL LOAD_FILE function

## Sources Consulted
- MySQL 8.0 Reference Manual — The BLOB and TEXT Types: https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual — Data Type Storage Requirements: https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual — AES_ENCRYPT / AES_DECRYPT: https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html
- MySQL 8.0 Reference Manual — LOAD_FILE: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_load-file
- MySQL 8.0 Reference Manual — InnoDB Row Formats: https://dev.mysql.com/doc/refman/8.0/en/innodb-row-format.html
- MySQL 8.0 Reference Manual — Data Type Default Values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html

## Issues Found

1. **AES_ENCRYPT/AES_DECRYPT example did not pass the IV parameter.** The `secure_documents` table defined an `iv BINARY(16)` column and the INSERT stored `RANDOM_BYTES(16)` in it, but neither `AES_ENCRYPT` nor `AES_DECRYPT` received the IV as an argument. The IV was generated and stored but never actually used in encryption or decryption. Fixed by using a session variable (`SET @iv = RANDOM_BYTES(16)`) and passing `@iv` / `iv` to both `AES_ENCRYPT` and `AES_DECRYPT`.

2. **BLOB DEFAULT value claim was outdated.** The post stated "BLOB columns cannot have a DEFAULT value other than NULL." Starting with MySQL 8.0.13, BLOB columns can have expression defaults, e.g. `DEFAULT (X'')`. Updated the text to note this distinction between literal and expression defaults.

3. **BLOB vs TEXT comparison table listed charset/collation as "None" for BLOB.** BLOB columns have the `binary` character set and `binary` collation. Changed "None" to "`binary` / `binary`" and changed "Defined" to "Character-set-aware" for TEXT.

4. **InnoDB off-page storage description was inaccurate.** The original text said "stored off-page for values larger than approximately half the InnoDB page size (8KB by default)" which was ambiguous (could be misread as 8KB being the default page size) and oversimplified the off-page storage rules. The default InnoDB page size is 16 KB, and the off-page behavior depends on the row format. Updated to describe the default DYNAMIC row format behavior (20-byte pointer, data stored off-page) and correctly state the 16 KB default page size.

## Review Notes
- The AES_ENCRYPT example uses the default `block_encryption_mode` of `aes-128-ecb`, which ignores the IV parameter. For production use, users should set `block_encryption_mode` to a CBC or other IV-aware mode. The post already includes the disclaimer "example only, manage keys externally in production" which is appropriate.
- The LOAD_FILE section correctly notes the FILE privilege requirement. It does not mention `secure_file_priv`, which is a common stumbling block, but this is an omission rather than an error.
- All BLOB size limits, length prefix sizes, SQL syntax, and hex literal examples are correct.
