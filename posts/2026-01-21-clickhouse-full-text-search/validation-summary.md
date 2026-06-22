# Validation Summary: How to Implement Full-Text Search in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- MergeTree data skipping indexes
- ClickHouse text indexes
- `tokenbf_v1`
- `ngrambf_v1`
- Bloom filter indexes
- ClickHouse string search functions
- ClickHouse string splitting and extraction functions
- Materialized columns and materialized views

## Sources Consulted
- ClickHouse MergeTree table engine and skip index types: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse full-text search with text indexes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- ClickHouse data skipping index examples: https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse string search functions: https://clickhouse.com/docs/sql-reference/functions/string-search-functions
- ClickHouse string splitting functions: https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions
- ClickHouse CREATE VIEW and materialized view documentation: https://clickhouse.com/docs/sql-reference/statements/create/view

## Issues Found
- The post presented `tokenbf_v1` and `ngrambf_v1` as the main current full-text search approach. Updated the introduction, index sections, and conclusion to clarify that ClickHouse 26.2 and later generally recommend the `text` index for new full-text search workloads, while `tokenbf_v1` and `ngrambf_v1` are legacy Bloom-filter-based skip indexes.
- The text search options list skipped current `text` indexes and called `multiSearchAny` / `multiSearchFirstIndex` "full-text search functions." Added `text` indexes and changed that wording to "string search functions."
- The OR token-search example referred to `hasTokenAny`, which is not the documented function name, and used `hasAny(splitByChar(...))`, which does not demonstrate `tokenbf_v1`-accelerated token search. Replaced it with repeated `hasToken()` predicates joined by `OR`.
- The `multiSearchAllPositions` example said it counted occurrences and filtered with `length(...) > 0`. ClickHouse returns one position per needle and uses `0` for misses, so `length(...) > 0` is true for any non-empty needle list. Updated the comment and changed the filter to `arrayExists(pos -> pos > 0, ...)`.
- Added the documented caveat that `hasTokenCaseInsensitive` only benefits from `tokenbf_v1` pruning when the index is created on lowercased data.
- The comparison table implied `ngrambf_v1` provides fuzzy search. Changed this to "limited n-gram similarity functions" to avoid overstating Bloom filter index behavior.

## Review Notes
The examples are otherwise aligned with the documented ClickHouse SQL syntax for MergeTree indexes, string search functions, splitting functions, materialized columns, and materialized views. The post remains focused on Bloom-filter-based indexes for existing or legacy deployments; a future rewrite could add first-class `text` index examples with `hasAnyTokens`, `hasAllTokens`, and `hasPhrase`.
