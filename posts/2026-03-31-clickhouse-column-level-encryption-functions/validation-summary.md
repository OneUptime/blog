# Validation Summary: How to Use Column-Level Encryption Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- AES encryption (CBC, GCM, ECB modes)
- SQL (DDL/DML)
- ClickHouse `encrypt` / `decrypt` / `aes_encrypt_mysql` / `aes_decrypt_mysql` functions
- ClickHouse `SHA256` hash function
- ClickHouse `dictGet` for dictionary-based key retrieval
- MergeTree table engine

## Sources Consulted
- [ClickHouse Encryption Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/encryption-functions)
- [ClickHouse Hash Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/hash-functions)
- [ClickHouse encrypt/decrypt PR #11844](https://github.com/ClickHouse/ClickHouse/pull/11844)
- [Altinity: Introducing AES Encryption Functions in ClickHouse](https://altinity.com/blog/introducing-aes-encryption-functions-in-clickhouse)

## Issues Found
No technical issues found.

Verified against ClickHouse documentation:
- Function signatures `encrypt(mode, plaintext, key[, iv, aad])` and `decrypt(mode, ciphertext, key[, iv, aad])` are correct.
- `aes_encrypt_mysql(mode, plaintext, key[, iv])` and `aes_decrypt_mysql(...)` are valid functions.
- Listed modes (`aes-128-ecb`, `aes-256-ecb`, `aes-128-cbc`, `aes-256-cbc`, `aes-256-gcm`) are all supported (the post uses "include" so the partial list is fine).
- Key lengths used in examples match the mode requirements: 32-byte keys (`'0123456789abcdef0123456789abcdef'` and `'key_32_bytes_long_here_pad_it_ok'`) for `aes-256-*` are correct.
- IVs (`'initialization_v'`, `'iv_16bytes_long_'`) are 16 bytes, matching ClickHouse's IV requirement of 16 bytes (excess bytes are ignored).
- IV is correctly required for `aes-256-gcm` and omitted for the basic `aes-256-cbc` example (IV is optional for non-GCM modes in ClickHouse).
- `dictGet(dict_name, attribute_name, id_expr)` signature is correct.
- `MergeTree() ORDER BY (...)` syntax is valid.
- `SHA256` returns `FixedString(32)`, which implicitly converts to `String` for storage and comparison; the example works correctly.

## Review Notes
- Storing SHA256 output in a `String` column works due to implicit conversion, but `FixedString(32)` would be more storage-efficient. This is a stylistic suggestion, not a correctness issue.
- The basic `encrypt('aes-256-cbc', ...)` example without an IV is technically valid in ClickHouse (IV defaults to empty/zero) but is cryptographically weak; the post's later examples and best-practices section appropriately demonstrate IV usage with GCM.
- Using SHA256 of plaintext for searchable indexing is vulnerable to dictionary/rainbow-table attacks for low-entropy values; HMAC-SHA256 with a secret key would be more robust. The post's approach is a common pattern but readers should be aware of this trade-off.
- `aes_encrypt_mysql` does not support GCM modes (only ECB/CBC/OFB/CFB128), but the post does not claim otherwise.
