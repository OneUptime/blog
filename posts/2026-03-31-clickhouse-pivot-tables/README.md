# How to Implement Pivot Tables in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pivot Table, Conditional Aggregation, ARRAY JOIN, Analytics

Description: Implement pivot tables in ClickHouse using conditional aggregation and dynamic column generation to transform row-based data into columnar report formats.

---

## Pivot Tables in ClickHouse

SQL PIVOT is not a native ClickHouse keyword, but pivot table behavior is achieved through conditional aggregation (for known columns) or dynamic query generation (for variable columns). Both approaches are commonly used in analytics and reporting.

## Method 1: Static Pivot with Conditional Aggregation

When you know the pivot values in advance, use `sumIf` or `countIf`:

```sql
-- Monthly revenue by channel (channels are known in advance)
SELECT
    toStartOfMonth(order_time) AS month,
    sumIf(revenue, channel = 'organic') AS organic,
    sumIf(revenue, channel = 'paid_search') AS paid_search,
    sumIf(revenue, channel = 'social') AS social,
    sumIf(revenue, channel = 'email') AS email,
    sumIf(revenue, channel = 'direct') AS direct,
    sum(revenue) AS total
FROM orders
WHERE order_time >= today() - 365
GROUP BY month
ORDER BY month;
```

```sql
-- Pivot: events per day of week by event type
SELECT
    event_type,
    countIf(toDayOfWeek(event_time) = 1) AS monday,
    countIf(toDayOfWeek(event_time) = 2) AS tuesday,
    countIf(toDayOfWeek(event_time) = 3) AS wednesday,
    countIf(toDayOfWeek(event_time) = 4) AS thursday,
    countIf(toDayOfWeek(event_time) = 5) AS friday,
    countIf(toDayOfWeek(event_time) = 6) AS saturday,
    countIf(toDayOfWeek(event_time) = 7) AS sunday
FROM events
WHERE event_time >= today() - 30
GROUP BY event_type
ORDER BY event_type;
```

## Method 2: Dynamic Pivot Using Arrays

When pivot values are unknown at query time, aggregate to arrays and reshape in the application:

```sql
-- Get all channel-revenue pairs as arrays
SELECT
    order_month AS month,
    groupArray(channel) AS channels,
    groupArray(revenue_total) AS revenues
FROM (
    SELECT
        toStartOfMonth(order_time) AS order_month,
        channel,
        sum(revenue) AS revenue_total
    FROM orders
    WHERE order_time >= today() - 365
    GROUP BY order_month, channel
)
GROUP BY month
ORDER BY month;
```

## Method 3: CTE with Conditional Aggregation for Re-Pivot

```sql
-- Score matrix: users x categories
WITH raw AS (
    SELECT
        user_id,
        category,
        avg(score) AS avg_score
    FROM user_scores
    GROUP BY user_id, category
)
SELECT
    user_id,
    sumIf(avg_score, category = 'math') AS math_score,
    sumIf(avg_score, category = 'science') AS science_score,
    sumIf(avg_score, category = 'english') AS english_score
FROM raw
GROUP BY user_id
ORDER BY user_id
LIMIT 20;
```

## Dynamic Pivot in Application Code

For fully dynamic pivots, generate SQL from the distinct column values:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost')

# Step 1: Get distinct pivot values
channels = client.query(
    "SELECT DISTINCT channel FROM orders WHERE order_time >= today() - 30"
).result_rows
channel_list = [row[0] for row in channels]

# Step 2: Build dynamic SQL
pivot_cols = ',\n  '.join(
    f"sumIf(revenue, channel = '{ch}') AS \"{ch}\"" for ch in channel_list
)

query = f"""
SELECT
    toStartOfMonth(order_time) AS month,
    {pivot_cols}
FROM orders
WHERE order_time >= today() - 365
GROUP BY month
ORDER BY month
"""

result = client.query(query)
```

## Summary

ClickHouse implements pivot tables through conditional aggregation using `sumIf`, `countIf`, and `avgIf` with column-per-value patterns. For static pivot columns (known at development time), this is the simplest and fastest approach. For dynamic pivots where columns are determined at runtime, generate the SQL dynamically in your application layer using the distinct values as column definitions.
