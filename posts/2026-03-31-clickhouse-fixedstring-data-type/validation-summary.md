# Validation Summary: How to Use FixedString Data Type in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (FixedString data type, String data type, MergeTree engine, Memory engine)
- SQL DDL and DML
- Binary hash representations (MD5, SHA-256)
- String functions: `hex()`, `unhex()`, `length()`, `trimRight()`

## Sources Consulted
- ClickHouse FixedString documentation: https://clickhouse.com/docs/en/sql-reference/data-types/fixedstring
- ClickHouse String functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
The "Comparing FixedString Values" section was technically misleading:

1. **Equality-operator behavior was described incorrectly.** The original text claimed `WHERE code = 'A'` would "only match if stored as exactly 'A\0\0'", implying the equality operator was null-padding-sensitive. Per the ClickHouse docs, equality operators (`=`, `==`, `equals`) **ignore null-byte padding** when comparing FixedString to a shorter string literal — so `WHERE code = 'A'` correctly matches the row stored as `'A\0\0'` without any trimming. I rewrote this section to describe the actual behavior and contrasted it with `LIKE`, which **does** treat null bytes as significant characters (per official docs) and therefore requires them in the pattern.

2. **`trimRight(code) = 'A'` did not actually trim null bytes.** ClickHouse's `trimRight(s)` defaults to removing ASCII whitespace (space, tab, LF, CR, etc.); null byte (0x00) is a control character and is not whitespace. The correct form uses the optional `trim_characters` argument: `trimRight(code, '\0')`. I updated the example accordingly.

## Review Notes
- The SQL DDL for the `file_checksums` and `audit_log` tables is syntactically valid and idiomatic ClickHouse.
- The hex padding examples (`'410000'`, `'414200'`, `'414243'`) are correct (ASCII 'A' = 0x41, 'B' = 0x42, 'C' = 0x43).
- MD5 = 16 raw bytes / 32 hex chars and SHA-256 = 32 raw bytes / 64 hex chars — the post's `FixedString(16)` and `FixedString(32)` for raw hash storage are correct. The later `audit_log` example uses `FixedString(32)` for "32-char hex MD5" representation, which is also correct.
- `length()` always returning N for FixedString(N) and `empty()` returning 1 when the value is only null bytes is a useful nuance that could be mentioned in a future revision but is not an error in the current post.
- `LowCardinality(String)` usage in the `audit_log` example is appropriate for low-cardinality discrete strings like `entity_type`.
