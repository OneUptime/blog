# How to Use lgamma() and tgamma() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Statistics, Probability

Description: Learn how tgamma() computes the Gamma function and lgamma() computes its log in ClickHouse, with examples for combinatorics, statistical distributions, and Bayesian calculations.

---

The Gamma function generalizes the factorial to real and complex numbers. `tgamma(x)` computes the Gamma function directly (Gamma(n) = (n-1)! for positive integers), while `lgamma(x)` computes the natural logarithm of the Gamma function. Working in log space with `lgamma()` is numerically stable for large arguments where `tgamma()` would overflow, making it essential for combinatorics and statistical distribution calculations in analytical SQL.

## Function Signatures

```text
tgamma(x)   -- Gamma function; tgamma(n) = (n-1)! for positive integers
lgamma(x)   -- natural log of the Gamma function; lgamma(x) = log(tgamma(x))
```

Both return Float64. `tgamma()` overflows for large x (approximately x > 171 for Float64). `lgamma()` works safely for much larger values.

## Basic Usage and Factorial Relationship

```sql
SELECT
    tgamma(1)  AS gamma_1,
    tgamma(2)  AS gamma_2,
    tgamma(3)  AS gamma_3,
    tgamma(4)  AS gamma_4,
    tgamma(5)  AS gamma_5,
    tgamma(6)  AS gamma_6
;
```

`tgamma(1)` = 1 (0!), `tgamma(2)` = 1 (1!), `tgamma(3)` = 2 (2!), `tgamma(5)` = 24 (4!).

Use `tgamma()` to compute factorials for small values.

```sql
SELECT
    n,
    round(tgamma(n + 1), 0) AS n_factorial
FROM (
    SELECT arrayJoin([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) AS n
);
```

## Computing Binomial Coefficients

The binomial coefficient C(n, k) = n! / (k! * (n-k)!) counts ways to choose k items from n. Use `lgamma()` in log space for numerical stability.

```text
log(C(n,k)) = lgamma(n+1) - lgamma(k+1) - lgamma(n-k+1)
C(n,k)      = exp(lgamma(n+1) - lgamma(k+1) - lgamma(n-k+1))
```

```sql
SELECT
    pair.1 AS n,
    pair.2 AS k,
    round(exp(lgamma(pair.1 + 1) - lgamma(pair.2 + 1) - lgamma(pair.1 - pair.2 + 1)), 0) AS binomial_coeff
FROM (
    SELECT arrayJoin([(5, 2), (5, 3), (10, 3), (10, 5), (20, 5)]) AS pair
)
ORDER BY n, k;
```

## Beta Function

The Beta function B(a, b) = Gamma(a) * Gamma(b) / Gamma(a+b) is used in Bayesian statistics for the Beta distribution. Compute it in log space.

```text
log(B(a,b)) = lgamma(a) + lgamma(b) - lgamma(a+b)
```

```sql
SELECT
    a,
    b,
    round(exp(lgamma(a) + lgamma(b) - lgamma(a + b)), 6) AS beta_ab
FROM (
    SELECT
        arrayJoin([0.5, 1.0, 2.0, 3.0]) AS a,
        arrayJoin([0.5, 1.0, 2.0, 3.0]) AS b
);
```

## Bayesian Beta-Binomial Update

In Bayesian A/B testing, the Beta distribution models conversion probability. After observing `s` successes and `f` failures with Beta(alpha, beta) prior, the posterior is Beta(alpha+s, beta+f).

```sql
CREATE TABLE ab_test_results
(
    variant    String,
    successes  UInt64,
    failures   UInt64
)
ENGINE = MergeTree
ORDER BY variant;

INSERT INTO ab_test_results VALUES
('control',   320, 9680),
('treatment', 380, 9620);
```

Compute the posterior mean and posterior parameters for each variant.

```sql
WITH
    alpha_prior AS 1.0,
    beta_prior  AS 1.0
SELECT
    variant,
    successes,
    failures,
    round((successes + alpha_prior) / (successes + failures + alpha_prior + beta_prior), 4) AS posterior_mean,
    round(successes + alpha_prior, 1) AS posterior_alpha,
    round(failures  + beta_prior,  1) AS posterior_beta
FROM ab_test_results;
```

## Log Likelihood for Poisson Distribution

The log-likelihood of observing k events in a Poisson distribution with rate lambda is:

```text
log P(k | lambda) = k * log(lambda) - lambda - lgamma(k + 1)
```

```sql
SELECT
    k,
    lambda,
    round(k * log(lambda) - lambda - lgamma(k + 1), 4) AS log_likelihood
FROM (
    SELECT
        arrayJoin([0, 1, 2, 3, 4, 5]) AS k,
        5.0                            AS lambda
)
ORDER BY k;
```

## Summary

`tgamma(x)` computes the Gamma function (generalizing factorials to real numbers) and `lgamma(x)` computes its natural logarithm for numerically stable large-argument calculations. Use `tgamma()` for small values where direct computation is fine, and switch to `lgamma()` with `exp()` for combinatorics, binomial coefficients, Beta function values, and log-likelihoods. These functions are foundational for statistical distribution computations, Bayesian probability modeling, and combinatorial calculations that would otherwise require external computation outside ClickHouse.
