# Validation Summary: How to Calculate Skewness and Kurtosis in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (aggregate functions: `skewSamp`, `skewPop`, `kurtSamp`, `kurtPop`, `stddevSamp`, `avg`, `min`, `max`, `count`)
- SQL

## Sources Consulted
- ClickHouse official documentation for `skewSamp`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/skewsamp
- ClickHouse official documentation for `skewPop`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/skewpop
- ClickHouse official documentation for `kurtSamp`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtsamp
- ClickHouse official documentation for `kurtPop`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtpop
- ClickHouse official documentation for `stddevSamp`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevsamp
- ClickHouse source code (`AggregateFunctionStatisticsSimple.h`, `Moments.h`): verified the actual formulas used for kurtosis and skewness computation

## Issues Found

### 1. Kurtosis type mismatch in Practical Thresholds section
**What was wrong:** The "Practical Thresholds" section labeled the kurtosis thresholds as "(excess)" and used values centered on 0 (where ~0 = normal-like tails). However, ClickHouse's `kurtPop` and `kurtSamp` functions return Pearson's kurtosis (where a normal distribution = 3), NOT excess kurtosis (where normal = 0). This was verified by examining the ClickHouse source code: the implementation computes `getMoment4() / pow(variance, 2)` with no subtraction of 3. Numerical verification with the documented example output (kurtPop returning ~1.776 for uniform {1,...,10}) confirms Pearson's kurtosis.

**What was changed:** Updated the kurtosis thresholds to use Pearson's kurtosis values matching ClickHouse output: ~3 for normal-like tails, >4 for heavy tails (leptokurtic), <2 for light tails (platykurtic).

### 2. Ambiguous kurtosis explanation in "Calculating Kurtosis" section
**What was wrong:** The text stated "A kurtosis of 3 corresponds to a normal distribution (using the excess kurtosis form, this would be 0)" which, while not incorrect as a general statement, was ambiguous about what ClickHouse actually returns and could be misread as suggesting ClickHouse returns excess kurtosis.

**What was changed:** Clarified that ClickHouse specifically returns Pearson's kurtosis (normal = 3) and that users should subtract 3 to get excess kurtosis.

## Review Notes
- The description of Samp vs Pop variants ("The Samp variants use sample formulas (dividing by n-1) while Pop variants use population formulas (dividing by n)") is a simplification. In reality, the skewness/kurtosis Samp variants only differ in using sample variance (n-1 divisor) in the denominator — the numerator (central moment) always uses the population formula (divides by n). This is a common and reasonable simplification for a blog post, so it was left as-is.
- All four aggregate functions (`skewSamp`, `skewPop`, `kurtSamp`, `kurtPop`) are confirmed to exist as built-in ClickHouse functions since v20.1.0.
- All SQL syntax in the code examples is correct and idiomatic ClickHouse SQL.
- The `stddevSamp` function name and usage are correct.
- The skewness thresholds in the Practical Thresholds section are standard and correct.
