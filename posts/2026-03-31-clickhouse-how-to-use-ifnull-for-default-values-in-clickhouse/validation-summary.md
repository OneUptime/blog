# Validation Summary: How to Use ifNull() for Default Values in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse Nullable types
- ClickHouse conditional functions (`ifNull`, `isNull`, `if`, `COALESCE`)
- ClickHouse MergeTree engine
- ClickHouse date/time functions (`toDate`, `toDateTime`, `today`)

## Sources Consulted
- ClickHouse official docs — Functions for Working with Nullable Values: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse official docs — `ifNull`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#ifnull
- ClickHouse official docs — `coalesce`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#coalesce
- ClickHouse official docs — `isNull`: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#isnull
- ClickHouse official docs — Nullable data type: https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse official docs — Aggregate functions (`sum`, `avg`, NULL handling): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- ClickHouse official docs — MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
No technical issues found.

- `ifNull(x, alt)` signature and semantics correctly stated (returns x if not NULL, otherwise alt).
- Equivalence with two-argument `COALESCE` is accurate.
- CREATE TABLE / MergeTree syntax, Nullable types, and INSERT VALUES statements are valid.
- Claim that aggregate functions such as `sum()` and `avg()` skip NULL values by default is consistent with ClickHouse (and standard SQL) behavior.
- `isNull`, `toDate`, `toDateTime`, `today` usages are all valid ClickHouse functions.
- Nested `ifNull` chaining and equivalence with `if(isNull(...), default, value)` are correct.

## Review Notes
- In the "Dashboard-Ready Queries" example, the `WHERE date >= today() - 30` clause references the SELECT alias `date`. ClickHouse permits this due to its alias resolution behavior (depending on `prefer_column_name_to_alias`), but readers on stricter SQL engines may need to repeat the expression. This is stylistic, not a technical error.
- `ifNull(sum(revenue), 0.0)` and `ifNull(count(DISTINCT user_id), 0)` in the dashboard query are defensive: `count()` never returns NULL, and `sum()` returns NULL only when all aggregated values are NULL. The wrappers are harmless and fine for dashboard normalization.
- No version-specific caveats; `ifNull`, `COALESCE`, `isNull`, and Nullable semantics have been stable across modern ClickHouse releases.
