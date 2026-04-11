# Validation Summary: How to Use AES_ENCRYPT() and AES_DECRYPT() Functions in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (AES_ENCRYPT, AES_DECRYPT functions)
- AES symmetric encryption (ECB, CBC modes)
- SQL (DDL, DML, session variables)
- Python cryptography library (brief example)

## Sources Consulted
- MySQL 8.0 Reference Manual: Encryption and Compression Functions — https://dev.mysql.com/doc/refman/8.0/en/encryption-functions.html
- MySQL 8.0 Reference Manual: Server System Variables (block_encryption_mode) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_block_encryption_mode
- MySQL 8.0.30 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-30.html

## Issues Found

### 1. Incorrect claim that MySQL supports GCM block encryption mode
- **What was wrong:** The post listed `aes-256-gcm` as a supported `block_encryption_mode` value, claiming it was added in MySQL 8.0.30+ for authenticated encryption. MySQL does **not** support GCM mode. The permitted modes are: ECB, CBC, CFB1, CFB8, CFB128, and OFB. What MySQL 8.0.30 actually added was Key Derivation Function (KDF) support (HKDF and PBKDF2), not new block cipher modes.
- **What was changed:** Replaced the `aes-256-gcm` entry with `aes-256-ofb` (OFB mode, a valid mode that uses an IV). Also removed the reference to GCM in the security considerations section.
- **Why:** GCM is not a valid value for `block_encryption_mode` in any MySQL version. Setting it would produce an error.

## Review Notes
- The post uses `SHA2('passphrase', 256)` to derive keys. This returns a 64-character hex string, not 32 raw bytes. For AES-256 (which expects a 32-byte key), MySQL folds the longer key via XOR. Using `UNHEX(SHA2('passphrase', 256))` would produce a proper 32-byte binary key and is more correct, but the current approach works consistently within MySQL due to key folding.
- The "Searching Encrypted Data" section correctly notes the limitation of CBC with random IVs but the example uses pseudo-code style (`search_term`, `encrypted_column`) that may confuse beginners expecting a runnable query.
- The basic syntax section correctly documents the extended KDF parameters added in MySQL 8.0.30, which is good.
- The advice to prefer application-layer encryption for high-security use cases is sound.
