# Validation Summary: How to Implement Column-Level Encryption in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6.17+ through 8.0+)
- AES encryption (AES_ENCRYPT / AES_DECRYPT functions)
- SHA2 hashing
- AES block cipher modes (ECB, CBC)
- Python cryptography library (Fernet)

## Sources Consulted
- MySQL 8.0 Encryption Functions Reference: https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html
- MySQL 5.7 Encryption Functions Reference: https://dev.mysql.com/doc/refman/5.7/en/encryption-functions.html
- MySQL Blog - AES encryption with 5.6.17: https://dev.mysql.com/blog-archive/understand-and-satisfy-your-aes-encryption-needs-with-5-6-17/
- MySQL Secure Deployment Guide - Block Encryption Mode: https://dev.mysql.com/doc/mysql-secure-deployment-guide/5.7/en/secure-deployment-block-encryption-mode.html
- MySQL 8.0 CAST Functions Reference: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found
- **Ordering of IV column creation**: The post showed the `UPDATE` statement referencing the `iv` column before showing the `ALTER TABLE` command to add that column. A reader following the tutorial step-by-step would get an error. Fixed by moving the `ALTER TABLE customer_pii ADD COLUMN iv VARBINARY(16)` statement before the UPDATE/SELECT examples that use it.

## Review Notes
- All function signatures (`AES_ENCRYPT`, `AES_DECRYPT`, `SHA2`, `RANDOM_BYTES`) verified correct against official MySQL documentation.
- The `block_encryption_mode` system variable introduction in MySQL 5.6.17 is accurate (backported from 5.7.4).
- Using `CAST(AES_DECRYPT(...) AS CHAR)` is the documented pattern for converting binary decryption results to readable strings.
- The 16-byte IV for AES CBC mode is correct per MySQL docs ("must be 16 bytes or longer").
- The `SHA2` function returns a hex string, which when used as an AES key gets folded by MySQL's key-handling mechanism. This works correctly but is worth noting for readers who want precise key-length control.
- The Python Fernet example is syntactically correct and functional.
- The deterministic hash approach for searching encrypted columns is a sound and well-known pattern.
