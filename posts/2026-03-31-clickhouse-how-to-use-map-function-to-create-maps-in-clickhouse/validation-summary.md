# Validation Summary: How to Use map() Function to Create Maps in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse `Map(K, V)` data type
- ClickHouse tuple/map functions: `map()`, `mapKeys()`, `mapValues()`, `mapContains()`, `mapUpdate()`, `arrayZip`, `CAST`

## Sources Consulted
- ClickHouse Tuple/Map functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse `Map` data type reference: https://clickhouse.com/docs/en/sql-reference/data-types/map

## Issues Found
- In the "Accessing Map Values" section, the intro sentence read "Use bracket notation or `mapContains()` to access map values". This was misleading because `mapContains()` checks key existence and does not return the value. Updated to "Use bracket notation to access map values:" which matches the code example that follows. `mapContains()` is already covered later in its own section.

## Review Notes
- `map()` syntax `map(k1, v1, k2, v2, ...)` verified against official docs.
- Missing-key bracket access returning the value type's default (e.g. `0` for integers, `''` for strings) is explicitly documented.
- `mapUpdate(map1, map2)` behavior verified — values in `map2` overwrite `map1` for matching keys, and new keys from `map2` are added.
- `mapContains` is an accepted alias of `mapContainsKey` in current ClickHouse; using `mapContains` in the post is still valid.
- Building a Map from two parallel arrays via `CAST(arrayZip(...), 'Map(...)')` is a supported, documented pattern.
- Map literal insert syntax `{'k': 'v'}` in `INSERT INTO ... VALUES` is correct for `Map(String, String)` and `Map(String, UInt64)` columns.
