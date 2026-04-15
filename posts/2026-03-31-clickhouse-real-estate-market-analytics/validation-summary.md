# Validation Summary: How to Use ClickHouse for Real Estate Market Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, partitioning, columnar storage)
- SQL (CTEs, JOINs, aggregate functions, HAVING)
- ClickHouse-specific functions: `toYYYYMM()`, `toStartOfMonth()`, `toYear()`, `today()`, `median()`, `round()`
- ClickHouse data types: `LowCardinality(String)`, `Decimal`, `UInt*`, `Float*`, `Date`

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types reference: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse aggregate functions (median/quantile): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/median
- ClickHouse date functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
No technical issues found.

## Review Notes
- The `median()` function is an alias for `quantile(0.5)` in ClickHouse, which is correctly used throughout the post.
- The Investment Return Analysis query joins property_transactions with rental_listings, which can produce a many-to-many join within each (neighborhood, bedrooms) group. This is a data modeling consideration rather than a syntax error — in production, one might use subqueries to pre-aggregate each table before joining.
- Date arithmetic like `today() - 365` is valid but doesn't account for leap years. Using `today() - INTERVAL 1 YEAR` would be more precise, though both are common patterns.
- Division operations (e.g., `sale_price / square_footage`, `sale_price / list_price`) could encounter division-by-zero with bad data, but this is a data quality concern, not a code error.
