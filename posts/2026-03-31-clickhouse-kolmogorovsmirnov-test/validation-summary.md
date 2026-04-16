# Validation Summary: How to Use kolmogorovSmirnovTest() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (aggregate functions)
- SQL
- Kolmogorov-Smirnov statistical test
- `kolmogorovSmirnovTest()` aggregate function
- `welchTTest()` aggregate function (referenced for comparison)
- MergeTree table engine

## Sources Consulted
- ClickHouse official docs — kolmogorovSmirnovTest: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/kolmogorovsmirnovtest
- ClickHouse official docs — welchTTest: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/welchttest
- ClickHouse source code — AggregateFunctionKolmogorovSmirnovTest.cpp (GitHub master branch)
- SciPy `ks_2samp` documentation (for convention cross-reference)

## Issues Found
No technical issues found.

Verification details:
- Function signature `kolmogorovSmirnovTest(alternative)(sample_data, sample_index)` is a valid simplification of the full signature `kolmogorovSmirnovTest([alternative, computation_method])(sample_data, sample_index)`; both `alternative` and `computation_method` are optional parameters.
- Valid alternative values (`'two-sided'`, `'greater'`, `'less'`) match the documentation.
- Return type tuple `(statistic, p_value)` correctly described.
- The directional test interpretation (`'greater'` → treatment stochastically greater than control; `'less'` → treatment produces smaller values) was verified against the source code. With variant=0 as the first sample, `'greater'` uses `d = max_s` (D+ = max(F1 - F2)); large D+ means first CDF is above second, i.e., first sample is stochastically smaller, which is equivalent to "second sample (treatment) is stochastically greater" — matching the post's claim. Symmetric logic verified for `'less'`.
- `welchTTest(0.95)(value, variant)` syntax is valid — the optional confidence level produces a 4-tuple.
- MergeTree `ENGINE = MergeTree() ORDER BY id` with `UInt32`/`UInt8`/`Float64` columns is valid.
- `INSERT ... SELECT FROM numbers(N)` pattern with `number % 2`, `rand()`, and `if()` is standard ClickHouse.
- Rule-of-thumb interpretation thresholds for the KS statistic are consistent with common practice (the statistic is bounded in [0, 1]).
- Subquery-with-`GROUP BY` pattern for multi-segment testing is syntactically valid.

## Review Notes
- The ClickHouse documentation's prose description of the `'greater'` / `'less'` null hypotheses is somewhat confusingly worded relative to the actual statistic computed in the source, but the function's implemented behavior (verified via the source) matches the conventional SciPy-style naming and is consistent with the blog's interpretation. Readers coming from SciPy's `scipy.stats.ks_2samp` will find the behavior familiar.
- The KS test requires continuous distributions in theory; ClickHouse's implementation works on any numeric input, but results on heavily discretized data should be interpreted with caution (not strictly a technical error in the post, just a statistical caveat).
- Introduced in ClickHouse v23.4.0 — any deployment on older versions will not have this function available. The post does not mention a minimum version; this is a minor documentation gap rather than an error.
