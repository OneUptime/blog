# How to Use HyperLogLog for Cardinality Estimation in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HyperLogLog, Cardinality, uniqHLL12, Approximate Count

Description: Learn how to use HyperLogLog-based functions in ClickHouse for fast approximate cardinality estimation with controllable memory usage and error rates.

---

Counting distinct values exactly with `uniqExact` requires storing every unique value, which is memory-intensive at scale. HyperLogLog (HLL) is a probabilistic algorithm that estimates cardinality using a fixed amount of memory with a configurable error rate. ClickHouse implements HLL via the `uniqHLL12` function.

## What Is HyperLogLog

HyperLogLog uses hashing and bit counting to estimate the number of distinct elements in a dataset. It uses a fixed amount of memory (a precision parameter of 12, meaning 2^12 = 4096 5-bit registers in ClickHouse's implementation) regardless of input size, with a typical error rate of about 1.6%.

## Basic Usage

```sql
SELECT uniqHLL12(user_id) AS approx_unique_users
FROM events
WHERE event_date = today();
```

## Comparing with Exact Count

```sql
SELECT
    uniqExact(user_id)  AS exact_users,
    uniqHLL12(user_id)  AS hll_users,
    abs(uniqExact(user_id) - uniqHLL12(user_id)) / uniqExact(user_id) AS relative_error
FROM events
WHERE event_date >= today() - 7;
```

## Memory Usage Comparison

```sql
SELECT
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed
FROM system.columns
WHERE table = 'events' AND name = 'user_id';
```

In practice, `uniqHLL12` uses roughly 2.5 KB of state per aggregation group regardless of cardinality, compared to `uniqExact` which scales with the number of distinct values.

## Daily Active Users Over Time

```sql
SELECT
    event_date,
    uniqHLL12(user_id) AS dau
FROM events
WHERE event_date >= today() - 30
GROUP BY event_date
ORDER BY event_date;
```

## Combining HLL States with uniqHLL12Merge

Store pre-aggregated HLL states and merge them:

```sql
-- Pre-aggregate by hour
CREATE TABLE hourly_dau
(
    hour       DateTime,
    hll_state  AggregateFunction(uniqHLL12, UInt64)
)
ENGINE = AggregatingMergeTree
ORDER BY hour;

INSERT INTO hourly_dau
SELECT
    toStartOfHour(event_time) AS hour,
    uniqHLL12State(user_id)   AS hll_state
FROM events
GROUP BY hour;

-- Merge to get daily estimate
SELECT
    toDate(hour) AS day,
    uniqHLL12Merge(hll_state) AS dau
FROM hourly_dau
GROUP BY day
ORDER BY day;
```

## When to Use HLL vs Exact Count

| Scenario | Function |
|----------|----------|
| Exact count required (billing, compliance) | `uniqExact` |
| Dashboard approximation | `uniqHLL12` |
| High-cardinality rollups (100M+ users) | `uniqHLL12` |
| Low-cardinality (< 10K) | `uniq` |

## Error Rate Expectations

- `uniqHLL12` typically has ~1.6% relative error
- For most dashboards and exploratory analytics, this is acceptable
- For financial reporting or compliance counts, use `uniqExact`

## Summary

ClickHouse's `uniqHLL12` provides memory-efficient approximate cardinality counting using the HyperLogLog algorithm. With roughly 2.5 KB of state per group and ~1.6% error rate, it is ideal for daily active user counts, unique visitor metrics, and other high-cardinality aggregations where exact precision is not required.
