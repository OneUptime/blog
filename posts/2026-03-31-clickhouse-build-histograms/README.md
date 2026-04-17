# How to Build Histograms in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Histogram, Distribution, histogram Function, Analytics

Description: Learn how to build histograms in ClickHouse using the histogram function, manual bucket definitions, and log-scale binning for distribution analysis.

---

## Histograms in Analytics

Histograms visualize the distribution of a numeric variable by grouping values into buckets and counting how many values fall in each bucket. They reveal skew, outliers, and multi-modal distributions that averages hide.

## Built-In histogram Function

ClickHouse's `histogram` function calculates an adaptive histogram using a streaming algorithm; you pass the maximum number of bins and it produces bins of (typically unequal) adaptive widths:

```sql
SELECT histogram(20)(latency_ms) AS hist
FROM requests
WHERE event_time >= today() - 1;
```

The result is an array of (lower, upper, count) tuples. Use `arrayJoin` to unpack:

```sql
SELECT
    round(tuple.1, 0) AS lower_bound,
    round(tuple.2, 0) AS upper_bound,
    round(tuple.3, 0) AS count
FROM (
    SELECT arrayJoin(histogram(20)(latency_ms)) AS tuple
    FROM requests
    WHERE event_time >= today() - 1
)
ORDER BY lower_bound;
```

## Manual Fixed-Width Buckets

For dashboards with consistent bucket widths:

```sql
SELECT
    intDiv(latency_ms, 50) * 50 AS bucket_start,
    intDiv(latency_ms, 50) * 50 + 50 AS bucket_end,
    count() AS requests,
    round(count() / sum(count()) OVER () * 100, 2) AS pct
FROM requests
WHERE event_time >= today() - 1
  AND latency_ms < 2000
GROUP BY bucket_start, bucket_end
ORDER BY bucket_start;
```

## Custom Named Buckets

Label common latency tiers explicitly:

```sql
SELECT
    multiIf(
        latency_ms < 50, '0-50ms',
        latency_ms < 100, '50-100ms',
        latency_ms < 200, '100-200ms',
        latency_ms < 500, '200-500ms',
        latency_ms < 1000, '500ms-1s',
        '>1s'
    ) AS latency_bucket,
    count() AS requests,
    round(count() / sum(count()) OVER () * 100, 2) AS pct
FROM requests
WHERE event_time >= today() - 1
GROUP BY latency_bucket
ORDER BY min(latency_ms);
```

## Log-Scale Histogram

For highly skewed distributions, use log-scale bins:

```sql
SELECT
    pow(10, floor(log10(latency_ms))) AS bucket_lower,
    pow(10, floor(log10(latency_ms)) + 1) AS bucket_upper,
    count() AS requests
FROM requests
WHERE latency_ms > 0
  AND event_time >= today() - 1
GROUP BY bucket_lower, bucket_upper
ORDER BY bucket_lower;
```

## 2D Histogram

Build a joint distribution of two metrics:

```sql
SELECT
    intDiv(latency_ms, 100) * 100 AS latency_bucket,
    intDiv(response_bytes, 1024) * 1024 AS size_bucket,
    count() AS requests
FROM requests
WHERE event_time >= today() - 1
GROUP BY latency_bucket, size_bucket
ORDER BY requests DESC
LIMIT 50;
```

## Summary

ClickHouse builds histograms with the built-in `histogram()` function for automatic binning, `intDiv` for fixed-width manual buckets, `multiIf` for labeled tiers, and log-scale transformations for skewed distributions. Histograms reveal the shape of distributions that averages and percentiles alone cannot capture.
