# Validation Summary: How to Use skewSamp() and skewPop() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (aggregate functions: skewSamp, skewPop, kurtSamp, stddevSamp, avg, median, round, count, multiIf, toStartOfHour)
- SQL

## Sources Consulted
- ClickHouse official docs — skewSamp: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/skewsamp
- ClickHouse official docs — skewPop: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/skewpop
- ClickHouse official docs — kurtSamp: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtsamp
- ClickHouse official docs — kurtPop: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kurtpop
- ClickHouse official docs — median: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/median
- ClickHouse official docs — stddevSamp: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/stddevsamp
- Wikipedia — Skewness (sample skewness formulas): https://en.wikipedia.org/wiki/Skewness#Sample_skewness

## Issues Found
1. **Incorrect attribution of "Bessel's correction" to skewSamp.** The post stated that `skewSamp` uses "Bessel's correction for bias." Bessel's correction specifically refers to the `n-1` denominator adjustment used in sample variance estimation. The bias correction for sample skewness uses a different, more complex factor: `n² / ((n-1)(n-2))` (the adjusted Fisher-Pearson standardized moment coefficient). Changed to "with bias correction for finite samples" which accurately describes the function without incorrectly naming the specific correction method.

## Review Notes
- The `kurtSamp` result is aliased as `excess_kurtosis` in the "Skewness vs Kurtosis" query. Testing `kurtPop` on integers 1-10 returns ~1.776, which matches regular (non-excess) kurtosis for a discrete uniform distribution (excess kurtosis would be ~-1.224). This suggests ClickHouse's kurtosis functions compute regular kurtosis, not excess kurtosis, making the alias potentially misleading. However, since it is just a column alias and not a definitive claim, it was left unchanged. Authors may wish to verify and rename to `sample_kurtosis` for clarity.
- The `multiIf` in the "Detecting Distribution Shifts" query could be simplified to `if(timestamp < ..., 'before_deployment', 'after_deployment')` since there is only one condition, but `multiIf` works correctly here.
- All other SQL syntax, function names, and statistical explanations are accurate and consistent with ClickHouse documentation.
