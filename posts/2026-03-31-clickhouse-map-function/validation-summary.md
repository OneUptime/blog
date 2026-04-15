# Validation Summary: How to Use map() to Create Maps in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- ClickHouse `map()` function
- ClickHouse `Map(K, V)` data type
- Related functions: `mapKeys()`, `mapValues()`, `mapContains()`

## Sources Consulted
- ClickHouse official docs — Tuple Map Functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse official docs — Map Data Type: https://clickhouse.com/docs/en/sql-reference/data-types/map

## Issues Found
No technical issues found.

## Review Notes
- The `mapContains()` function referenced in the summary is technically an alias for `mapContainsKey()` in current ClickHouse versions. Both names work, so this is not an error, but readers looking at the official docs will find the canonical name is `mapContainsKey`.
- In the "Using Maps with Numeric Values" section, user 103 only has two keys (`accuracy` and `speed`) while the avg_score formula divides by 3 including `scores['consistency']`, which returns 0.0 for the missing key. The query is valid and the behavior is correctly explained earlier in the post (default values for missing keys), but readers should be aware the average will be lower than expected for rows with fewer keys. This is a pedagogical note, not a technical error.
- The `toString(event_type = 'purchase')` in the "Nested Map Access Pattern" section converts a UInt8 comparison result (0 or 1) to the strings '0' or '1', not 'true' or 'false'. This is correct ClickHouse behavior but may surprise readers coming from other SQL dialects.
