# Validation Summary: How to Create Aggregate UDFs in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse SQL (`CREATE FUNCTION`, aggregate functions, combinators)
- `AggregateFunction` data type and `AggregatingMergeTree` engine
- `-State` / `-Merge` combinator pattern
- `-If`, `-Array`, `-Map` combinators (`sumIf`, `uniqIf`, `sumArray`)
- `system.functions` system table
- Python (stdin-driven aggregation script)

## Sources Consulted
- ClickHouse `CREATE FUNCTION` docs — https://clickhouse.com/docs/sql-reference/statements/create/function
- Aggregate function combinators — https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- `AggregateFunction` data type — https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- `AggregatingMergeTree` engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- Executable UDFs — https://clickhouse.com/docs/sql-reference/functions/udf
- `system.functions` — https://clickhouse.com/docs/operations/system-tables/functions

## Issues Found
1. **Description referred to "C++ plugins".** ClickHouse has no dynamic plugin API for aggregate functions; custom aggregates require modifying and rebuilding the ClickHouse source. Changed "C++ plugins" to "C++ source extensions" in the description.
2. **Approach list overstated `CREATE FUNCTION` capability.** The original bullets called option 2 "SQL aggregate lambdas", which implied that `CREATE FUNCTION` can create aggregate UDFs — it cannot; it only creates scalar lambdas. Reworded bullet 1 to clarify the C++ path (source modification, no plugin API) and bullet 2 to clarify that `CREATE FUNCTION` is scalar-only and the aggregate behavior comes from composing built-in aggregates and combinators.

All code examples were verified:
- `CREATE FUNCTION weighted_contribution AS (price, weight) -> price * weight;` — valid scalar lambda syntax.
- `sumIf`, `uniqIf`, `sumArray` — all valid combinator applications.
- `AggregateFunction(sum, Float64)`, `AggregateFunction(uniq, UInt64)`, `AggregateFunction(quantile(0.99), UInt32)` — valid column type declarations (parametric aggregates include parameters inline).
- `sumState`/`uniqState`/`quantileState(0.99)` with matching `-Merge` variants — correct; `quantileMerge(0.99)(state_column)` is the correct parametric merge syntax.
- `system.functions` has both `name`, `is_aggregate`, and `case_insensitive` columns — query is valid.

## Review Notes
- Approach 3 ("Custom Aggregate via Executable") is presented as a workflow rather than a native ClickHouse feature. ClickHouse's executable UDFs are scalar-only; to use this script as an "aggregate" you would first have to collect rows into a `groupArray` and pass that array to a scalar executable UDF. The post does not explicitly claim native aggregate support for executable UDFs, but a future revision could make that caveat explicit and show the XML registration (`<function>`/`executable_pool`) needed to expose the script as a UDF.
- The Python example uses `math` but never calls it — could be removed, but it is not a correctness issue.
