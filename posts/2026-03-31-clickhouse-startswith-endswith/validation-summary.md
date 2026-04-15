# Validation Summary: How to Use startsWith() and endsWith() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse string functions: `startsWith()`, `endsWith()`, `lower()`
- ClickHouse aggregate functions: `countIf()`, `sum()`, `count()`
- ClickHouse data skipping indexes (bloom filter, token bloom filter, n-gram bloom filter)

## Sources Consulted
- ClickHouse official documentation — String Functions: https://clickhouse.com/docs/en/sql-reference/functions/string-functions (`startsWith`, `endsWith`, `lower` signatures and return types)
- ClickHouse official documentation — String Search Functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse official documentation — Data Skipping Indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#available-types-of-indices (which index types support which functions)
- ClickHouse official documentation — Aggregate Function Combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse official documentation — Comparison Functions (equals): https://clickhouse.com/docs/en/sql-reference/functions/comparison-functions

## Issues Found
1. **Inaccurate skipping index claim (intro paragraph):** The post originally stated that both `startsWith` and `endsWith` "can sometimes leverage bloom filter or token bloom filter skipping indexes." According to ClickHouse documentation, `endsWith()` is NOT supported by bloom_filter indexes — only `startsWith()` is. Both functions are supported by tokenbf_v1 (token bloom filter) and ngrambf_v1 (n-gram bloom filter). Fixed the sentence to accurately describe which index types support each function.

## Review Notes
- The post recommends wrapping both sides in `lower()` for case-insensitive matching. This is technically correct for ASCII data, but `lower()` only handles ASCII characters. For proper UTF-8 case folding, `lowerUTF8()` should be used instead. Additionally, ClickHouse provides dedicated `startsWithCaseInsensitive()` and `endsWithCaseInsensitive()` functions (available since recent versions) which are a cleaner alternative. This is not an error in the current post but could be mentioned in a future update.
- All SQL examples are syntactically correct and use valid ClickHouse patterns (`countIf`, `sum` on UInt8 results, `CASE` expressions, `count()` without arguments, `today()` function).
- The return type claims (UInt8, returning 1 or 0) are confirmed by official documentation.
- The case-sensitivity claim is confirmed by the existence of separate `startsWithCaseInsensitive()`/`endsWithCaseInsensitive()` variants in the docs.
