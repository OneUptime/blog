# Validation Summary: How to Calculate Cumulative Sums Over Time in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect)
- Window functions (`sum() OVER`)
- `runningAccumulate` with `AggregateFunction` states (`sumState`)
- `arrayCumSum` and `groupArray`
- Date functions: `toDate`, `toYear`, `today()`

## Sources Consulted
- ClickHouse Window Functions documentation: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse `runningAccumulate`: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#runningaccumulate
- ClickHouse `arrayCumSum`: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arraycumsum
- ClickHouse aggregate function combinators (`-State`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date and time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

## Review Notes
- The nested `sum(sum(revenue)) OVER (ORDER BY ...)` pattern is valid: the inner `sum` is the per-group aggregate and the outer `sum() OVER` is a window over the grouped result. With only `ORDER BY` and no explicit frame, ClickHouse defaults to `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`, producing the cumulative sum as described.
- `runningAccumulate` is documented as non-deterministic across blocks: it accumulates state within each block and resets between blocks. For a single-block subquery with modest cardinality (as in the example) this works, but at very large scale the claim that it is strictly "more efficient than a window function" is situational — modern ClickHouse window function optimizations are often competitive. This is a minor framing note, not a technical error.
- The `arrayCumSum(groupArray(...))` pattern relies on the outer `GROUP BY` preserving the `ORDER BY` of the inner subquery. In ClickHouse this ordering is generally preserved for this pattern, but for stricter guarantees users may prefer to sort by a paired key (e.g. `arrayCumSum(arrayMap(x -> x.2, arraySort(groupArray((day, daily_errors)))))`). Not an error in the post, but worth noting for production usage.
- All function names, combinators, and syntax match current ClickHouse documentation.
