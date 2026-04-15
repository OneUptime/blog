# Validation Summary: How to Use MD5() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, materialized columns)
- MD5 hash function
- SHA1 and SHA256 hash functions (comparison)
- `hex()` encoding function

## Sources Consulted
- ClickHouse Hash Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse Encoding Functions documentation (hex()): https://clickhouse.com/docs/en/sql-reference/functions/encoding-functions
- ClickHouse String Functions documentation (lower()): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found

1. **Incorrect claim about hex() output case (line 23):** The post stated that `hex(MD5(...))` produces a "lowercase hexadecimal string" identical to `md5sum` output. ClickHouse's `hex()` function explicitly returns **uppercase** hexadecimal (A-F), as documented in the encoding functions reference. Fixed the description to state it produces uppercase hex and recommend `lower(hex(MD5(...)))` for case-matched comparisons with external tools.

2. **Legacy checksum comparison would fail due to case mismatch (lines 44-52):** The checksum verification example compared `expected_md5 = hex(MD5(file_content))` directly. Since most external tools (md5sum, etc.) produce lowercase checksums and `hex()` returns uppercase, this comparison would return false even for matching content. Fixed by wrapping with `lower()`: `expected_md5 = lower(hex(MD5(file_content)))`.

## Review Notes
- All SQL syntax is correct for ClickHouse.
- The `MD5()` return type (`FixedString(16)`) is accurately stated.
- The `MATERIALIZED` column syntax is correct.
- `SHA1()` and `SHA256()` function names and their output sizes (40-char and 64-char hex respectively) are accurate.
- The security caveats about MD5 not being suitable for cryptographic purposes are appropriate and accurate.
- The `GROUP BY msg_hash` using an alias in the deduplication example is valid in ClickHouse (ClickHouse supports referencing SELECT aliases in GROUP BY).
