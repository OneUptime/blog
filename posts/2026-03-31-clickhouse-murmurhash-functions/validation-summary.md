# Validation Summary: How to Use murmurHash2_32() and murmurHash2_64() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- MurmurHash2 hash functions (`murmurHash2_32`, `murmurHash2_64`)
- ClickHouse MergeTree engine
- ClickHouse MATERIALIZED columns

## Sources Consulted
- ClickHouse official documentation — Hash Functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse official documentation — CREATE TABLE: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse official documentation — Date/Time Functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- All function names (`murmurHash2_32`, `murmurHash2_64`) are correct and match official ClickHouse documentation.
- The documentation confirms both functions accept a variable number of arguments of Any type, matching the blog's claims and multi-argument examples.
- Return types are correctly stated: UInt32 for `murmurHash2_32` and UInt64 for `murmurHash2_64`.
- All SQL syntax (SELECT, CASE, GROUP BY, CREATE TABLE, MATERIALIZED, PARTITION BY, ORDER BY) is valid ClickHouse SQL.
- The MATERIALIZED column example stores a UInt64 expression (`murmurHash2_64(...) % 4`) in a UInt8 column. ClickHouse performs an implicit narrowing conversion here. Since `% 4` always yields values 0-3, this is safe in practice. An explicit `toUInt8()` cast would be more defensive but is not strictly required.
- The characterization of MurmurHash2 as non-cryptographic is correct — it is a fast hash designed for hash tables and data distribution, not security.
- The modulo-based approach for A/B test assignment and sharding is a well-established industry pattern and is correctly demonstrated.
- The term "seed" when referring to the experiment name as a second argument is slightly informal (it is technically a second hashed input, not a seed in the PRNG sense), but the explanation of how it works is functionally accurate and clear.
