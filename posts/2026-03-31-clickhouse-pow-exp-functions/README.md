# How to Use pow() and exp() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Numeric, Feature Engineering

Description: Learn how pow() raises numbers to a power and exp() computes e^x in ClickHouse, with examples for compound interest, exponential growth modeling, and feature engineering.

---

`pow()` and `exp()` are the primary exponentiation functions in ClickHouse. `pow(x, y)` computes x raised to the power y, covering both integer and fractional exponents. `exp(x)` computes e^x (Euler's number raised to the power x), which is the fundamental building block of exponential growth and decay models, probability distributions, and information-theoretic calculations.

## Function Signatures

```text
pow(x, y)   -- computes x^y; also written as power(x, y)
exp(x)      -- computes e^x where e = 2.71828...
```

Both return Float64. `pow()` handles fractional exponents (equivalent to roots) and negative exponents (equivalent to reciprocals).

## Basic Usage

```sql
SELECT
    pow(2, 10)       AS two_to_ten,
    pow(9, 0.5)      AS sqrt_9,
    pow(2, -1)       AS reciprocal,
    exp(1)           AS e_value,
    exp(0)           AS exp_zero,
    exp(2)           AS exp_two;
```

`pow(9, 0.5)` returns 3 (square root). `exp(1)` returns 2.71828...

## Setting Up Sample Data

Create a table to model financial accounts for compound interest calculations.

```sql
CREATE TABLE savings_accounts
(
    account_id    UInt64,
    owner         String,
    principal     Float64,
    annual_rate   Float64,
    years         UInt16
)
ENGINE = MergeTree
ORDER BY account_id;

INSERT INTO savings_accounts VALUES
(1, 'Alice',  10000.00, 0.05,  5),
(2, 'Bob',    25000.00, 0.04, 10),
(3, 'Carol',   5000.00, 0.07,  3),
(4, 'Dave',   50000.00, 0.03, 20);
```

## Compound Interest Calculation

Use `pow()` to compute compound interest: the formula is `principal * (1 + rate)^years`.

```sql
SELECT
    owner,
    principal,
    annual_rate,
    years,
    round(principal * pow(1 + annual_rate, years), 2)                AS final_balance,
    round(principal * pow(1 + annual_rate, years) - principal, 2)    AS total_interest
FROM savings_accounts
ORDER BY final_balance DESC;
```

## Continuous Compounding with exp()

For continuous compounding the formula is `principal * exp(rate * years)`. Compare it with annual compounding.

```sql
SELECT
    owner,
    principal,
    annual_rate,
    years,
    round(principal * pow(1 + annual_rate, years), 2)             AS annual_compound,
    round(principal * exp(annual_rate * years), 2)                AS continuous_compound,
    round(
        principal * exp(annual_rate * years) -
        principal * pow(1 + annual_rate, years),
    2) AS difference
FROM savings_accounts;
```

## Exponential Decay Modeling

Model decay processes (radioactive decay, signal attenuation, customer churn) using `exp()` with a negative exponent.

```sql
CREATE TABLE decay_model
(
    substance     String,
    initial_qty   Float64,
    decay_const   Float64
)
ENGINE = MergeTree
ORDER BY substance;

INSERT INTO decay_model VALUES
('isotope_A', 1000.0, 0.1),
('isotope_B', 500.0,  0.05),
('substance_C', 2000.0, 0.2);
```

```sql
SELECT
    substance,
    t AS time_units,
    round(initial_qty * exp(-decay_const * t), 2) AS remaining_qty
FROM decay_model
CROSS JOIN (
    SELECT arrayJoin([0, 5, 10, 20, 50]) AS t
)
ORDER BY substance, t;
```

## Feature Engineering with Polynomial Features

Use `pow()` to generate polynomial features for regression or machine learning preprocessing.

```sql
CREATE TABLE regression_features
(
    sample_id  UInt64,
    x          Float64
)
ENGINE = MergeTree
ORDER BY sample_id;

INSERT INTO regression_features VALUES
(1, 1.0), (2, 2.0), (3, 3.0), (4, 4.0), (5, 5.0);
```

```sql
SELECT
    sample_id,
    x,
    pow(x, 2) AS x_squared,
    pow(x, 3) AS x_cubed,
    exp(x)    AS exp_x
FROM regression_features;
```

## Softmax Score Computation

Use `exp()` to compute softmax-style scores, normalizing raw scores into a probability distribution.

```sql
WITH scores AS (
    SELECT class_label, raw_score
    FROM (
        SELECT
            ['class_A', 'class_B', 'class_C'] AS labels,
            [2.0, 1.0, 0.5]                   AS raw_scores
    )
    ARRAY JOIN
        labels AS class_label,
        raw_scores AS raw_score
),
exp_scores AS (
    SELECT class_label, exp(raw_score) AS exp_s
    FROM scores
)
SELECT
    class_label,
    round(exp_s / sum(exp_s) OVER (), 4) AS softmax_prob
FROM exp_scores;
```

## Summary

`pow(x, y)` handles arbitrary exponentiation including fractional and negative exponents, making it useful for compound interest, polynomial feature generation, and root computations. `exp(x)` provides the natural exponential function essential for continuous growth and decay models, softmax normalization, and log-space probability calculations. Both return Float64 and compose naturally with `log()` and `sqrt()`. For the inverse of `exp()`, use `log()`; for the inverse of `pow(x, 2)`, use `sqrt()`.
