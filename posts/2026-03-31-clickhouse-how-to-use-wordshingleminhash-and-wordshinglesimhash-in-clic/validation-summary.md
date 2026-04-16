# Validation Summary: How to Use wordShingleMinHash() and wordShingleSimHash() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse (SQL functions for locality-sensitive hashing)
- `wordShingleSimHash` family of functions (SimHash over word shingles)
- `wordShingleMinHash` family of functions (MinHash over word shingles)
- `bitHammingDistance` / `tupleHammingDistance`
- MergeTree engine and materialized columns

## Sources Consulted
- ClickHouse official docs — hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse official docs — tupleHammingDistance and bitHammingDistance reference pages

## Issues Found
1. **Incorrect description of `wordShingleMinHash` return type.** The post described the return as "a tuple of UInt64 values" and later stated that "MinHash with 20 hash functions gives a reasonable Jaccard estimate by counting matching hash values across the tuple components." In reality, `wordShingleMinHash` always returns `Tuple(UInt64, UInt64)` — two aggregated values (min hash, max hash). The `hash_count` (aka `hashnum`) parameter controls how many internal min/max hashes are considered before being aggregated into the two returned values; it does not change the output tuple size. Updated the signature description and the "MinHash Jaccard Similarity" section (renamed to "MinHash Similarity with tupleHammingDistance") to reflect this accurately.
2. **Missing comparison function for MinHash.** The original MinHash example simply selected two hashes without showing how to compare them. Since MinHash results are tuples (not single UInt64s), `bitHammingDistance` is not applicable — `tupleHammingDistance` is the correct function. Updated examples and the summary to use `tupleHammingDistance` for MinHash comparisons.
3. **Summary updated** to reflect the correct return types (`UInt64` for SimHash, `Tuple(UInt64, UInt64)` for MinHash) and the correct comparison functions.

## Review Notes
- The `wordShingleSimHash(string[, shinglesize])` signature used in examples is correct; `shinglesize` defaults to 3 when omitted.
- The `CREATE TABLE ... MATERIALIZED wordShingleSimHash(body)` example is valid ClickHouse syntax.
- The case-insensitive and UTF-8 variants (`wordShingleSimHashCaseInsensitive`, `wordShingleSimHashCaseInsensitiveUTF8`, `wordShingleMinHashCaseInsensitive`) all exist in ClickHouse.
- The Hamming distance thresholds suggested (under 5, <= 4, <= 6) are reasonable heuristics for 64-bit SimHash near-duplicate detection; the exact threshold depends on the dataset.
- Cross-joining articles with `CROSS JOIN` + `bitHammingDistance` filter is correct syntactically but O(n²) in rows — a caveat worth noting for large tables, though outside the scope of technical correctness.
