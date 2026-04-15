# Validation Summary: How to Use mapKeys() and mapValues() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- Map data type and map functions (`mapKeys`, `mapValues`, `mapContains`, `map` constructor)
- Array functions (`arraySum`, `arraySort`, `arrayStringConcat`, `arrayJoin`, `arrayZip`, `has`, `length`)
- `ARRAY JOIN` clause

## Sources Consulted
- ClickHouse official documentation — Map functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse official documentation — Array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — arrayJoin: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse official documentation — String splitting/merging functions (arrayStringConcat): https://clickhouse.com/docs/en/sql-reference/functions/splitting-merging-functions

## Issues Found
- **Double `arrayJoin` Cartesian product issue (Section: Aggregating Value Totals per Key)**: The original post presented a query using two separate `arrayJoin()` calls on `mapKeys(flags)` and `mapValues(flags)` in the same SELECT as a working solution. In ClickHouse, multiple `arrayJoin()` calls in the same SELECT produce a Cartesian product of the arrays, meaning keys and values are not paired correctly and the query returns wrong results. The post included a note warning about this and provided the correct `ARRAY JOIN arrayZip(...)` approach, but the framing implied the first query was functional. Fixed by clearly labeling the first query as incorrect with a `-- INCORRECT` comment and rewriting the surrounding text to explain the Cartesian product issue upfront, making the `arrayZip` approach the recommended solution.

## Review Notes
- The `mapContains()` function mentioned in the post is technically an alias for `mapContainsKey()` in current ClickHouse versions. Both work, so no change needed, but worth noting.
- The `mapContains()`/`has(mapKeys(...))` equivalence noted in the post is semantically correct, though `mapContains` is more efficient since it doesn't materialize the full key array. The post's framing as "equivalent" is acceptable for a tutorial context.
- All other code examples (`mapKeys`, `mapValues`, `map()` constructor, `arraySum`, `arraySort`, `arrayStringConcat`, `has`, `length`, `DISTINCT arrayJoin`, `ARRAY JOIN arrayZip`) are syntactically correct and produce the described results.
- The section "Converting Map Values to a Comma-Separated String" title mentions "Map Values" but the code operates on map keys (`mapKeys`). The body text correctly describes it as working with keys, so this is a minor naming inconsistency but not a technical error in the code itself.
