# How to Use deltaSum() and deltaSumTimestamp() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Aggregate Function, deltaSum, deltaSumTimestamp, Time Series, Monitoring

Description: Learn how deltaSum() and deltaSumTimestamp() compute the sum of positive increments between consecutive values, ideal for monotonic counters and metric deltas.

---

Monotonic counters are everywhere in observability and analytics: request counts, bytes transferred, error totals. These counters only go up, but they occasionally reset. When you want to know the total increase over a time window, you do not want to subtract the first value from the last - you want to sum every positive step and ignore counter resets. That is exactly what `deltaSum()` solves. Its companion `deltaSumTimestamp()` extends this by ordering values by a timestamp column before computing the deltas, making it safe to use even when rows are not stored in order.

## Understanding deltaSum()

`deltaSum()` is an aggregate function that takes a sequence of numeric values, computes the difference between each consecutive pair, and sums only the non-negative differences. Negative differences (counter resets or decreases) are discarded.

The function signature is:

```text
deltaSum(value)
```

The values are processed in the order they arrive in the aggregation group. If your data is already ordered (e.g., stored in a ReplacingMergeTree sorted by time), this is fine. If not, use `deltaSumTimestamp()` instead.

## Setting Up a Sample Table

Create a table to simulate a monotonic counter being scraped at regular intervals, such as a Prometheus-style counter metric.

```sql
CREATE TABLE metric_scrapes
(
    host        String,
    scraped_at  DateTime,
    counter_val UInt64
)
ENGINE = MergeTree()
ORDER BY (host, scraped_at);
```

Insert some sample data. Notice that the counter for `web-01` resets partway through, which is realistic for process restarts.

```sql
INSERT INTO metric_scrapes VALUES
    ('web-01', '2026-03-31 10:00:00', 100),
    ('web-01', '2026-03-31 10:01:00', 150),
    ('web-01', '2026-03-31 10:02:00', 200),
    -- counter reset after a process restart
    ('web-01', '2026-03-31 10:03:00', 10),
    ('web-01', '2026-03-31 10:04:00', 80),
    ('web-02', '2026-03-31 10:00:00', 500),
    ('web-02', '2026-03-31 10:01:00', 600),
    ('web-02', '2026-03-31 10:02:00', 700);
```

## Using deltaSum()

Compute the total positive increments per host over the observation window. Because the table is ordered by `(host, scraped_at)`, rows arrive in the correct order during aggregation.

```sql
SELECT
    host,
    deltaSum(counter_val) AS total_increase
FROM metric_scrapes
GROUP BY host
ORDER BY host;
```

Expected result:

```text
host    total_increase
web-01  170
web-02  200
```

For `web-01`: the increments are +50, +50, -190 (reset, discarded), +70 = 170. The reset is ignored.
For `web-02`: the increments are +100, +100 = 200.

## Handling Unordered Data with deltaSumTimestamp()

When rows may not be physically ordered by time (for example, after a deduplication merge, or when querying a distributed table), use `deltaSumTimestamp()`. It accepts a second argument - the timestamp column - and internally sorts values by that timestamp before computing deltas.

```text
deltaSumTimestamp(value, timestamp)
```

The timestamp column can be an integer, float, `Date`, or `DateTime` - any ordering column works.

```sql
SELECT
    host,
    deltaSumTimestamp(counter_val, scraped_at) AS total_increase
FROM metric_scrapes
GROUP BY host
ORDER BY host;
```

This produces the same result as before, but is safe even if the storage order changes:

```text
host    total_increase
web-01  170
web-02  200
```

## Combining with toStartOfMinute() for Time-Bucketed Deltas

A common use case is to compute per-minute or per-hour delta sums across a rolling window. Use `toStartOfInterval()` or `toStartOfMinute()` to bucket timestamps, then aggregate.

```sql
SELECT
    host,
    toStartOfMinute(scraped_at) AS minute,
    deltaSumTimestamp(counter_val, scraped_at) AS increase_in_minute
FROM metric_scrapes
GROUP BY host, minute
ORDER BY host, minute;
```

This breaks down the total increase per host per minute, useful for rate calculations and dashboards.

## Using deltaSum() with Float Values

`deltaSum()` also works with `Float32` and `Float64` columns, which is useful for metrics like cumulative CPU seconds.

```sql
CREATE TABLE cpu_usage
(
    host       String,
    ts         DateTime,
    cpu_total  Float64
)
ENGINE = MergeTree()
ORDER BY (host, ts);

INSERT INTO cpu_usage VALUES
    ('node-1', '2026-03-31 09:00:00', 1200.5),
    ('node-1', '2026-03-31 09:01:00', 1265.3),
    ('node-1', '2026-03-31 09:02:00', 1330.0);

SELECT
    host,
    deltaSumTimestamp(cpu_total, ts) AS cpu_seconds_consumed
FROM cpu_usage
GROUP BY host;
```

```text
host    cpu_seconds_consumed
node-1  129.5
```

## Practical Pattern: Rate Calculation

Because `deltaSum()` gives you the total increase over a window, you can divide by the window duration to get an average rate.

```sql
SELECT
    host,
    deltaSumTimestamp(counter_val, scraped_at)
        / dateDiff('second',
            min(scraped_at),
            max(scraped_at)) AS requests_per_second
FROM metric_scrapes
GROUP BY host
ORDER BY host;
```

This pattern is equivalent to what Prometheus calls `rate()`, and it correctly handles counter resets.

## Using deltaSum() in a Materialized View

For continuous aggregation, you can store intermediate states using the `-State` combinator and merge them later. However, for simpler pipelines, a materialized view with `deltaSumTimestamp()` directly is often sufficient.

```sql
CREATE MATERIALIZED VIEW hourly_counter_deltas
ENGINE = SummingMergeTree()
ORDER BY (host, hour)
AS
SELECT
    host,
    toStartOfHour(scraped_at) AS hour,
    deltaSumTimestamp(counter_val, scraped_at) AS total_increase
FROM metric_scrapes
GROUP BY host, hour;
```

Querying this view gives pre-aggregated hourly increments without scanning the full raw table.

## Summary

`deltaSum()` and `deltaSumTimestamp()` are purpose-built for monotonic counter analytics in ClickHouse. Use `deltaSum()` when your data is already ordered correctly in storage, and prefer `deltaSumTimestamp()` whenever ordering is not guaranteed - it accepts a timestamp argument and sorts internally before computing deltas. Both functions discard negative differences, making them resilient to counter resets. Combined with time bucketing functions and materialized views, they form a powerful foundation for observability pipelines that compute rates, totals, and metric growth over time.
