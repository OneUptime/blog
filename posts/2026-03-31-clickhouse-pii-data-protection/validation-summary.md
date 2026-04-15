# Validation Summary: How to Implement PII Data Protection in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, system tables)
- ClickHouse access control (roles, column-level grants)
- ClickHouse encryption functions (`encrypt` with aes-256-gcm)
- ClickHouse TTL (time-to-live) for data retention
- ClickHouse mutations (`ALTER TABLE DELETE`, `ALTER TABLE UPDATE`)
- ClickHouse system tables (`system.columns`, `system.query_log`)
- GDPR / CCPA compliance concepts (PII masking, right to erasure, audit logging)

## Sources Consulted
- ClickHouse encryption functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/encryption-functions
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse access control and account management: https://clickhouse.com/docs/en/operations/access-rights
- ClickHouse TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse string functions (splitByChar, arraySlice, arrayStringConcat): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse hash functions (SHA256): https://clickhouse.com/docs/en/sql-reference/functions/hash-functions

## Issues Found

1. **Incorrect key/IV lengths in Right to Erasure section**: The `encrypt()` calls in the GDPR erasure example used `'key'` (3 bytes) and `'iv'` (2 bytes) as placeholder arguments. ClickHouse's `aes-256-gcm` mode requires a 32-byte key and a 16-byte IV; these undersized placeholders would cause a runtime error. Fixed by replacing them with the same properly-sized placeholders (`'your_32_byte_encryption_key_here'` and `'your_16byte_iv__'`) used in the earlier encryption section.

2. **Incorrect table name filter in audit logging query**: The query used `has(tables, 'user_profiles')`, but ClickHouse's `system.query_log` stores fully qualified table names in the format `database.table`. The filter would never match. Fixed to `has(tables, 'analytics_db.user_profiles')`.

## Review Notes
- ClickHouse's `encrypt()` function uses a 16-byte IV for all modes including GCM, which differs from the standard 12-byte nonce recommendation for AES-GCM. The blog post's 16-byte IV placeholder is correct for ClickHouse's implementation.
- The post correctly notes that `ALTER TABLE DELETE` and `ALTER TABLE UPDATE` are asynchronous mutations in ClickHouse. For production GDPR erasure workflows, users should be aware they may want to use `OPTIMIZE TABLE ... FINAL` after mutations to ensure physical deletion, or check `system.mutations` for completion status.
- The email masking approach (`splitByChar('@', email)[2]`) is a reasonable pseudonymization technique, though it still reveals the email domain which could be considered quasi-identifying information in some contexts.
- All ClickHouse functions used (splitByChar, arraySlice, arrayStringConcat, SHA256, hex, encrypt, has) are verified to exist and are used with correct signatures.
