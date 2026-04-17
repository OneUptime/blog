# Validation Summary: Why You Should Avoid String Primary Keys in ClickHouse

## Status
validated

## Post Type
Guide / Best-practices article

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse data types: String, FixedString, UInt32, UInt64, UInt128, UUID, DateTime
- ClickHouse system tables (`system.parts`)
- ClickHouse functions (`formatReadableSize`)

## Sources Consulted
- MergeTree engine docs — https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- UUID data type — https://clickhouse.com/docs/sql-reference/data-types/uuid
- String data type — https://clickhouse.com/docs/sql-reference/data-types/string
- `system.parts` reference — https://clickhouse.com/docs/operations/system-tables/parts
- Other functions (`formatReadableSize`) — https://clickhouse.com/docs/sql-reference/functions/other-functions

## Issues Found
- **Incorrect lexicographic ordering example.** The post claimed `'9' > '10' > '100'` under lexicographic comparison, which is not transitively correct. Byte-wise, `'1' (0x31) < '0' (0x30)`... actually `'9' (0x39) > '1' (0x31)` so `'9'` beats any `'1…'` string, but between `'10'` and `'100'` the shared prefix `"10"` is followed by no more bytes in `'10'` versus a trailing `'0'` in `'100'`, so `'100' > '10'`. Corrected the comment to `'9' > '100' > '10'` to accurately illustrate the lexicographic vs numeric mismatch.

## Review Notes
- The "Preferred Alternatives" section's comment says "Use FixedString or UInt128 for UUIDs" but the code example uses the native `UUID` type. This is not incorrect (UUID is the most natural 16-byte choice, and FixedString(16)/UInt128 are valid alternatives), so it was left as written.
- Claim that the primary index is "loaded into RAM at query start" is essentially correct; ClickHouse does have a `primary_key_lazy_load` setting (since 24.x) that defers loading until first use, but the default behavior matches the post's description.
- All verified technical claims (granule size 8192, UUID = 16 bytes, `primary_key_bytes_in_memory` column, `formatReadableSize` function) are accurate as of ClickHouse current stable releases.
