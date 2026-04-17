# Validation Summary: How to Design a Star Schema in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, dictionaries, SQL)
- Star schema data modeling (fact tables, dimension tables)
- SQL (DDL and analytical queries)

## Sources Consulted
- ClickHouse Type Conversion Functions: https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions
- ClickHouse Boolean Data Type: https://clickhouse.com/docs/en/sql-reference/data-types/boolean
- ClickHouse CREATE DICTIONARY: https://clickhouse.com/docs/en/sql-reference/statements/create/dictionary
- ClickHouse Dictionary Functions (dictGet): https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions
- ClickHouse MergeTree / PARTITION BY: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree

## Issues Found
- **`PARTITION BY toYYYYMM(toDate(toString(date_key)))`** — `toDate()` on a string officially supports only `YYYY-MM-DD` and `YYYY-MM-DD hh:mm:ss` formats; the compact `YYYYMMDD` form is handled by `parseDateTimeBestEffort`, not `toDate` by contract. Additionally, direct numeric cast `toDate(20250101)` treats the value as a Unix timestamp (since it's ≥ 65536), which would produce a wildly wrong date. Replaced with `PARTITION BY intDiv(date_key, 100)`, which cleanly yields a `YYYYMM` integer partition key from a `YYYYMMDD` integer without any date-parsing ambiguity.

## Review Notes
- The `Bool` data type is valid in ClickHouse (stabilized in 22.6, June 2022). Older clusters would need `UInt8` instead, but this is not a concern on any currently supported version.
- The `CREATE DICTIONARY` syntax, `SOURCE(CLICKHOUSE(...))`, `LAYOUT(HASHED())`, `LIFETIME(3600)`, and `dictGet('dict', 'attr', key)` call are all consistent with current ClickHouse documentation.
- The dictionary key type (`UInt32 product_id`) matches the column type passed to `dictGet`, so no explicit cast is required in the example query.
- Star schema vs. wide table trade-offs described in the post match ClickHouse community guidance — wide/denormalized tables remain the default recommendation for pure analytical performance, with star schemas viable when dimension reuse or storage efficiency matters.
