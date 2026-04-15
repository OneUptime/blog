# Validation Summary: How to Optimize LIKE and Regex Queries in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, skip indexes)
- `tokenbf_v1` and `ngrambf_v1` bloom filter skip indexes
- `hasToken()`, `multiSearchAny()`, `multiMatchAny()`, `match()` string search functions
- `bloom_filter` skip index
- `MATERIALIZED` columns with `extract()` regex extraction

## Sources Consulted
- ClickHouse MergeTree data skipping indexes documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse string search functions documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse `hasToken` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#hastoken
- ClickHouse `multiMatchAny` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#multimatchany
- ClickHouse `multiSearchAny` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#multisearchany
- ClickHouse string functions (`extract`/`regexpExtract`): https://clickhouse.com/docs/en/sql-reference/functions/string-functions#extract

## Issues Found

1. **`multiMatchAny` used instead of `multiSearchAny` for plain substring matching**: The post recommended `multiMatchAny` with literal substring patterns and claimed it uses "Aho-Corasick matching in a single pass." The ClickHouse documentation does not mention Aho-Corasick for this function, and explicitly states that `multiSearchAny` should be used instead for substring searches as it is "much faster." Changed the function to `multiSearchAny` and corrected the description. Added a note that `multiMatchAny` is available when regex patterns are needed.

2. **`extract()` regex did not match the subsequent WHERE clause**: The original regex `'Exception: (\\w+)'` captures the word *after* "Exception: " (e.g., from "NullPointerException: something" it would capture "something"), but the WHERE clause checked `error_class = 'NullPointerException'`. Changed the regex to `'(\\w+Exception)'` so it correctly captures the exception class name, matching the intended query.

3. **Misleading explanation for left-anchored regex optimization**: The post claimed left-anchored regex (`^prefix`) is faster because "ClickHouse can skip granules where the minimum value does not match the prefix." This granule-skipping behavior only applies to primary key columns, and `log_line` is not specified as a key column. The actual speedup for non-key columns comes from the regex engine only needing to test at the start of each string value. Corrected the explanation accordingly.

## Review Notes
- `tokenbf_v1` and `ngrambf_v1` are deprecated since ClickHouse 26.2 in favor of the new `text` index type. The indexes still work but users starting new projects should consider using the `text` index instead. This was not changed in the post since the indexes remain functional and the post predates the deprecation announcement.
- The `extract()` function may appear as `regexpExtract()` in newer ClickHouse documentation. Both names should work, with `extract` being the older alias.
- The `tokenbf_v1` index parameters (32768, 3, 0) are reasonable defaults. The first parameter is confirmed to be bloom filter size in bytes per the official documentation.
- All SQL syntax (ALTER TABLE ADD INDEX, ALTER TABLE MATERIALIZE INDEX, ALTER TABLE ADD COLUMN MATERIALIZED) is correct for ClickHouse's MergeTree engine.
