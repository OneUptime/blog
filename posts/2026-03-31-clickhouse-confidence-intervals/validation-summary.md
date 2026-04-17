# Validation Summary: How to Calculate Confidence Intervals in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse SQL
- Aggregate functions (`avg`, `stddevSamp`, `count`, `countIf`)
- ClickHouse `proportionsZTest` aggregate function
- Statistical concepts: confidence intervals, standard error, z-scores

## Sources Consulted
- ClickHouse `proportionsZTest` documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/proportionsztest
- ClickHouse SQL syntax (WITH clause and SELECT alias scoping): https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse aggregate function reference (`stddevSamp`, `avg`, `countIf`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- Standard statistical references for Wald confidence intervals and common z-score values

## Issues Found
1. **Incorrect `proportionsZTest` argument order.** The original example passed arguments as `(successes_x, trials_x, successes_y, trials_y, conf_level, ...)`. The actual ClickHouse signature is `(successes_x, successes_y, trials_x, trials_y, conf_level, pool_type)`. I swapped the second and third arguments so the call now correctly groups successes first then trials.
2. **Invalid `pool_type` value.** The original code passed `'two-sided'` as the final argument. `proportionsZTest`'s `pool_type` parameter only accepts `'pooled'` or `'unpooled'`. Changed to `'unpooled'`, which matches the typical default for two-sample proportion intervals.
3. **Misleading note about WITH clause requirement.** The post claimed ClickHouse only allows referencing earlier SELECT-clause aliases when using a WITH clause. ClickHouse actually permits referencing aliases defined earlier in the same SELECT list directly, so the first example works as written. I rewrote the note to reflect this.

## Review Notes
- The Wald interval formula for proportions used in the post (`p ± z * sqrt(p(1-p)/n)`) is correct but is known to perform poorly with very small samples or with `p` close to 0 or 1. The Summary already mentions Wilson as an alternative, which is a reasonable caveat.
- The z-score table values (1.645, 1.960, 2.576, 3.291) match standard statistical tables.
- Tuple element access in ClickHouse is 1-indexed, so `res.3` and `res.4` correctly map to the lower and upper confidence interval bounds returned by `proportionsZTest` (whose tuple is `(z_stat, p_val, ci_low, ci_high)`).
- Using `stddevSamp` (sample standard deviation) for standard error is appropriate when computing intervals over a sample of observations; this matches typical statistical practice.
