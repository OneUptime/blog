# How to Use -Distinct Combinator in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, Distinct, Combinator, Analytics

Description: Learn how to use the -Distinct combinator in ClickHouse to apply aggregate functions only to distinct (unique) values, similar to SQL's COUNT DISTINCT.

---

## What Is the -Distinct Combinator

The `-Distinct` combinator modifies any aggregate function to only consider distinct (unique) values before aggregating. It is similar to adding `DISTINCT` inside a SQL aggregate function.

For example:
- `sumDistinct(x)` sums only unique values of `x`
- `countDistinct(x)` counts unique values (equivalent to `uniqExact(x)`)
- `avgDistinct(x)` averages only unique values

```sql
-- Without -Distinct
SELECT sum(product_id) FROM orders;  -- sums all product_id values including duplicates

-- With -Distinct
SELECT sumDistinct(product_id) FROM orders;  -- sums only unique product_id values
```

## Syntax

The `-Distinct` combinator is appended to any aggregate function name:

```sql
SELECT
    countDistinct(user_id) AS unique_users,
    sumDistinct(product_id) AS sum_of_distinct_products,
    avgDistinct(price) AS avg_distinct_price,
    minDistinct(category) AS min_distinct_category,
    maxDistinct(score) AS max_distinct_score
FROM orders;
```

## Common Use Cases

### Counting Distinct Values

```sql
CREATE TABLE page_views (
    ts DateTime,
    user_id UInt64,
    session_id UInt64,
    page String,
    referrer String
) ENGINE = MergeTree()
ORDER BY ts;

-- Count distinct users and sessions
SELECT
    toDate(ts) AS day,
    count() AS total_views,
    countDistinct(user_id) AS unique_users,
    countDistinct(session_id) AS unique_sessions,
    countDistinct(page) AS unique_pages
FROM page_views
GROUP BY day
ORDER BY day;
```

### sumDistinct for Billing

```sql
-- A product might appear multiple times in an order (different line items)
-- sumDistinct counts each product's price once
SELECT
    order_id,
    sum(unit_price) AS total_with_duplicates,
    sumDistinct(unit_price) AS sum_of_distinct_prices
FROM order_items
GROUP BY order_id;
```

### avgDistinct for Deduplication

```sql
-- Average of unique response times (ignore repeated measurements)
SELECT
    endpoint,
    avg(response_ms) AS avg_all,
    avgDistinct(response_ms) AS avg_distinct
FROM api_logs
GROUP BY endpoint;
```

## -Distinct vs uniq() and uniqExact()

```sql
-- For counting distinct values, prefer uniq() or uniqExact() over countDistinct()
-- uniq() is approximate but much faster for large datasets
-- countDistinct() and uniqExact() are exact but use more memory

SELECT
    countDistinct(user_id) AS exact_count,    -- exact, memory-intensive
    uniqExact(user_id) AS also_exact,         -- exact, same algorithm
    uniq(user_id) AS approximate              -- ~1% error, much faster
FROM large_events_table;
```

## Practical Example: Multi-Event Funnel

```sql
CREATE TABLE funnel_events (
    user_id UInt64,
    event LowCardinality(String),
    ts DateTime
) ENGINE = MergeTree()
ORDER BY (user_id, ts);

-- Unique users at each funnel step (using -Distinct)
SELECT
    countDistinct(user_id) AS all_users,
    countDistinctIf(user_id, event = 'signup') AS signed_up,
    countDistinctIf(user_id, event = 'onboarding_complete') AS onboarded,
    countDistinctIf(user_id, event = 'first_purchase') AS purchased
FROM funnel_events;

-- Conversion rates
WITH funnel AS (
    SELECT
        countDistinctIf(user_id, event = 'signup') AS signed_up,
        countDistinctIf(user_id, event = 'first_purchase') AS purchased
    FROM funnel_events
)
SELECT
    signed_up,
    purchased,
    round(purchased / signed_up * 100, 1) AS conversion_pct
FROM funnel;
```

## Combining -Distinct with -If

You can combine `-Distinct` and `-If` in some versions:

```sql
-- countDistinctIf: count distinct values where condition is true
SELECT
    countDistinctIf(user_id, country = 'US') AS us_unique_users,
    countDistinctIf(user_id, country = 'UK') AS uk_unique_users
FROM events;

-- This is equivalent to:
SELECT
    uniqExactIf(user_id, country = 'US') AS us_unique_users,
    uniqExactIf(user_id, country = 'UK') AS uk_unique_users
FROM events;
```

## Performance Notes

```sql
-- -Distinct requires building a hash set of values per group
-- For large datasets, it can use significant memory

-- Settings to limit memory usage for distinct operations
SET max_bytes_before_external_group_by = 10000000000;  -- 10GB before spill
SET group_by_overflow_mode = 'any';  -- approximate when overflow

-- For approximations, prefer uniq() over countDistinct()
SELECT
    date,
    uniq(user_id) AS approx_unique_users  -- much faster on large tables
FROM events
GROUP BY date;
```

## Summary

The `-Distinct` combinator in ClickHouse modifies aggregate functions to operate only on unique values within each group. It works with `count`, `sum`, `avg`, `min`, `max`, and other aggregate functions. The most common use is `countDistinct()` for unique value counting, though `uniq()` is preferred for large-scale approximate counting. Combine with `-If` via `countDistinctIf()` for conditional distinct counts in a single query pass.
