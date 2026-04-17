# Validation Summary: How to Use erf() and erfc() Error Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse SQL
- Math functions: `erf()`, `erfc()`
- Statistics: normal distribution CDF, z-scores, anomaly detection

## Sources Consulted
- ClickHouse official documentation on mathematical functions: https://clickhouse.com/docs/en/sql-reference/functions/math-functions (confirms `erf(x)` and `erfc(x)` return Float64 and match the definitions given)
- Standard mathematical references for the error function and its relationship to the normal CDF: `Phi(x) = 0.5 * (1 + erf(x / sqrt(2)))`
- ClickHouse CTE (WITH ... AS) documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/with
- ClickHouse `stddevPop`, `avg`, `nullIf`, `arrayJoin`, `MergeTree` documentation

## Issues Found
No technical issues found.

Verified items:
- Function signatures and definitions of `erf(x)` and `erfc(x)` are correct.
- Return type Float64 is correct.
- Value claims are correct: `erf(0)=0`, `erf(1) ≈ 0.8427`, `erf(2) ≈ 0.9953`, `erfc(0)=1`, `erf(x)+erfc(x)=1`.
- Ranges (`erf` in [-1,1], `erfc` in [0,2]) are correct.
- The standard normal CDF formula `Phi(x) = 0.5 * (1 + erf(x / sqrt(2)))` is correct.
- For `z=1.96`, CDF ≈ 0.975 is correct.
- `erf(z/sqrt(2))` giving the probability of falling in `[-z, z]` is correct.
- 68.27% / 95.45% / 99.73% rule is correct for 1σ / 2σ / 3σ.
- `MergeTree` DDL, `INSERT`, CTE with `JOIN`, and `arrayJoin` subquery patterns are valid ClickHouse SQL.
- The numerical stability argument for using `erfc()` over `1 - erf(x)` for large x is correct.

## Review Notes
- The CTE `WITH stats AS (...)` followed by a `JOIN` is fully supported in modern ClickHouse (21.1+). If readers are on a very old ClickHouse version, they may need to rewrite using a subquery in the `FROM` clause, but this is not a correctness issue.
- For `stddevPop` over a small sample (6 rows with a large outlier), the sample-based z-scores will be heavily biased by the outlier itself — this is a statistical caveat, not a technical error in the SQL.
- The post could benefit from mentioning that `erfc()` is a built-in in ClickHouse (it is — `SELECT erfc(1)` works directly), but this is already implicit throughout.
