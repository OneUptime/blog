# How to Use arrayCumSum() and arrayCumSumNonNegative() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayCumSum, arrayCumSumNonNegative, Running Total, SQL

Description: Learn how arrayCumSum() computes prefix sums over an array and arrayCumSumNonNegative() prevents negative running totals, with balance and time-series examples.

---

A cumulative sum (also called a prefix sum or running total) transforms an array of values into an array of the same length where each element is the sum of all elements up to and including that position. ClickHouse provides `arrayCumSum(arr)` for this operation. A variant, `arrayCumSumNonNegative(arr)`, applies the same logic but resets the running total to `0` whenever it would go negative - useful for modeling quantities like account balances or inventory levels that cannot fall below zero.

## arrayCumSum() - Basic Prefix Sum

`arrayCumSum(arr)` returns a new array of the same length where element `i` is the sum of `arr[1]` through `arr[i]`.

```sql
-- Prefix sum of [1, 2, 3, 4, 5]
SELECT arrayCumSum([1, 2, 3, 4, 5]) AS running_total;
-- Result: [1, 3, 6, 10, 15]

-- Works with negative values too
SELECT arrayCumSum([10, -3, 5, -8, 2]) AS running_total;
-- Result: [10, 7, 12, 4, 6]
```

## arrayCumSumNonNegative() - Floor at Zero

`arrayCumSumNonNegative(arr)` behaves like `arrayCumSum()` except that whenever the cumulative sum would become negative, it is clamped to `0` and accumulation continues from there.

```sql
-- Running total that cannot go below 0
SELECT arrayCumSumNonNegative([10, -3, -15, 5, 2]) AS clamped_total;
-- Result: [10, 7, 0, 5, 7]
```

## Running Totals for In-Array Time Series

When a time series is stored as an array of delta values (increments and decrements), `arrayCumSum()` reconstructs the running total at each point.

```sql
-- Reconstruct cumulative page views from daily deltas
SELECT
    page_id,
    arrayCumSum(daily_delta_views) AS cumulative_views
FROM page_stats;
```

## Account Balance Calculations

A classic use of `arrayCumSumNonNegative()` is modeling a balance that cannot go below zero - for example, a prepaid account or a token bucket.

```sql
-- Compute the running balance after each transaction, floored at 0
SELECT
    account_id,
    transactions,
    arrayCumSumNonNegative(transactions) AS balance_after_each
FROM account_history;
```

## Identifying When a Running Total Crosses a Threshold

Combining `arrayCumSum()` with `arrayFirstIndex()` lets you find the position at which a cumulative metric crosses a target value.

```sql
-- Find the first event after which the cumulative duration exceeded 10 seconds
SELECT
    session_id,
    arrayFirstIndex(
        t -> t > 10000,
        arrayCumSum(event_durations_ms)
    ) AS budget_exceeded_at_step
FROM sessions;
```

## Computing Remaining Budget After Each Step

Subtracting `arrayCumSum()` from a fixed budget array gives the remaining capacity at each step.

```sql
-- Remaining token budget after each API call
WITH 1000 AS initial_budget
SELECT
    user_id,
    arrayMap(c -> initial_budget - c, arrayCumSum(token_costs)) AS budget_remaining_per_call
FROM api_usage;
```

## Detecting Negative Balance Points

Using `arrayExists()` on the result of `arrayCumSum()` quickly identifies whether a balance ever went negative.

```sql
-- Flag accounts that went into overdraft at any point
SELECT
    account_id,
    arrayExists(b -> b < 0, arrayCumSum(transactions)) AS went_negative
FROM account_history;
```

## Cumulative Sum for Percentile Estimation

In analytics, `arrayCumSum()` on a frequency distribution array is the first step in computing cumulative distribution functions.

```sql
-- Compute CDF from a histogram of response time buckets
-- Each element represents count of requests falling in that 100ms bucket
SELECT
    service_name,
    arrayCumSum(bucket_counts) AS cumulative_counts,
    arrayMap(
        c -> c / arraySum(bucket_counts),
        arrayCumSum(bucket_counts)
    ) AS cdf
FROM response_time_histograms;
```

## Comparing arrayCumSum() vs. arrayCumSumNonNegative()

The difference between the two functions is visible as soon as a sequence of negative values would push the running total below zero.

```sql
-- See the difference side by side
SELECT
    arrayConcat([5, -10, 3], []) AS deltas,
    arrayCumSum([5, -10, 3]) AS with_negatives,
    arrayCumSumNonNegative([5, -10, 3]) AS floored_at_zero;
-- with_negatives:      [5, -5, -2]
-- floored_at_zero:     [5,  0,  3]
```

## Practical Example: Inventory Level Tracking

When item quantities are stored as a sequence of additions and removals, `arrayCumSumNonNegative()` enforces the physical constraint that inventory cannot go negative.

```sql
-- Track inventory level after each warehouse event
SELECT
    sku,
    warehouse_events,
    arrayCumSumNonNegative(warehouse_events) AS inventory_level_after_each_event
FROM inventory_history;
```

## Summary

`arrayCumSum()` transforms an array of values into a prefix-sum (running total) array of the same length. `arrayCumSumNonNegative()` applies the same logic with a floor at zero, preventing the running total from going negative. Together they enable compact, row-local time-series analysis on array columns - from reconstructing balance histories and inventory levels to computing CDFs and detecting budget overruns - all without unnesting the data or writing window functions.
