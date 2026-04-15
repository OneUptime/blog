# Validation Summary: How to Use quantiles() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions, SQL dialect)
- `quantiles()` and its variants (`quantilesExact`, `quantilesTDigest`)
- `-State` and `-Merge` aggregate function combinators
- `AggregatingMergeTree` engine

## Sources Consulted
- ClickHouse official documentation on `quantiles` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse official documentation on `quantile` aggregate function: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official documentation on `AggregateFunction` data type: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse official documentation on aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation on `AggregatingMergeTree` engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree

## Issues Found
No technical issues found.

## Review Notes
- The "Accessing Individual Elements" and "SLO Dashboard Query" sections call `quantiles()` multiple times in the same SELECT (once per extracted element). This is technically correct and produces accurate results, but each call is a separate aggregate computation. The post already demonstrates the more efficient subquery pattern in the "Expanding the Array into Named Columns" section, so the progression from simple to optimal is reasonable for a tutorial.
- The default `quantiles()` function uses reservoir sampling (approximate). The post correctly notes the `quantilesExact` variant for exact results and `quantilesTDigest` for better tail accuracy, which is good guidance for readers choosing between variants.
- All SQL syntax, function names, array indexing, combinator patterns, and `AggregatingMergeTree` DDL are correct and consistent with current ClickHouse documentation.
