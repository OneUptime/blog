# Validation Summary: How to Use Aggregate Function Combinators (-If, -Array, -Map) in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Aggregate function combinators (`-If`, `-Array`, `-Map`)
- ClickHouse `Map` and `Array` data types
- MergeTree engine

## Sources Consulted
- [ClickHouse Aggregate Function Combinators documentation](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators)
- [ClickHouse sumMap documentation](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/summap)
- [ClickHouse GitHub repository (docs/en/sql-reference/aggregate-functions)](https://github.com/ClickHouse/ClickHouse/tree/master/docs/en/sql-reference/aggregate-functions)

## Issues Found

1. **Incorrect output format for `sumMap` on a `Map` column.**
   - The post originally stated that `sumMap(counters)` on a Map column "returns a tuple of (keys_array, values_array)" and showed the example output as `(['requests','errors'],[220,8])`.
   - According to the official ClickHouse documentation for the `-Map` combinator, when applied to a `Map` column, the aggregate function returns a `Map` type, not a tuple. Example output from the docs is of the form `{'a':10,'b':10,'c':20}`.
   - The tuple form is only returned by the legacy `sumMap(keys, values)` signature where keys and values are supplied as separate arrays (or as a `Tuple`), not when using a `Map` column argument via the `-Map` combinator.
   - **Fix applied:** Updated the description to state that `-Map` returns a `Map` type with aggregated values per key, and changed the example output from `(['requests','errors'],[220,8])` to `{'requests':220,'errors':8}`.

## Review Notes
- All `-If` combinator examples (`countIf`, `sumIf`, `avgIf`, `uniqIf`) are syntactically correct and behave as described.
- All `-Array` combinator examples (`sumArray`, `countArray`) are valid. `countArray(arr)` counts non-null elements across all arrays, which matches the described behavior assuming non-null array elements.
- The chaining example uses `groupArrayIf`, which is technically `groupArray` (a standalone aggregate) with the `-If` combinator applied — it is not strictly an example of chaining two combinators like `-Array` + `-If`. The SQL is valid and the post acknowledges that not all combinations are supported, so this was left unchanged. Per the ClickHouse docs, when combining `-Array` and `-If`, the order must be `-ArrayIf` (e.g., `uniqArrayIf`), which the post correctly states.
- The two `service_metrics` table examples use slightly different column sets (one references `event_date` and `request_counts`, the other defines `ts`, `service`, `metrics`). These are independent illustrative examples and each is internally consistent, so no change was needed.
- All remaining SQL snippets are syntactically valid and use current, non-deprecated ClickHouse APIs.
