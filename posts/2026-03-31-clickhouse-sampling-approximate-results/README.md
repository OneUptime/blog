# How to Use Sampling for Approximate Query Results in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Sampling, Approximate Query, SAMPLE, Performance

Description: Learn how to use ClickHouse's SAMPLE clause to run queries on a fraction of data for faster approximate results on large tables.

---

ClickHouse's `SAMPLE` clause lets you query a statistically representative subset of rows instead of scanning the full table. This trades a small amount of accuracy for a large reduction in query time and I/O, making it ideal for exploratory analytics and dashboards on large datasets.

## Prerequisites - SAMPLE BY in Table Definition

For the `SAMPLE` clause to work, the table must be defined with a `SAMPLE BY` key in the `MergeTree` engine:

```sql
CREATE TABLE events
(
    user_id    UInt64,
    event_name String,
    event_time DateTime,
    revenue    Float64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (intHash32(user_id), event_time)
SAMPLE BY intHash32(user_id);
```

The `SAMPLE BY` expression must be part of the primary key (which defaults to `ORDER BY` when no explicit `PRIMARY KEY` is set). Using a hash function like `intHash32` ensures uniform distribution across the sample space, which is important for unbiased sampling when the column values are sequential or clustered.

## Running a Sampled Query

Sample by fraction:

```sql
SELECT
    event_name,
    count() * 10 AS approx_count  -- scale up for 10% sample
FROM events
SAMPLE 0.1
WHERE toDate(event_time) = today()
GROUP BY event_name
ORDER BY approx_count DESC;
```

Sample by approximate row count:

```sql
SELECT count() * 10 AS approx_total
FROM events
SAMPLE 1000000;  -- read approximately 1M rows
```

## Consistent Sampling with OFFSET

The `OFFSET` parameter selects a specific shard of data. Combined with `SAMPLE`, it enables reproducible results:

```sql
SELECT count() FROM events SAMPLE 0.1 OFFSET 0.5;
-- Reads shard starting at 50% of the hash space
```

## Compensating for Sample Rate

Always scale aggregate results by the inverse of the sample fraction:

```sql
SELECT
    toDate(event_time) AS day,
    countIf(revenue > 0) / 0.1 AS approx_paying_users,
    sum(revenue) / 0.1         AS approx_revenue
FROM events
SAMPLE 0.1
WHERE event_time >= now() - INTERVAL 30 DAY
GROUP BY day
ORDER BY day;
```

## Error Estimation

For a sample fraction `f` and count `n`, the relative standard error is approximately `1 / sqrt(n * f)`. At 10% sampling on 1 million rows (100K sampled), the error is ~0.3%.

## Using _sample_factor Virtual Column

```sql
SELECT
    count() * _sample_factor AS approx_count,
    sum(revenue) * _sample_factor AS approx_revenue
FROM events
SAMPLE 0.05;
```

`_sample_factor` contains the inverse of the actual sample rate used.

## When Sampling Works Best

- Counting events (counts scale linearly)
- Summing revenue or other additive metrics
- Computing approximate quantiles

## When NOT to Use Sampling

- Computing exact distinct counts (`uniqExact`)
- Finding specific records
- Compliance or billing queries requiring exactness

## Summary

ClickHouse's `SAMPLE` clause enables fast approximate analytics by reading a fraction of the data. With a properly defined `SAMPLE BY` key in your MergeTree table, you can run dashboard queries in milliseconds on billion-row tables. Scale results by the inverse sample rate and use `_sample_factor` to make the scaling automatic.
