# Validation Summary: How to Track User Acquisition Channels in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate combinators, URL functions)
- UTM parameter tracking and marketing attribution modeling

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse documentation: extractURLParameter function (https://clickhouse.com/docs/en/sql-reference/functions/url-functions)
- ClickHouse documentation: Aggregate function combinators (-If suffix) (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators)
- ClickHouse documentation: countDistinct alias for uniqExact (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/countdistinct)
- ClickHouse documentation: quantile parametric aggregate function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile)
- ClickHouse documentation: dateDiff function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff)
- ClickHouse documentation: toMonday function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tomonday)
- ClickHouse documentation: LowCardinality data type (https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality)

## Issues Found
No technical issues found.

## Review Notes
- The introduction mentions both "first-touch and last-touch models" but only first-touch attribution is demonstrated in the queries. A future revision could add a last-touch attribution example for completeness.
- The `countDistinctIf` usage is valid but less common than `uniqExactIf` in ClickHouse-native code. Both work identically; `countDistinct` is an alias for `uniqExact` and the `-If` combinator applies to all aggregate functions.
- All queries use ClickHouse-specific features correctly: parametric aggregate functions (`quantile(0.50)(...)`), date arithmetic (`today() - 90`), `LowCardinality` optimization, and alias references in `GROUP BY`.
