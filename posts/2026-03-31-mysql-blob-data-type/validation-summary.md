# Validation Summary: How to Use BLOB Data Type in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (BLOB data type, AES_ENCRYPT/AES_DECRYPT, LOAD_FILE, SHA2)
- Python (mysql.connector library)
- SQL (DDL and DML statements)

## Sources Consulted
- MySQL 8.0 Reference Manual: The BLOB and TEXT Types — https://dev.mysql.com/doc/refman/8.0/en/blob.html
- MySQL 8.0 Reference Manual: Data Type Storage Requirements — https://dev.mysql.com/doc/refman/8.0/en/storage-requirements.html
- MySQL 8.0 Reference Manual: LOAD_FILE Function — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_load-file
- MySQL 8.0 Reference Manual: AES_ENCRYPT / AES_DECRYPT — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_aes-encrypt
- MySQL 8.0 Reference Manual: Limits on Table Column Count and Row Size — https://dev.mysql.com/doc/refman/8.0/en/column-count-limit.html
- MySQL Connector/Python Developer Guide — https://dev.mysql.com/doc/connector-python/en/

## Issues Found
No technical issues found.

## Review Notes
- The claim that BLOB data "does not count toward the 65,535-byte row limit" is a simplification. BLOB/TEXT columns contribute 9-12 bytes (for an internal pointer) toward that limit, but the actual data is stored separately. This is accurate enough for a tutorial-level post.
- The AES_ENCRYPT example uses UNHEX(SHA2('key', 256)) to produce a 32-byte key. With MySQL's default block_encryption_mode of aes-128-ecb, only 16 bytes of the key are actually used. The code is functional and correct, but readers seeking AES-256 encryption would need to set block_encryption_mode to 'aes-256-ecb' or similar. This is a nuance beyond the scope of the post.
- The "64 KB" shorthand for 65,535 bytes is a common approximation (actual value is 63.999 KiB). The post correctly states the precise byte count alongside the approximation.
- InnoDB off-page storage behavior depends on the row format (COMPACT/REDUNDANT may store up to 768 bytes inline; DYNAMIC/COMPRESSED store only a 20-byte pointer inline). The post's simplified description is acceptable for its audience.
