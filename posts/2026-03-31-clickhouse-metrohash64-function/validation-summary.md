# Validation Summary: How to Use metroHash64() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytics database)
- metroHash64() hash function
- Other ClickHouse hash functions: cityHash64, xxHash64, farmHash64
- MergeTree engine with MATERIALIZED columns

## Sources Consulted
- ClickHouse official documentation on hash functions: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions
- ClickHouse SELECT query documentation (execution order of clauses): https://clickhouse.com/docs/en/sql-reference/statements/select
- MetroHash algorithm homepage: http://www.jandrewrogers.com/2015/05/27/metrohash/

## Issues Found
1. **WHERE clause referencing SELECT alias (line 60)**: The change detection query defined `changed` as a SELECT alias and then used `WHERE changed = 1` to filter rows. In ClickHouse, the WHERE clause is evaluated before SELECT aliases are resolved, so referencing a SELECT alias in WHERE is invalid and would produce an error. Fixed by inlining the expression directly in the WHERE clause: `WHERE metroHash64(a.raw_value) != metroHash64(b.processed_value)`, and removing the now-redundant `changed` alias from the SELECT list.

## Review Notes
- All `metroHash64()` function claims are accurate: it exists in ClickHouse, returns UInt64, accepts multiple arguments of any type, and implements the MetroHash algorithm.
- The comparison query with cityHash64, xxHash64, and farmHash64 is correct. All four are valid ClickHouse hash functions returning UInt64.
- The MATERIALIZED column syntax is correct and follows ClickHouse conventions.
- The bucketing, sampling, and fingerprinting patterns are all standard and correct uses of hash functions in ClickHouse.
