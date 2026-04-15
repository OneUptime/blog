# Validation Summary: How to Use quantile() Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL (ClickHouse dialect)
- `quantile()`, `quantiles()`, `quantileExact()`, `quantileDeterministic()`, `quantileTDigest()` functions

## Sources Consulted
- ClickHouse official documentation on quantile(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse official documentation on quantiles(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse official documentation on quantileExact(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantileexact
- ClickHouse official documentation on quantileDeterministic(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiledeterministic
- ClickHouse official documentation on quantileTDigest(): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantiletdigest

## Issues Found
1. **Contradictory claims about aggregation passes**: The "Multiple Quantiles in One Query" section initially stated "ClickHouse must perform a separate aggregation pass for each call," but the note at the bottom of the same section correctly stated that ClickHouse computes multiple `quantile()` calls on the same column in a single pass. The opening paragraph was incorrect and contradicted the note. Fixed the paragraph to accurately state that ClickHouse optimizes multiple calls on the same column into a single aggregation pass, and updated the note to be consistent rather than contradictory.

## Review Notes
- The claim that "the error is less than 1% relative to the true quantile" for reservoir sampling with 8192 samples is a reasonable general statement but actual accuracy depends heavily on data distribution and dataset size. This is acceptable as a practical guideline.
- The advice about filtering before aggregation is sound for both performance and correctness reasons.
- All SQL examples use correct ClickHouse syntax with the parametric `function(param)(arg)` form.
- The post correctly distinguishes between approximate (`quantile`) and exact (`quantileExact`) variants and provides appropriate guidance on when to use each.
