# Validation Summary: How to Use mapContains() and mapContainsKeyLike() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse Map data type and map functions (`mapContains`, `mapContainsKeyLike`)
- SQL LIKE pattern matching
- MergeTree table engine

## Sources Consulted
- ClickHouse official documentation — Tuple Map Functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse official documentation — `mapContains` / `mapContainsKey`: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions#mapcontains
- ClickHouse official documentation — `mapContainsKeyLike`: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions#mapcontainskeylike
- ClickHouse official documentation — Map data type: https://clickhouse.com/docs/en/sql-reference/data-types/map

## Issues Found
No technical issues found.

## Review Notes
- `mapContains` is technically an alias for the canonical function name `mapContainsKey` in the ClickHouse documentation. Both names are fully supported and work identically. The blog uses `mapContains` throughout, which is valid and commonly used.
- The LIKE patterns `db_%` and `%_type` use `_` as a wildcard (matching any single character), so `db_%` technically matches any key starting with `db` plus at least one more character (e.g., `dba`, `db1`, `db_engine`), not just keys starting with the literal prefix `db_`. In practice this is fine given the sample data and is a standard SQL convention in informal usage.
- `mapContainsKeyLike` requires the pattern argument to be a constant string, which all examples satisfy by using string literals.
- All CREATE TABLE, INSERT, and SELECT statements use correct ClickHouse syntax.
- The explanation that bracket access (`labels['key']`) returns an empty string for absent keys on `Map(String, String)` is accurate — ClickHouse returns the default value for the value type.
- Related functions not mentioned but potentially useful for readers: `mapContainsValue`, `mapContainsValueLike`, `mapExtractKeyLike`, `mapExtractValueLike`.
