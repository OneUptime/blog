# Validation Summary: How to Use SHA1(), SHA224(), SHA256() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, MATERIALIZED columns, partitioning)
- SHA1, SHA224, SHA256 cryptographic hash functions
- ClickHouse functions: `SHA1()`, `SHA224()`, `SHA256()`, `hex()`, `groupArray()`, `arrayStringConcat()`, `toYYYYMM()`

## Sources Consulted
- ClickHouse Hash Functions documentation: https://clickhouse.com/docs/sql-reference/functions/hash-functions
- ClickHouse Custom Partitioning Key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse groupArray documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse Array Functions documentation (arrayStringConcat): https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse MATERIALIZED columns documentation: https://clickhouse.com/docs/sql-reference/statements/create/table

## Issues Found
1. **Batch checksum query used only the first row's hash instead of all rows.**
   - **What was wrong:** The query `hex(SHA256(groupArray(hex(SHA256(row_data)))[1]))` indexed into the array with `[1]`, which extracts only the first element. This means the "batch checksum" was just the SHA256 of a single row's hex hash, not a checksum over all rows in the batch as the comment described.
   - **What was changed:** Replaced `groupArray(hex(SHA256(row_data)))[1]` with `arrayStringConcat(groupArray(hex(SHA256(row_data))), '')` to concatenate all per-row hex hashes into a single string before computing the final SHA256, producing a true batch-level checksum.
   - **Why:** The original code did not fulfill its stated purpose. `arrayStringConcat` joins all array elements into one string, which SHA256 then hashes to produce a deterministic checksum that depends on all rows.

## Review Notes
- All function names (`SHA1`, `SHA224`, `SHA256`) are correctly capitalized and match ClickHouse's documented function signatures.
- Output sizes (FixedString(20), FixedString(28), FixedString(32)) are accurate.
- The security advice is sound: SHA1 collision resistance is broken (SHAttered attack, 2017), SHA224/SHA256 remain secure for integrity use cases, and the post correctly warns against using any of these for password storage.
- The MATERIALIZED column example is syntactically correct and is a good pattern for precomputing hashes at insert time.
- The batch checksum approach (even after the fix) produces an order-dependent hash. If row ordering within a batch matters, the query should include an `ORDER BY` inside the `groupArray` call (e.g., `groupArraySorted`) or the results should be sorted before concatenation. This is not an error per se, but worth noting for readers who need order-independent checksums.
