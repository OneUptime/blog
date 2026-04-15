# How to Track Podcast Download Analytics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Podcast, Download Analytics, Listener Growth, Time Series

Description: Learn how to store podcast download events in ClickHouse and query listener counts, episode performance, and growth trends over time.

---

Podcast platforms need accurate download counts that reconcile IAB standards - deduplicating requests from the same IP within a rolling window. ClickHouse handles this deduplication efficiently at query time using hash-based distinct counts, making it an excellent backend for podcast analytics.

## Schema

```sql
CREATE TABLE podcast_downloads
(
    ts           DateTime,
    show_id      UInt64,
    episode_id   UInt64,
    client_ip    IPv4,
    user_agent   String,
    country_code LowCardinality(FixedString(2)),
    bytes_sent   UInt64,
    duration_sec UInt32,
    completed    UInt8   -- 1 if >80% downloaded
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (show_id, episode_id, ts);
```

## IAB-Compliant Unique Download Count

Deduplicate the same IP within the same calendar day per episode:

```sql
SELECT
    episode_id,
    uniqExact(cityHash64(toString(client_ip), toDate(ts))) AS iab_downloads
FROM podcast_downloads
WHERE show_id = 7
  AND ts >= now() - INTERVAL 30 DAY
GROUP BY episode_id
ORDER BY iab_downloads DESC;
```

## Listener Growth Over Time

```sql
SELECT
    toStartOfWeek(ts) AS week,
    uniqExact(client_ip) AS unique_listeners
FROM podcast_downloads
WHERE show_id = 7
GROUP BY week
ORDER BY week;
```

## Top Episodes by Completion Rate

```sql
SELECT
    episode_id,
    count()          AS total_downloads,
    avg(completed)   AS completion_rate
FROM podcast_downloads
WHERE show_id = 7
  AND ts >= now() - INTERVAL 90 DAY
GROUP BY episode_id
HAVING total_downloads > 100
ORDER BY completion_rate DESC
LIMIT 10;
```

## Geographic Distribution

```sql
SELECT
    country_code,
    uniqExact(client_ip) AS listeners
FROM podcast_downloads
WHERE show_id = 7
  AND ts >= now() - INTERVAL 30 DAY
GROUP BY country_code
ORDER BY listeners DESC
LIMIT 20;
```

## Bandwidth Usage per Episode

```sql
SELECT
    episode_id,
    formatReadableSize(sum(bytes_sent)) AS bandwidth,
    count() AS downloads
FROM podcast_downloads
WHERE ts >= toStartOfMonth(now())
GROUP BY episode_id
ORDER BY sum(bytes_sent) DESC
LIMIT 20;
```

## Day-of-Week Download Pattern

```sql
SELECT
    toDayOfWeek(ts) AS day_of_week,
    count()         AS downloads
FROM podcast_downloads
WHERE show_id = 7
  AND ts >= now() - INTERVAL 90 DAY
GROUP BY day_of_week
ORDER BY day_of_week;
```

## Summary

ClickHouse is well-suited to podcast download analytics, supporting IAB-compliant deduplication via hash-based distinct counts, time-series listener growth queries, and completion rate analysis. Partition by day for efficient range scans. For large-scale listener counts where exact precision is not required, consider replacing `uniqExact` with `uniq` for better performance at the cost of a small approximation error.
