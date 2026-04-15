# Validation Summary: How to Use sumCount() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse aggregate functions (`sumCount`, `sumCountState`, `sumCountMerge`)
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- [sumCount | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/sumcount)
- [Aggregate Function Combinators | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators)
- [numbers Table Function | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/table-functions/numbers)
- [Tuple Data Type | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/tuple)
- [AggregateFunction Type | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction)

## Issues Found

1. **Incorrect terminology "combiners" instead of "combinators"**: The post referred to the `-State` / `-Merge` aggregate function combinators as "combiners". The official ClickHouse documentation consistently uses the term "combinators". Fixed to "combinators".

2. **Nested aggregate functions in Cross-Day Weighted Average query**: The query wrapped `sumCountMerge(sc_state).1` inside `sum()`, i.e., `sum(sumCountMerge(sc_state).1)`. ClickHouse prohibits nesting aggregate functions and this would produce an `ILLEGAL_AGGREGATION` error at query time. Fixed by removing the outer `sum()` calls and using `sumCountMerge(sc_state).1` and `.2` directly, which correctly merges all partial states for each day group. Updated the accompanying explanation text accordingly.

## Review Notes
- The basic examples (`numbers(5)` producing sum=10, count=5) and the practical table example (server latency calculations) are arithmetically correct.
- The weighted average math in the problem statement section is correct: `(100*1000 + 200*10) / 1010 = ~101ms`.
- The `AggregateFunction(sumCount, UInt32)` type declaration and the materialized view pattern are correct and follow standard ClickHouse practices.
- The comparison section correctly demonstrates the pitfall of averaging averages vs. using sumCount for correct rollups.
