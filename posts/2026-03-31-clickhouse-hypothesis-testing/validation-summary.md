# Validation Summary: How to Perform Hypothesis Testing in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL aggregate and scalar functions)
- Statistical hypothesis testing: Z-test for proportions, Student's t-test, Welch's t-test
- A/B testing analytics

## Sources Consulted
- ClickHouse docs — `studentTTest`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/studentttest
- ClickHouse docs — `welchTTest`: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/welchttest
- ClickHouse docs — statistical aggregate function index: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/
- ClickHouse source — `src/Functions/ztest.cpp` (registration and signature for `proportionsZTest`)

## Issues Found
1. **`proportionsZTest` argument order was wrong.** The post passed arguments as `(successes_control, trials_control, successes_treatment, trials_treatment, ...)`. The actual signature is `proportionsZTest(successes_x, successes_y, trials_x, trials_y, conf_level, pool_type)` — all successes first, then all trials. Fixed both query examples to swap the 2nd and 3rd arguments.
2. **Invalid value for the last argument of `proportionsZTest`.** The post used `'two-sided'`, but the last parameter is `pool_type` and accepts only `'pooled'` or `'unpooled'`. Changed to `'unpooled'` in both examples. (A `'two-sided'` alternative hypothesis would be the applicable choice for `meanZTest`/similar functions, not `proportionsZTest`.)
3. **Incorrect classification in the summary.** The post called `proportionsZTest` a "native aggregate function", but it is a scalar function (the t-tests are aggregates). Updated the summary paragraph to distinguish the two.

## Review Notes
- The `studentTTest(sample_data, sample_index)` and `welchTTest(sample_data, sample_index)` usage in the post is correct — `sample_index` uses `0` for one population and non-zero for the other. Both accept an optional `confidence_level` argument that the examples chose not to use, which is fine; the returned tuple is `(t_stat, p_value)` in that case, matching the post's description.
- The tuple indexing `result.1 ... result.4` used in the "Interpreting the Result" section matches the `proportionsZTest` return tuple `(z_stat, p_value, ci_low, ci_high)`.
- The sample-size sanity check query uses the reserved word `group` as a column name — it works but would need backticks in some stricter contexts. The author consistently uses it throughout, so no change was made.
