# Validation Summary: How to Use mannWhitneyUTest() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (aggregate function `mannWhitneyUTest`)
- SQL
- Mann-Whitney U test (nonparametric statistical test)

## Sources Consulted
- ClickHouse official documentation for `mannWhitneyUTest`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/mannwhitneyutest

## Issues Found
1. **Directional test description was backwards.** The post stated that using `'greater'` tests "whether the treatment group tends to have higher values than control." Per the ClickHouse docs, `'greater'` means "values in the first sample are stochastically greater than those in the second sample." Since group 0 (control) is the first sample and group 1 (treatment) is the second, `'greater'` actually tests whether control > treatment, not treatment > control. Fixed the description to correctly state it tests whether the control group has higher values, and updated the `'less'` explanation accordingly.

2. **U-statistic interpretation was backwards.** The interpretation table stated "large U means group 1 tends to have higher ranks." Based on the ClickHouse docs example (group 0 with values 10, 11, 12 vs group 1 with 1, 2, 3 yields U = 9, the maximum), a large U indicates the first sample (group 0) ranks higher, not group 1. Fixed to "large U means the first sample (group 0) tends to have higher ranks."

## Review Notes
- The syntax section does not indicate that the `alternative` and `continuity_correction` parameters are optional (they have defaults of `'two-sided'` and `1` respectively). This is a minor omission since all examples provide them explicitly, which is reasonable for a tutorial.
- The segmented analysis example references a table `ab_revenue_with_category` that is not defined in the post. This is intentional as a conceptual example, but readers would need to create that table themselves.
- All SQL syntax, table definitions, INSERT statements, tuple unpacking patterns, and use of `numbers()` / `rand()` are correct ClickHouse SQL.
- The statistical explanation of the Mann-Whitney U test and when to use it is accurate.
