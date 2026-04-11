# Validation Summary: How to Use RANDOM_BYTES() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (RANDOM_BYTES() function, introduced in MySQL 5.6.17)
- AES encryption (AES_ENCRYPT with CBC mode)
- SHA2 hashing
- Cryptographic random number generation

## Sources Consulted
- MySQL 8.0 Reference Manual: RANDOM_BYTES() — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_random-bytes
- MySQL 8.0 Reference Manual: AES_ENCRYPT() — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_aes-encrypt
- MySQL 8.0 Reference Manual: SHA2() — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html#function_sha2
- MySQL 8.0 Reference Manual: block_encryption_mode — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_block_encryption_mode

## Issues Found
1. **AES encryption key derivation missing UNHEX()** (line 66): The original code used `SET @key = SHA2('my_encryption_key', 256);` which returns a 64-character hex string. When passed to AES_ENCRYPT(), MySQL applies key folding on this 64-byte string rather than using the actual 32-byte SHA-256 hash as the key. Fixed to `SET @key = UNHEX(SHA2('my_encryption_key', 256));` which correctly produces a 32-byte binary key matching AES-256's expected key length.

## Review Notes
- The post correctly describes the valid range for RANDOM_BYTES() as 1-1024 bytes.
- The UUID-like identifier example generates random bytes in the correct 8-4-4-4-12 format but does not set UUID v4 version/variant bits. The post appropriately calls these "UUID-Like" rather than claiming UUID v4 compliance.
- The post states RANDOM_BYTES() uses "the operating system's cryptographic random number generator." Technically, MySQL uses the SSL library's (OpenSSL) RAND_bytes() function, which itself seeds from the OS CSPRNG. This is a minor simplification but conveys the correct security implication.
- Error code 1690 (SQLSTATE 22003) for out-of-range values is accurate.
- The post does not mention the minimum MySQL version required (5.6.17). This is acceptable but could be a useful addition in the future.
