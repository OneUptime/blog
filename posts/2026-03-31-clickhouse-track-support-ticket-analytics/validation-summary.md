# Validation Summary: How to Track Support Ticket Analytics in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (MergeTree engine, SQL dialect)
- SQL (DDL and analytical queries)
- Support ticket analytics (SLA compliance, CSAT, resolution times)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- ClickHouse documentation: Data types — DateTime, Nullable, LowCardinality, UInt8, UInt64 (https://clickhouse.com/docs/en/sql-reference/data-types)
- ClickHouse documentation: dateDiff function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff)
- ClickHouse documentation: quantile function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile)
- ClickHouse documentation: countIf function (https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if)
- ClickHouse documentation: toYYYYMM, toDate, toStartOfMonth functions (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions)
- ClickHouse documentation: Column alias visibility in SELECT (https://clickhouse.com/docs/en/sql-reference/statements/select)

## Issues Found
No technical issues found.

## Review Notes
- The `first_response` column is defined as non-nullable `DateTime`, which means tickets that have not yet received a first response cannot be naturally represented (they would default to `1970-01-01 00:00:00`). Making it `Nullable(DateTime)` and adding an `IS NOT NULL` filter in the SLA query would be more robust in practice, but this is a schema design consideration rather than a technical error.
- The SLA compliance query uses alias references (`within_sla`, `total`) within the same SELECT clause. This is valid in ClickHouse but would not work in most other SQL databases — worth noting for readers who may try to adapt these queries elsewhere.
- All aggregate functions correctly handle Nullable columns: `avg()`, `quantile()`, and `countIf()` skip NULL values as expected in ClickHouse.
