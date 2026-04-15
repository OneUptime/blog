# How to Use uniqUpTo() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, uniqUpTo, Count Distinct

Description: Count exact distinct values up to a threshold N using uniqUpTo() in ClickHouse - returns N+1 when the exact count exceeds N, enabling efficient freemium and limit checks.

---

Counting exact distinct values is expensive at scale. Most of the time you do not need the precise number - you need to know whether it is above or below a threshold. ClickHouse's `uniqUpTo(N)` function exploits this by tracking exact distinct values only up to `N`. Once the count exceeds `N` it stops tracking and returns `N+1`, signaling "more than N." This makes it dramatically cheaper than `uniq()` or `uniqExact()` for limit-checking scenarios.

## Syntax

```sql
uniqUpTo(N)(column)
```

- `N` - the threshold (max 100).
- `column` - the expression whose distinct values you want to count.

Returns `UInt64`. If the actual count is <= N, the return value is exact. If the actual count exceeds N, the return value is `N + 1`.

## Basic Example

```sql
SELECT uniqUpTo(5)(number % 4) AS distinct_count
FROM numbers(100);
-- Returns 4 (exact, because 4 <= 5)

SELECT uniqUpTo(5)(number % 10) AS distinct_count
FROM numbers(100);
-- Returns 6 (i.e., N+1, meaning "more than 5")
```

## Freemium Seat Limit Check

Suppose a SaaS product allows up to 5 users per free-tier workspace:

```sql
CREATE TABLE workspace_users
(
    workspace_id UInt32,
    user_id      UInt32,
    joined_at    DateTime
)
ENGINE = MergeTree()
ORDER BY (workspace_id, user_id);

INSERT INTO workspace_users VALUES
    (1, 101, '2024-01-01'), (1, 102, '2024-01-02'), (1, 103, '2024-01-03'),
    (2, 201, '2024-01-01'), (2, 202, '2024-01-01'), (2, 203, '2024-01-02'),
    (2, 204, '2024-01-03'), (2, 205, '2024-01-04'), (2, 206, '2024-01-05'),
    (2, 207, '2024-01-06');
```

```sql
SELECT
    workspace_id,
    uniqUpTo(5)(user_id)         AS user_count,
    user_count > 5               AS over_limit
FROM workspace_users
GROUP BY workspace_id
ORDER BY workspace_id;
```

```text
workspace_id | user_count | over_limit
-------------|------------|----------
1            | 3          | 0
2            | 6          | 1
```

Workspace 2 has 7 actual users, but `uniqUpTo(5)` returns 6 (= N+1), and `over_limit = 1` correctly flags it.

## Comparing uniqUpTo vs uniq vs uniqExact

```sql
SELECT
    workspace_id,
    uniqUpTo(5)(user_id)   AS exact_up_to_5,
    uniq(user_id)          AS approx_count,
    uniqExact(user_id)     AS exact_count
FROM workspace_users
GROUP BY workspace_id;
```

`uniqExact` is precise but requires full state. `uniq` uses a compact approximate-distinct algorithm and is approximate. `uniqUpTo` is exact up to N and then caps - perfect for threshold checks.

## API Rate Limit Tracking

Track whether any API key exceeded 10 unique endpoints called in the last hour:

```sql
CREATE TABLE api_calls
(
    api_key   String,
    endpoint  String,
    called_at DateTime
)
ENGINE = MergeTree()
ORDER BY (api_key, called_at);
```

```sql
SELECT
    api_key,
    uniqUpTo(10)(endpoint)           AS endpoint_count,
    endpoint_count > 10              AS rate_limited
FROM api_calls
WHERE called_at >= now() - INTERVAL 1 HOUR
GROUP BY api_key
HAVING rate_limited = 1;
```

## Materialized View Pattern for Continuous Limit Checking

```sql
CREATE MATERIALIZED VIEW workspace_user_counts
ENGINE = AggregatingMergeTree()
ORDER BY workspace_id
AS
SELECT
    workspace_id,
    uniqUpToState(5)(user_id) AS user_count_state
FROM workspace_users
GROUP BY workspace_id;
```

Query the materialized view using `-Merge`:

```sql
SELECT
    workspace_id,
    uniqUpToMerge(5)(user_count_state) AS user_count
FROM workspace_user_counts
GROUP BY workspace_id;
```

## Limitations

- `N` must be between 1 and 100. For larger thresholds use `uniq()` or `uniqExact()`.
- The function uses O(N) memory per group (stores up to N hash values), so keep N reasonable when grouping by high-cardinality keys.

## Summary

`uniqUpTo(N)(column)` counts exact distinct values up to N and returns N+1 when exceeded, making it ideal for enforcing freemium limits, rate caps, and threshold alerts without the overhead of a full exact-count. Combine it with `-State` / `-Merge` combiners in materialized views to maintain running distinct counts incrementally. For scenarios where the threshold is above 100, fall back to `uniqExact` or approximate functions.
