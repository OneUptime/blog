# How to Use arrayExists() and arrayAll() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayExists, arrayAll, Lambda, Higher-Order Function

Description: Learn how arrayExists() checks whether any element satisfies a condition and arrayAll() verifies that every element passes, with real SQL examples.

---

When working with array columns in ClickHouse, you often need to ask two different questions about the elements: "does at least one element satisfy this condition?" and "do all elements satisfy this condition?" ClickHouse provides `arrayExists()` and `arrayAll()` for exactly these two predicates. Both accept a lambda and an array, and both return `1` (true) or `0` (false), making them directly usable in `WHERE` clauses and `SELECT` expressions.

## arrayExists() - Any Element Matches

`arrayExists(func, arr)` returns `1` if the lambda returns a non-zero value for at least one element in the array.

```sql
-- Does the array contain any negative number?
SELECT arrayExists(x -> x < 0, [3, -1, 7, 2]) AS has_negative;
-- Result: 1

-- Does the array contain any negative number (all positive)?
SELECT arrayExists(x -> x < 0, [3, 1, 7, 2]) AS has_negative;
-- Result: 0
```

## arrayAll() - Every Element Matches

`arrayAll(func, arr)` returns `1` only when the lambda returns a non-zero value for every element. If any element fails, it returns `0`.

```sql
-- Are all elements positive?
SELECT arrayAll(x -> x > 0, [3, 1, 7, 2]) AS all_positive;
-- Result: 1

-- Are all elements positive (one is negative)?
SELECT arrayAll(x -> x > 0, [3, -1, 7, 2]) AS all_positive;
-- Result: 0
```

## Filtering Rows Based on Array Contents

The most common use of both functions is inside a `WHERE` clause to filter rows based on their array column contents.

```sql
-- Find sessions where at least one event took longer than 2 seconds
SELECT session_id
FROM sessions
WHERE arrayExists(d -> d > 2000, event_durations_ms);

-- Find sessions where every event completed within 500ms
SELECT session_id
FROM sessions
WHERE arrayAll(d -> d <= 500, event_durations_ms);
```

## Checking for Error Codes in an Event Sequence

In observability data it is common to store a sequence of status codes per request. `arrayExists()` flags any request that hit an error.

```sql
-- Flag requests that contained at least one 5xx status
SELECT
    request_id,
    status_codes,
    arrayExists(s -> s >= 500, status_codes) AS had_server_error
FROM request_log;

-- Retrieve only the fully successful requests (all 2xx)
SELECT request_id
FROM request_log
WHERE arrayAll(s -> s >= 200 AND s < 300, status_codes);
```

## Validating Feature Flag Arrays

When each user row stores an array of enabled feature flags, you can use `arrayExists()` to check enrollment and `arrayAll()` to enforce required flags.

```sql
-- Users who have the 'dark_mode' feature enabled
SELECT user_id
FROM user_profiles
WHERE arrayExists(f -> f = 'dark_mode', feature_flags);

-- Users who have ALL required onboarding flags set
SELECT user_id
FROM user_profiles
WHERE arrayAll(
    f -> has(feature_flags, f),
    ['verified_email', 'completed_profile', 'accepted_terms']
);
```

## Combining arrayExists() with arrayMap()

You can compose `arrayExists()` with `arrayMap()` to test a derived property of each element.

```sql
-- Check if any tag, when lowercased, equals 'urgent'
SELECT
    ticket_id,
    arrayExists(t -> lower(t) = 'urgent', tags) AS is_urgent
FROM support_tickets;
```

## Using arrayAll() for Data Quality Checks

`arrayAll()` is well suited for data quality validations where every value in an array must satisfy a constraint.

```sql
-- Identify rows where every sample value is within a valid range [0, 100]
SELECT
    sensor_id,
    readings,
    arrayAll(r -> r >= 0 AND r <= 100, readings) AS readings_valid
FROM sensor_data;

-- Report rows with out-of-range readings
SELECT sensor_id, readings
FROM sensor_data
WHERE NOT arrayAll(r -> r >= 0 AND r <= 100, readings);
```

## Multi-Array Lambdas

Like other higher-order functions, both `arrayExists()` and `arrayAll()` support multi-array lambdas. The lambda receives one element from each array, and all arrays must be the same length.

```sql
-- Check if any (score, weight) pair has a weighted contribution above 50
SELECT arrayExists(
    (score, weight) -> score * weight > 50,
    [30, 60, 80],
    [0.5, 1.0, 0.8]
) AS any_high_contribution;
```

## Aggregating Boolean Arrays

When an array column stores boolean-encoded values (0 or 1), `arrayAll()` without a lambda acts as a check that every flag is set, and `arrayExists()` without a lambda checks that at least one flag is set.

```sql
-- Without lambda: checks for any non-zero element
SELECT arrayExists([0, 0, 1, 0]) AS has_any_flag;
-- Result: 1

-- Without lambda: checks that all elements are non-zero
SELECT arrayAll([1, 1, 1, 1]) AS all_flags_set;
-- Result: 1
```

## Summary

`arrayExists()` and `arrayAll()` are the array equivalents of `any()` and `all()` predicates found in functional languages. They produce a scalar boolean result by evaluating a lambda against every element in an array, making them ideal for `WHERE` clause filtering, data quality assertions, and derived flag columns.
