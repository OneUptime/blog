# How to Use EXP() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Math Function, Database

Description: Learn how MySQL's EXP() function returns e raised to a power, with practical examples for exponential growth, decay, and statistical calculations.

---

## What is EXP()?

The `EXP()` function in MySQL returns the value of Euler's number `e` (approximately 2.71828) raised to the power of the argument `X`. It is the inverse of the natural logarithm function `LN()`.

The syntax is:

```sql
EXP(X)
```

`X` can be any numeric expression. The result is always a positive floating-point number. `EXP(0)` = 1, `EXP(1)` = e.

## Basic Examples

```sql
SELECT EXP(0);
-- Result: 1

SELECT EXP(1);
-- Result: 2.718281828459045

SELECT EXP(2);
-- Result: 7.38905609893065

SELECT EXP(-1);
-- Result: 0.36787944117144233
```

## Relationship with LN()

`EXP()` and `LN()` are inverse operations:

```sql
SELECT EXP(LN(5));
-- Result: 5  (approximately)

SELECT LN(EXP(3));
-- Result: 3
```

## Exponential Growth Modeling

Calculate population or value after exponential growth:

```sql
-- Formula: P(t) = P0 * e^(r * t)
-- P0 = initial value, r = growth rate, t = time periods
SELECT
  initial_population,
  growth_rate,
  years,
  ROUND(initial_population * EXP(growth_rate * years), 0) AS projected_population
FROM growth_scenarios;
```

With a starting population of 1,000,000, a growth rate of 0.03, and 10 years:

```sql
SELECT ROUND(1000000 * EXP(0.03 * 10), 0) AS projected;
-- Result: 1349859
```

## Exponential Decay

Radioactive decay, drug concentration, or cooling:

```sql
-- C(t) = C0 * e^(-k * t)
SELECT
  substance,
  initial_concentration,
  decay_constant,
  time_elapsed,
  ROUND(initial_concentration * EXP(-decay_constant * time_elapsed), 4) AS remaining
FROM decay_samples;
```

## Softmax-Like Normalization

In data science applications, `EXP()` is used for softmax calculations:

```sql
SELECT
  category,
  score,
  EXP(score) AS exp_score,
  EXP(score) / SUM(EXP(score)) OVER () AS softmax_prob
FROM model_predictions;
```

## Using EXP() with LN()

Compute power operations using logarithm identity: `a^b = EXP(b * LN(a))`

```sql
-- 2^10 using EXP and LN
SELECT EXP(10 * LN(2));
-- Result: 1024  (approximately)
```

This is useful when `POWER()` is not available or when working with fractional exponents on arbitrary bases.

## NULL Handling

`EXP()` returns `NULL` when the argument is `NULL`:

```sql
SELECT EXP(NULL);
-- Result: NULL
```

## Overflow Behavior

Very large arguments can overflow to infinity or produce an out-of-range error:

```sql
SELECT EXP(800);
-- May return NULL or overflow depending on platform
```

For large values, cap the argument with `LEAST()`:

```sql
SELECT EXP(LEAST(growth_factor, 700)) AS safe_exp
FROM scenarios;
```

## Practical Example - Compound Interest (Continuous)

Continuous compounding: `A = P * e^(r * t)`

```sql
SELECT
  account_id,
  principal,
  annual_rate,
  years,
  ROUND(principal * EXP(annual_rate * years), 2) AS final_balance
FROM savings_accounts;
```

For P = 10000, r = 0.05, t = 20:

```sql
SELECT ROUND(10000 * EXP(0.05 * 20), 2) AS balance;
-- Result: 27182.82
```

## Summary

`EXP(X)` returns e^X, the base of natural logarithms raised to a power. It is the inverse of `LN()`. Key uses include exponential growth/decay modeling, continuous compound interest, softmax normalization, and power operations via the identity `a^b = EXP(b * LN(a))`. Guard against overflow by capping input with `LEAST()` for large values.
