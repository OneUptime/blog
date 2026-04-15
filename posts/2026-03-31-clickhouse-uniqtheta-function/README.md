# How to Use uniqTheta() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, uniqTheta, Theta Sketch, Count Distinct

Description: Learn how to use uniqTheta() in ClickHouse for approximate distinct counting using Apache DataSketches theta sketches, with set operation support.

---

ClickHouse's `uniqTheta()` function implements the Apache DataSketches theta sketch algorithm for approximate cardinality estimation. Unlike HyperLogLog-based functions, theta sketches store a random sample of hashed values that can be combined using set operations - union, intersection, and difference - without needing the original data. This makes `uniqTheta()` particularly powerful for audience segmentation, funnel analysis, and any workload that requires counting unique elements across overlapping sets.

## What Is a Theta Sketch

A theta sketch maintains a parameter theta (between 0 and 1) along with a set of retained hash values. When the sketch fills to its configured size k, theta is reduced and values above the threshold are discarded. The cardinality estimate is then: count_of_retained_values / theta.

The key advantage over HyperLogLog is that two theta sketches built from overlapping datasets can be intersected or differenced to produce approximate set-operation results on the estimated unique counts.

```sql
-- Basic syntax
SELECT uniqTheta(column_name) FROM table_name;
```

## Basic Usage

### Counting Distinct Values

```sql
-- Count distinct session IDs per service
SELECT
    service_name,
    uniqTheta(session_id) AS approx_unique_sessions
FROM request_logs
WHERE log_date = today()
GROUP BY service_name
ORDER BY approx_unique_sessions DESC;
```

### Distinct Users per Campaign

```sql
-- Approximate unique users reached by each campaign
SELECT
    campaign_id,
    uniqTheta(user_id) AS unique_users_reached
FROM ad_impressions
WHERE impression_date >= today() - 30
GROUP BY campaign_id
ORDER BY unique_users_reached DESC
LIMIT 10;
```

## Memory and Accuracy

The default sketch size k=4096 gives a relative error of approximately 3.125% at 95% confidence. Larger k values improve accuracy at the cost of more memory.

```sql
-- Compare uniqTheta with other approximate distinct functions
SELECT
    uniqExact(user_id)  AS exact,
    uniqHLL12(user_id)  AS hll12,
    uniqTheta(user_id)  AS theta
FROM events
WHERE event_date = today();
```

Each theta sketch state at default k occupies approximately 41 KB, which is larger than `uniqHLL12()` (~2.5 KB), but the sketch carries more information because it retains actual hash samples rather than register counts, enabling set operations.

## Using -State and -Merge for Pre-Aggregation

Theta sketches are most powerful when stored as intermediate states in `AggregatingMergeTree` tables, allowing fast incremental re-aggregation.

```sql
-- Create a materialized table for daily user sketches
CREATE TABLE daily_theta_sketches
(
    event_date    Date,
    country_code  String,
    user_sketch   AggregateFunction(uniqTheta, UInt64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (event_date, country_code);

-- Populate via materialized view
CREATE MATERIALIZED VIEW mv_daily_theta
TO daily_theta_sketches
AS
SELECT
    toDate(timestamp)       AS event_date,
    country_code,
    uniqThetaState(user_id) AS user_sketch
FROM events
GROUP BY event_date, country_code;

-- Query merged results
SELECT
    event_date,
    country_code,
    uniqThetaMerge(user_sketch) AS unique_users
FROM daily_theta_sketches
GROUP BY event_date, country_code
ORDER BY event_date DESC;
```

## Set Operations with uniqThetaIntersect, uniqThetaUnion, and uniqThetaNot

ClickHouse provides helper functions to perform set operations on theta sketch states: `uniqThetaUnion`, `uniqThetaIntersect`, and `uniqThetaNot`. These enable counting users in the intersection or difference of two groups without storing or scanning the raw data twice. Use `finalizeAggregation()` to convert the resulting sketch back into a numeric estimate.

```sql
-- Build theta sketch states for two segments
SELECT
    uniqThetaState(user_id) AS buyers_sketch
FROM events
WHERE event_type = 'purchase'
  AND event_date = today();

SELECT
    uniqThetaState(user_id) AS ad_viewers_sketch
FROM events
WHERE event_type = 'ad_view'
  AND event_date = today();
```

```sql
-- Estimate users who both viewed an ad AND made a purchase
-- using finalizeAggregation on the intersection sketch
SELECT finalizeAggregation(
    uniqThetaIntersect(buyers_sketch, ad_viewers_sketch)
) AS ad_conversion_reach
FROM (
    SELECT
        uniqThetaState(user_id) AS buyers_sketch
    FROM events
    WHERE event_type = 'purchase' AND event_date = today()
) AS b,
(
    SELECT
        uniqThetaState(user_id) AS ad_viewers_sketch
    FROM events
    WHERE event_type = 'ad_view' AND event_date = today()
) AS a;
```

## Using -If Combinator

```sql
-- Count distinct users in two segments in one pass
SELECT
    uniqThetaIf(user_id, platform = 'mobile') AS mobile_users,
    uniqThetaIf(user_id, platform = 'desktop') AS desktop_users,
    uniqTheta(user_id)                         AS total_users
FROM sessions
WHERE event_date = today();
```

## Comparison with Other Distinct Count Functions

| Function | Merge across shards | Set operations | Memory | Error |
|---|---|---|---|---|
| uniqExact | Yes (hash set merge, O(n) transfer) | No | O(n) | 0% |
| uniqHLL12 | Yes | No | ~2.5 KB | ~1.6% |
| uniqTheta | Yes | Yes (union/intersect/diff) | ~41 KB (k=4096) | ~3.125% |

Choose `uniqTheta()` when you need mergeable sketches that also support set operations for audience overlap or funnel analysis.

## Summary

`uniqTheta()` brings Apache DataSketches theta sketch cardinality estimation to ClickHouse, offering approximately 3.125% relative error (95% confidence) at the default k=4096 while uniquely enabling set operations (union, intersection, difference) on pre-aggregated sketch states. It integrates naturally with `AggregatingMergeTree` for incremental pre-aggregation and is the best choice when you need to answer questions like "how many users are in both segment A and segment B" without rescanning raw event data.
