# Validation Summary: How to Use murmurHash3_32() and murmurHash3_128() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- MurmurHash3 hash functions (`murmurHash3_32`, `murmurHash3_128`)
- ClickHouse aggregate functions (`stddevPop`, `avg`, `min`, `max`, `count`)
- ClickHouse date functions (`toYYYYMM`, `toDate`)
- ClickHouse MergeTree engine with MATERIALIZED columns

## Sources Consulted
- ClickHouse Hash Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse stddevPop aggregate function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevpop
- ClickHouse Date and Time Functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse Custom Partitioning Key documentation (confirms toYYYYMM usage): https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse SQL Syntax documentation (alias scope): https://clickhouse.com/docs/en/sql-reference/syntax
- ClickHouse CREATE TABLE documentation (MATERIALIZED columns): https://clickhouse.com/docs/en/sql-reference/statements/create/table

## Issues Found
No technical issues found.

## Review Notes
- The comment "Sample exactly 10% of users" on the hash-based sampling example is technically approximate rather than exact, since hash modulo doesn't guarantee a perfectly uniform split. However, this is a common and accepted phrasing in practice, and the technique is correct.
- The deduplication example wraps arguments in `toString()` before passing to `murmurHash3_128`. This is not strictly necessary since both hash functions accept arguments of any type per the documentation. However, it is not incorrect and can serve as a defensive practice to ensure consistent string representation before hashing.
- ClickHouse aliases are global within a query, which makes the `WHERE changed = 1` pattern in the Row Fingerprinting section valid — this is a ClickHouse-specific extension to standard SQL behavior.
