# How to Create Aggregate UDFs in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Aggregate Function, User-Defined Function, Analytics

Description: Learn how to create aggregate user-defined functions in ClickHouse using C++ plugins and combinators to build custom aggregations beyond built-in functions.

---

## Aggregate UDFs vs Scalar UDFs

Scalar UDFs transform individual rows. Aggregate UDFs reduce groups of rows to a single value - like `count()`, `sum()`, or `quantile()`. ClickHouse supports aggregate UDFs via:

1. C++ source extensions (full custom aggregate functions - requires modifying and rebuilding ClickHouse, since there is no dynamic plugin API)
2. SQL function composition over existing aggregate functions and their combinators (note: `CREATE FUNCTION` itself only supports scalar lambdas)
3. `-State`/`-Merge` patterns with `AggregatingMergeTree`

## Approach 1: SQL Aggregate Composition

Use existing functions creatively. ClickHouse has rich aggregate combinators:

```sql
-- Calculate weighted average (not a built-in simple function)
SELECT
    category,
    sum(price * weight) / sum(weight) AS weighted_avg_price
FROM products
GROUP BY category;
```

Create a reusable SQL UDF for weighted average:

```sql
-- This is a scalar UDF used inside aggregate context
CREATE FUNCTION weighted_contribution AS (price, weight) ->
    price * weight;

SELECT
    category,
    sum(weighted_contribution(price, weight)) / sum(weight) AS weighted_avg
FROM products
GROUP BY category;
```

## Approach 2: Aggregate Combinators

Use ClickHouse's `-If`, `-Array`, `-Map` combinators:

```sql
-- Count only positive values
SELECT sumIf(value, value > 0) AS positive_sum FROM data;

-- Count distinct users who converted
SELECT uniqIf(user_id, action = 'purchase') AS converting_users FROM events;

-- Sum across array elements
SELECT sumArray(prices_array) AS total FROM order_arrays;
```

## Using AggregateFunctions as UDF Building Blocks

Store intermediate aggregate states for later merging:

```sql
CREATE TABLE daily_metrics_state (
    day Date,
    segment LowCardinality(String),
    revenue_state AggregateFunction(sum, Float64),
    users_state AggregateFunction(uniq, UInt64),
    p99_latency_state AggregateFunction(quantile(0.99), UInt32)
) ENGINE = AggregatingMergeTree()
ORDER BY (day, segment);

-- Populate
INSERT INTO daily_metrics_state
SELECT
    toDate(event_time),
    segment,
    sumState(revenue),
    uniqState(user_id),
    quantileState(0.99)(latency_ms)
FROM events
GROUP BY 1, 2;

-- Query with merge
SELECT
    day,
    segment,
    sumMerge(revenue_state) AS total_revenue,
    uniqMerge(users_state) AS unique_users,
    quantileMerge(0.99)(p99_latency_state) AS p99_ms
FROM daily_metrics_state
GROUP BY day, segment
ORDER BY day DESC;
```

## Approach 3: Custom Aggregate via Executable

For truly custom aggregations, process grouped data externally:

```python
#!/usr/bin/env python3
# /var/lib/clickhouse/user_scripts/custom_agg.py
# Reads values, outputs a custom aggregate
import sys
import math

values = []
for line in sys.stdin:
    line = line.strip()
    if line:
        values.append(float(line))

if values:
    # Custom metric: harmonic mean
    result = len(values) / sum(1/x for x in values if x != 0)
    print(f'{result:.6f}')
else:
    print('0')
```

## List Available Aggregate Functions

```sql
SELECT name, case_insensitive
FROM system.functions
WHERE is_aggregate = 1
ORDER BY name
LIMIT 30;
```

## Summary

ClickHouse aggregate UDFs can be achieved through SQL function composition, aggregate combinators, AggregateFunction state columns, and external executable scripts. The most practical approach is combining built-in combinators and AggregatingMergeTree patterns, which cover most custom aggregation needs without writing C++ plugins.
