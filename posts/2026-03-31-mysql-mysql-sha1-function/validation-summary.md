# Validation Summary: How to Use SHA1() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL SHA1() and SHA() functions
- MySQL SHA2() function
- MySQL MD5() function
- MySQL UNHEX(), HEX(), LENGTH(), CONCAT(), CHAR() functions
- MySQL LOAD_FILE() function

## Sources Consulted
- MySQL 8.0 Reference Manual — Encryption and Compression Functions: https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha1
- SHA-1 hash verification via command-line `shasum -a 1` and `md5` utilities
- Git internals documentation for blob hashing format

## Issues Found
- **Incorrect SHA1 hash for 'MySQL'**: The post stated `SHA('MySQL')` returns `5ae39e3e3d11bbf9cca2e2e8cb25e6b90ff1eb1d`. The correct SHA-1 hash of the string `MySQL` is `deaa0c393a6613972aaccbf1fecfdad67aa21e88`. Fixed the value in the Basic Examples section.

## Review Notes
- All other hash values (SHA1 of 'hello', empty string, 'test', and MD5 of 'test') were verified correct.
- SHA() as an alias for SHA1() is confirmed in MySQL documentation.
- The BINARY(20) storage optimization with UNHEX() is correct (160 bits = 20 bytes).
- The Git-style content addressing example correctly replicates Git's blob hashing format using CONCAT('blob ', LENGTH(content), CHAR(0), content).
- The SHAttered attack reference (2017) is historically accurate.
- The security guidance to prefer SHA2() with 256-bit output over SHA1() for sensitive use cases is appropriate and correct.
