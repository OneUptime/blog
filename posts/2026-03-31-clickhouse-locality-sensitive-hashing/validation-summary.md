# Validation Summary: How to Implement Locality-Sensitive Hashing in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Locality-Sensitive Hashing (LSH)
- MinHash (`ngramMinHash`, `wordShingleMinHash`)
- SimHash (`ngramSimHash`)
- Hamming distance (`bitHammingDistance`)
- `cityHash64` for bucket hashing
- Bloom filter indexes

## Sources Consulted
- ClickHouse official documentation — Hash Functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse official documentation — Bit Functions: https://clickhouse.com/docs/en/sql-reference/functions/bit-functions
- ClickHouse official documentation — ALTER TABLE ADD COLUMN/INDEX: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse official documentation — Skipping Indexes (bloom_filter): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes

## Issues Found

1. **Incorrect return type for `ngramMinHash`** (line 25): The post stated the return type is `FixedString` encoding multiple hash bands. The actual return type is `Tuple(UInt64, UInt64)` containing minimum and maximum hash values. Fixed the description.

2. **Invalid `hashnum` parameter value** (line 20): The post used `ngramMinHash(content, 4, 128)` but the `hashnum` parameter has a valid range of 1–25 (default 6). The value 128 would cause an error. Changed to `ngramMinHash(content, 4, 6)`.

3. **Incorrect parameter documentation** (line 15): The post described the signature as `ngramMinHash(str, ngram_size, minhash_size)`. The actual parameter names are `string`, `ngramsize`, and `hashnum`. Updated the signature and added default/range information.

4. **Non-existent functions referenced** (line 29): The post mentioned `ngramMinHashArgMin` and `ngramMinHashArgMax` as enabling the similarity comparison in the following code block. These functions do not exist in ClickHouse (the actual function is `ngramMinHashArg`). Furthermore, the code block uses `ngramSimHash` + `bitHammingDistance`, not any ArgMin/ArgMax functions. Rewrote the introductory text to accurately describe the SimHash + Hamming distance approach used in the code.

## Review Notes
- The `ngramMinHashArg` function (which returns the actual n-grams with min/max hashes as `Tuple(Tuple(String), Tuple(String))`) could be a useful addition to the post in the future, but the current SimHash + Hamming distance approach is a valid and practical alternative for similarity scoring.
- The `wordShingleMinHash` usage with parameters `(content, 3, 6)` is correct — these match the documented defaults.
- The `cityHash64(wordShingleMinHash(...))` pattern to collapse a `Tuple(UInt64, UInt64)` into a single `UInt64` for bucketing is a valid approach.
- Using `bloom_filter` as a skipping index on the LSH bucket column is a reasonable choice for this use case.
