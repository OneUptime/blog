# Validation Summary: How to Use quantileDeterministic() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL (`quantileDeterministic`, `quantilesDeterministic`, `-State`/`-Merge` combinators)
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- ClickHouse official documentation: quantileDeterministic — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiledeterministic
- ClickHouse official documentation: Aggregate function combinators (-State, -Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse official documentation: AggregatingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse source code (QuantileDeterministic implementation)

## Issues Found
- **Determinator type requirement not stated**: The post recommended "Primary keys or UUIDs" and used `request_uuid` directly as a determinator column. Per the official docs, the determinator parameter must be a `UInt64` (or other `(U)Int*`) type. Passing a ClickHouse `UUID`-typed column directly would produce a type error. Fixed by: clarifying the integer type requirement, changing the recommendation to suggest hashing non-integer columns with `cityHash64()` or `sipHash64()`, and updating the code example to show `cityHash64(request_uuid)` as the proper pattern.

## Review Notes
- The official ClickHouse documentation warns that `quantileDeterministic()` "works incorrectly" if the same determinator value occurs too often. The post addresses this indirectly by recommending high-cardinality columns, which is adequate guidance for practical use.
- The post does not mention the default quantile level (0.5 / median) or the `medianDeterministic` alias, but all examples use explicit levels, which is good practice.
- The return type is `Float64` for numeric inputs and `Date`/`DateTime` for temporal inputs. This is not mentioned but is a minor omission that doesn't affect correctness of the examples.
- The `quantilesDeterministic()` plural form is used correctly but is not prominently documented in the official ClickHouse docs — it exists in the source code and follows the standard pattern of all `quantile*` functions.
- The AggregatingMergeTree + State/Merge combinator pattern is correct and follows the documented best practice.
