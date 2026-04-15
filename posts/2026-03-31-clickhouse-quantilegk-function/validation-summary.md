# Validation Summary: How to Use quantileGK() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- Greenwald-Khanna streaming quantile algorithm
- ClickHouse aggregate function combinators (-State, -Merge)
- AggregatingMergeTree engine
- Materialized Views

## Sources Consulted
- ClickHouse source code: `AggregateFunctionQuantileGK.cpp` and `AggregateFunctionQuantile.h` from the ClickHouse GitHub repository (https://github.com/ClickHouse/ClickHouse)
- ClickHouse official documentation for quantileGK: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantilegk

## Issues Found

### Critical: `accuracy` parameter type and semantics were completely wrong

**What was wrong:** Every SQL example in the post used a float value for the `accuracy` parameter (e.g., `quantileGK(0.01, 0.95)(...)`). The post described `accuracy` as "epsilon error bound, e.g. 0.01 means within 1% of the true rank."

**What it should be:** The `accuracy` parameter is a **positive integer**, not a float. The error bound is computed as `1/accuracy`. So `accuracy=100` gives a 1% error bound, `accuracy=20` gives 5%, etc. The ClickHouse source code explicitly validates that the parameter has integer type.

**What was changed:** All accuracy values were corrected across every example:
- `0.01` → `100` (1% error)
- `0.05` → `20` (5% error)
- `0.001` → `1000` (0.1% error)
- `0.005` → `200` (0.5% error)

This affected: the intro paragraph, syntax section, basic example, accuracy comparison, multiple quantiles example, SLA monitoring, incremental aggregation (table DDL, materialized view, and merge query), comparison example, and the summary.

### Minor: "strict" epsilon guarantee was overstated

**What was wrong:** The post claimed GK provides a "strict epsilon-accuracy guarantee."

**What was changed:** Updated to say the guarantee holds "with high probability," which matches the official ClickHouse documentation wording.

### Minor: Memory trade-off description was inverted

**What was wrong:** The post said "uses more memory as `accuracy` decreases (tighter bound)." Since `accuracy` is an integer where larger = tighter, this was backwards.

**What was changed:** Updated to "uses more memory as `accuracy` increases (tighter bound, since error = `1/accuracy`)."

## Review Notes
- The overall structure and explanations in the post are well-organized and pedagogically sound. The decision flowchart, the -State/-Merge incremental aggregation pattern, and the comparison with other quantile functions are all valuable.
- The `quantilesGK` (plural) variant could be mentioned as a more efficient alternative when computing multiple quantile levels in a single scan, but this is an enhancement rather than a correction.
- The mermaid diagram is correct and provides good guidance for choosing between quantile functions.
