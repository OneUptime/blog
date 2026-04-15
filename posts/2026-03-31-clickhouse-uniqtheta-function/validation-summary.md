# Validation Summary: How to Use uniqTheta() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions, AggregatingMergeTree, materialized views)
- Apache DataSketches Theta Sketch algorithm
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: uniqTheta aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqthetasketch
- ClickHouse official documentation: Theta sketch set operation functions (uniqThetaUnion, uniqThetaIntersect, uniqThetaNot) — https://clickhouse.com/docs/en/sql-reference/functions/uniqtheta-functions
- ClickHouse official documentation: uniqHLL12 aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqhll12
- Apache DataSketches error table for Theta Sketches

## Issues Found

1. **Wrong set operation function names (High severity):** The post used `thetaSketchEstimate()` and `thetaSketchIntersect()` which do not exist in ClickHouse. Corrected to the actual function names: `uniqThetaIntersect()`, `uniqThetaUnion()`, and `uniqThetaNot()`. Also corrected the pattern for extracting a numeric result from a sketch — the post used the non-existent `thetaSketchEstimate()` wrapper, replaced with `finalizeAggregation()` which is the correct ClickHouse function for converting an aggregate function state to a scalar value.

2. **Incorrect error rate — claimed ~0.78%, actual is ~3.125% (High severity):** The post stated the default k=4096 sketch gives ~0.78% error. Per the ClickHouse documentation (which references the Apache DataSketches error table), the relative error at 95% confidence for k=4096 is 3.125%. This was wrong in three locations: the Memory and Accuracy section, the comparison table, and the Summary. All corrected.

3. **Misleading memory comparison (Medium severity):** The post claimed theta sketch memory is "roughly the same order of memory as uniqHLL12()". In reality, uniqTheta at default k=4096 uses ~41 KB while uniqHLL12 uses ~2.5 KB — a ~16x difference. Corrected to state the actual sizes and acknowledge the difference.

4. **"Exact set-operation results" claim (Medium severity):** The post stated theta sketches "produce exact set-operation results on the estimated unique counts." Set operations on theta sketches produce approximate results, not exact ones. Changed "exact" to "approximate."

5. **uniqExact shard merge claim (Medium severity):** The comparison table listed uniqExact as "No" for merging across shards. uniqExact does merge across shards via hash set union — it is just expensive (O(n) network transfer). Corrected to "Yes (hash set merge, O(n) transfer)."

6. **uniqHLL12 error rate (Low severity):** The comparison table stated ~0.8% error for uniqHLL12. Per ClickHouse docs, the maximum error for medium-sized datasets (10K–100M elements) is ~1.6%. Corrected in the table.

## Review Notes
- The ClickHouse documentation notes that `uniqHLL12` is not recommended: "We do not recommend using this function. In most cases, use the uniq or uniqCombined function." The blog mentions it in the comparison table without this caveat. This is not technically incorrect but could be noted in a future update.
- The post's overall structure and SQL patterns (AggregatingMergeTree pre-aggregation, -State/-Merge combinators, -If combinator) are correct and follow ClickHouse best practices.
- The basic usage examples and materialized view patterns are syntactically correct and idiomatic.
