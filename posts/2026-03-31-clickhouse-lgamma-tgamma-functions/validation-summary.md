# Validation Summary: How to Use lgamma() and tgamma() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL analytical database)
- ClickHouse mathematical functions: `tgamma()`, `lgamma()`, `exp()`, `log()`, `round()`
- ClickHouse `arrayJoin()` function
- ClickHouse `WITH ... AS` scalar CTE syntax
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse Mathematical Functions reference: https://clickhouse.com/docs/sql-reference/functions/math-functions
- ClickHouse Rounding Functions reference: https://clickhouse.com/docs/sql-reference/functions/rounding-functions
- ClickHouse arrayJoin documentation: https://clickhouse.com/docs/sql-reference/functions/array-join
- ClickHouse WITH clause (CTEs): https://clickhouse.com/docs/sql-reference/statements/select/with
- C standard library tgamma/lgamma specification (for overflow behavior): https://en.cppreference.com/w/c/numeric/math/tgamma

## Issues Found

### 1. Binomial coefficients query produced cross product instead of paired rows
**What was wrong:** The query used two separate `arrayJoin()` calls in the same SELECT (`arrayJoin([5, 5, 10, 10, 20]) AS n` and `arrayJoin([2, 3, 3, 5, 5]) AS k`). In ClickHouse, multiple `arrayJoin()` calls in the same SELECT produce a cross product — this would generate 25 rows (5x5) instead of the intended 5 element-wise pairs.

**What was changed:** Replaced with a single `arrayJoin` over an array of tuples: `arrayJoin([(5, 2), (5, 3), (10, 3), (10, 5), (20, 5)])`, accessing elements via `pair.1` and `pair.2`. This correctly produces exactly 5 rows with the intended (n, k) pairs.

### 2. Bayesian section claimed lgamma usage and credible interval that weren't present
**What was wrong:** The introductory text stated "The log marginal likelihood uses `lgamma()`" but the accompanying SQL query uses only simple arithmetic (no `lgamma()` call). The text also promised a "95% credible interval approximation" but the query only computes posterior mean and posterior parameters — no credible interval.

**What was changed:** Removed the sentence about log marginal likelihood using `lgamma()`. Changed "Compute the posterior mean and 95% credible interval approximation" to "Compute the posterior mean and posterior parameters."

## Review Notes
- The Beta function query also uses two `arrayJoin()` calls producing a cross product (16 rows), but this is appropriate since showing B(a,b) for all combinations of a and b is the intended behavior.
- The `lgamma(x) = log(tgamma(x))` definition is technically `lgamma(x) = log(|Gamma(x)|)` (log of the absolute value), but since all examples in the post use positive arguments where Gamma(x) > 0, the simplified definition is correct in context.
- The post correctly notes the ~171 overflow threshold for `tgamma()` with Float64 (actual threshold is ~171.7).
- All mathematical formulas (binomial coefficient via lgamma, Beta function, Poisson log-likelihood) are correct.
- The `log()` function in ClickHouse is the natural logarithm (alias for `ln()`), which is correctly used in the Poisson log-likelihood formula.
- The `WITH alpha_prior AS 1.0` scalar CTE syntax is valid ClickHouse SQL.
