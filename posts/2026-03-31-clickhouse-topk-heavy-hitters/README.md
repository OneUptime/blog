# How to Use topK for Heavy Hitters Detection in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TopK, Heavy Hitter, Approximate Query, Streaming Analytics

Description: Learn how to use topK and topKWeighted in ClickHouse to efficiently detect the most frequent elements in large data streams.

---

## What Are Heavy Hitters?

Heavy hitters are items that appear disproportionately often in a dataset - the top URLs generating traffic, the most frequent error codes, or the most active users. Finding them exactly requires sorting all distinct values, which is expensive. ClickHouse's `topK` function uses a variant of the Space-Saving algorithm (specifically, the Filtered Space-Saving algorithm) to find heavy hitters approximately with very low memory overhead.

## Basic topK Usage

```sql
-- Find the 10 most frequent URLs in today's access log
SELECT topK(10)(url)
FROM access_logs
WHERE toDate(timestamp) = today();
```

The result is an array of the top-k most frequent items:

```text
["https://example.com/api/v1","https://example.com/login","https://example.com/","..."]
```

## topKWeighted for Weighted Frequencies

When each event has a weight (e.g., bytes transferred), use the weighted variant:

```sql
SELECT topKWeighted(5)(url, bytes_transferred)
FROM access_logs
WHERE toDate(timestamp) = today();
```

This finds URLs responsible for the most total data transferred, not just the most requests.

## Combining topK with Other Aggregations

```sql
SELECT
    service,
    topK(5)(endpoint)         AS top_endpoints,
    count()                    AS total_requests,
    avg(response_time_ms)      AS avg_latency
FROM http_logs
WHERE toDate(timestamp) = today()
GROUP BY service
ORDER BY total_requests DESC;
```

## Detecting Error Spikes per Host

```sql
SELECT
    host,
    topK(3)(error_code) AS frequent_errors,
    countIf(status >= 500) AS error_count
FROM http_logs
WHERE toDate(timestamp) = today()
GROUP BY host
HAVING error_count > 100
ORDER BY error_count DESC;
```

## Storing topK States for Incremental Updates

Use `AggregatingMergeTree` to maintain running topK states:

```sql
CREATE MATERIALIZED VIEW top_urls_mv
ENGINE = AggregatingMergeTree()
ORDER BY hour
AS
SELECT
    toStartOfHour(timestamp) AS hour,
    topKState(20)(url)       AS url_topk
FROM access_logs
GROUP BY hour;
```

Query and merge:

```sql
SELECT topKMerge(20)(url_topk) AS top_urls
FROM top_urls_mv
WHERE hour >= now() - INTERVAL 24 HOUR;
```

## Accuracy and Guarantees

The original Space-Saving algorithm provides these theoretical guarantees:
- Any item with frequency greater than `total / (k + 1)` will appear in the result
- Frequencies are overestimated by at most `total / (k + 1)`

For a dataset of 1 million events with `topK(10)`, this means items with frequency above 90,909 (~1/11 of total) would be captured, with at most 90,909 overcount.

Note that ClickHouse uses a Filtered Space-Saving variant, and the documentation states that the function does not provide guaranteed results — in certain situations, errors can occur and it may return frequent values that are not the actual most frequent values. In practice, it works well for identifying heavy hitters, but should not be relied upon for exact guarantees.

## Comparing topK vs Exact COUNT Group By

```sql
-- Exact (expensive at scale)
SELECT url, count() AS cnt
FROM access_logs
GROUP BY url
ORDER BY cnt DESC
LIMIT 10;

-- Approximate (fast, low memory)
SELECT topK(10)(url) AS top_urls
FROM access_logs;
```

For datasets with millions of distinct URLs, topK is orders of magnitude faster.

## Summary

ClickHouse's `topK` and `topKWeighted` functions provide an efficient, memory-bounded way to identify heavy hitters in data streams. By combining them with materialized views and AggregatingMergeTree, you can maintain real-time top-k statistics over continuously ingested data, enabling fast anomaly detection and traffic analysis without sorting billions of rows.
