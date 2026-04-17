# How to Use arrayProduct() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayProduct, Probability

Description: Learn how arrayProduct() multiplies all elements of a ClickHouse array together, enabling probability calculations, multiplicative scoring, and combinatorial aggregations.

---

While `sum` across array elements is commonly needed, some domains require the product: multiplying probabilities to compute joint likelihood, computing the factorial-like product of a sequence, or building multiplicative scoring models. `arrayProduct` returns the product of all elements in an array as a single scalar Float64 value.

## Function Signature

```text
arrayProduct(arr) -> Float64
```

The input array elements are cast to Float64 before multiplication. Returns Float64 regardless of the input element type.

## Basic Usage

```sql
-- Product of integers
SELECT arrayProduct([1, 2, 3, 4, 5]) AS product;
-- Result: 120.0  (1*2*3*4*5 = 120)

-- Product of floats
SELECT arrayProduct([0.5, 0.8, 0.9]) AS float_product;
-- Result: 0.36  (0.5*0.8*0.9 = 0.36)

-- Product with a zero - entire result collapses to 0
SELECT arrayProduct([10, 5, 0, 3]) AS zero_product;
-- Result: 0.0

-- Single element
SELECT arrayProduct([42]) AS single;
-- Result: 42.0

-- Product of 1s (identity)
SELECT arrayProduct([1, 1, 1, 1]) AS ones;
-- Result: 1.0
```

## Computing Joint Probabilities

The most natural use of `arrayProduct` is multiplying independent probabilities. Given that each event in the array has a certain probability of occurring, the joint probability that all of them occur is their product:

```sql
CREATE TABLE model_predictions
(
    user_id UInt32,
    -- Per-step click probabilities from a sequential model
    step_probabilities Array(Float32)
) ENGINE = Memory;

INSERT INTO model_predictions VALUES
    (1, [0.9, 0.75, 0.6, 0.8]),
    (2, [0.5, 0.5, 0.5]),
    (3, [0.95, 0.92, 0.88, 0.91, 0.85]);

-- Joint probability that user completes all steps
SELECT
    user_id,
    step_probabilities,
    arrayProduct(step_probabilities) AS joint_probability
FROM model_predictions;
-- user 1: 0.9 * 0.75 * 0.6 * 0.8 = 0.324
-- user 2: 0.5 * 0.5 * 0.5         = 0.125
-- user 3: 0.95*0.92*0.88*0.91*0.85 ~= 0.595
```

## Funnel Completion Probability

In product analytics, a multi-step funnel can be modeled as independent stage conversion rates. The product gives the end-to-end conversion probability:

```sql
CREATE TABLE funnels
(
    funnel_id UInt32,
    stage_names Array(String),
    stage_conversion_rates Array(Float32)
) ENGINE = Memory;

INSERT INTO funnels VALUES
    (1,
     ['visited', 'signed_up', 'activated', 'purchased'],
     [1.0, 0.35, 0.60, 0.45]),
    (2,
     ['visited', 'clicked_cta', 'trialed', 'converted'],
     [1.0, 0.20, 0.70, 0.55]);

SELECT
    funnel_id,
    stage_names,
    stage_conversion_rates,
    round(arrayProduct(stage_conversion_rates), 4) AS end_to_end_rate
FROM funnels;
-- funnel 1: 1.0 * 0.35 * 0.60 * 0.45 = 0.0945 (9.45% overall conversion)
-- funnel 2: 1.0 * 0.20 * 0.70 * 0.55 = 0.077  (7.7% overall conversion)
```

## Multiplicative Scoring - Ranking with Penalties

Some scoring models multiply factors rather than summing them. A single zero factor eliminates the candidate; high factors across the board yield a high score:

```sql
CREATE TABLE candidates
(
    candidate_id UInt32,
    score_factors Array(Float32)
) ENGINE = Memory;

INSERT INTO candidates VALUES
    (1, [0.9, 0.85, 0.92, 0.88]),
    (2, [1.0, 1.0, 0.0, 1.0]),   -- one zero factor kills the score
    (3, [0.7, 0.8, 0.75, 0.9]);

SELECT
    candidate_id,
    round(arrayProduct(score_factors), 4) AS composite_score
FROM candidates
ORDER BY composite_score DESC;
-- candidate 1: 0.9*0.85*0.92*0.88 = 0.6193
-- candidate 3: 0.7*0.8*0.75*0.9   = 0.378
-- candidate 2: 0.0  (zero factor disqualifies)
```

## Computing Factorial and Falling Factorials

`arrayProduct` applied to a `range` array computes factorials:

```sql
-- 5! = 120
SELECT arrayProduct(range(1, 6)) AS factorial_5;
-- range(1,6) = [1,2,3,4,5], product = 120

-- 10!
SELECT arrayProduct(range(1, 11)) AS factorial_10;
-- Result: 3628800.0

-- Falling factorial: n * (n-1) * ... * (n-k+1)
-- For n=10, k=3: 10 * 9 * 8 = 720
SELECT arrayProduct(arraySlice(arrayReverse(range(1, 11)), 1, 3)) AS falling_factorial;
-- arrayReverse([1..10]) = [10,9,8,...,1], slice first 3 = [10,9,8]
-- Product: 720
```

## Log-Space Computation for Numerical Stability

When probabilities are very small, repeated multiplication can underflow. A common workaround is summing logs instead of multiplying probabilities:

```sql
-- Sum of logs is numerically safer than product for tiny probabilities
SELECT
    user_id,
    arrayProduct(step_probabilities) AS direct_product,
    exp(arrayReduce('sum', arrayMap(p -> log(p), step_probabilities))) AS log_space_product
FROM model_predictions;
-- Both approaches give the same result; log-space is safer for very small values
```

## Filtering Zero Factors Before Multiplying

If zeros represent missing data (not true zero values) and should be ignored, filter them out first:

```sql
SELECT
    user_id,
    arrayProduct(
        arrayFilter(p -> p > 0.0, step_probabilities)
    ) AS product_ignoring_zeros
FROM model_predictions;
```

## Summary

`arrayProduct` multiplies all elements of an array and returns a Float64 scalar. Its primary use cases are joint probability calculations, funnel end-to-end conversion rates, multiplicative scoring models, and computing factorials. Because a single zero element drives the entire product to zero, it is often combined with `arrayFilter` to exclude zero-valued sentinels. For numerical stability with very small probabilities, the log-sum trick via `arrayReduce('sum', arrayMap(log, arr))` followed by `exp` is a safer equivalent.
