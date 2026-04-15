# Validation Summary: How to Use quantileDD() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate functions, materialized views, AggregatingMergeTree)
- SQL
- DDSketch algorithm
- quantileDD, quantileTDigest, quantileGK, quantileExact aggregate functions
- ClickHouse -State/-Merge combinator pattern

## Sources Consulted
- ClickHouse official documentation for quantileDD: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileddsketch
- ClickHouse official documentation for quantileGK: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantilegk
- ClickHouse AggregateFunction data type documentation: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse source code: `src/AggregateFunctions/QuantileDD.h` (algorithm description and error guarantees)
- DDSketch paper: https://www.vldb.org/pvldb/vol12/p2195-masson.pdf

## Issues Found
1. **Incorrect `quantileGK` accuracy parameter**: In the "Comparing Algorithms for Tail Accuracy" section, `quantileGK(0.001, 0.999)` was used. The `accuracy` parameter of `quantileGK` must be a **positive integer**, not a float. An accuracy value of N means the error is at most 1/N. Changed `0.001` to `1000` (which gives equivalent 0.1% error). Fixed: `quantileGK(1000, 0.999)(response_time_ms)`.

## Review Notes
- The `quantileDD` syntax, DDSketch algorithm description, relative error guarantee explanation, and -State/-Merge combinator usage are all technically correct and well-documented.
- The error guarantee is expressed in the blog as `relative_accuracy * quantile_value` (additive form). The more formal expression from the source code is the multiplicative form `(1 +/- epsilon) * x`, but both are mathematically equivalent. The blog's phrasing is acceptable for a tutorial.
- The `level` parameter in `quantileDD` is optional (defaults to 0.5), but the blog always provides it explicitly, which is fine and arguably clearer.
- The mermaid diagram correctly notes that absolute error grows with value magnitude while relative error remains constant — this is an accurate characterization of DDSketch's properties.
