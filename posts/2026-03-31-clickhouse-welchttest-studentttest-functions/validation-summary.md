# Validation Summary: How to Use welchTTest() and studentTTest() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL, aggregate functions)
- Statistical t-tests (Welch's t-test, Student's t-test)
- A/B testing / experiment analysis

## Sources Consulted
- ClickHouse official documentation for welchTTest: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/welchttest
- ClickHouse official documentation for studentTTest: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/studentttest
- ClickHouse official documentation for varSamp: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/varsamp

## Issues Found
1. **Reversed t-statistic sign interpretation**: The post stated "A negative t-statistic means group 0 has a higher mean than group 1. A positive value means group 1 is higher." This is incorrect. ClickHouse computes the t-statistic as `(mean_group0 - mean_group1) / SE`, so a negative t-statistic means group 0 has a *lower* mean than group 1, not higher. Fixed to: "A negative t-statistic means group 0 has a lower mean than group 1. A positive value means group 0 is higher."

## Review Notes
- The parametric aggregate function syntax `functionName(confidence_level)(column, group)` is correct per the docs. The `confidence_level` parameter is optional; when provided, the return type expands from a 2-tuple `(t_stat, p_value)` to a 4-tuple `(t_stat, p_value, ci_low, ci_high)`. Since the blog always passes a confidence level, the 4-tuple unpacking is correct throughout.
- The group indicator (`sample_index`) in ClickHouse treats `0` as the first population and any non-zero value as the second population. The blog's use of 0/1 is correct.
- The Bonferroni correction section is technically sound: adjusting the confidence level from 0.95 to 0.99 correctly widens the confidence interval to account for multiple comparisons. Readers should note that the p-value itself does not change with the confidence_level parameter — only the CI bounds do — so one must also compare the p-value against the adjusted threshold (0.01) rather than the original (0.05).
- The `result.1`, `result.2`, etc. syntax for accessing tuple elements in ClickHouse is correct (1-indexed).
- The `varSamp()` function is a valid ClickHouse aggregate function for computing sample variance.
