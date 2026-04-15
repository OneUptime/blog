# How to Model ClickHouse Growth Projections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Capacity Planning, Growth, Analytics, Infrastructure

Description: Build a data-driven growth projection model for ClickHouse clusters using historical ingestion trends to forecast storage, memory, and CPU needs.

---

Growth projections prevent surprise capacity crises. ClickHouse's `system` tables contain the historical data you need to build accurate forecasts.

## Historical Ingestion Rate

Query daily row counts to build a trend:

```sql
SELECT
    toDate(event_time) AS day,
    sum(rows) AS rows_ingested,
    formatReadableSize(sum(size_in_bytes)) AS bytes_ingested
FROM system.part_log
WHERE event_type = 'NewPart'
  AND event_time >= now() - INTERVAL 90 DAY
GROUP BY day
ORDER BY day;
```

Export this to a spreadsheet or plotting tool and fit a linear or exponential trendline.

## Storage Growth Model

```text
Current compressed size: 2 TB
Growth rate (from trend): 50 GB/day
Days until 80% of 10 TB capacity: (10,000 * 0.8 - 2,000) / 50 = 120 days
```

Query current total size:

```sql
SELECT
    formatReadableSize(sum(bytes_on_disk)) AS total_disk,
    formatReadableSize(sum(data_compressed_bytes)) AS total_compressed
FROM system.parts
WHERE active;
```

## Projecting with a Simple Query

```sql
WITH daily_growth AS (
    SELECT
        avg(daily_bytes) AS avg_bytes_per_day
    FROM (
        SELECT
            toDate(event_time) AS day,
            sum(size_in_bytes) AS daily_bytes
        FROM system.part_log
        WHERE event_type = 'NewPart'
          AND event_time >= now() - INTERVAL 30 DAY
        GROUP BY day
    )
)
SELECT
    today() + number AS projected_date,
    formatReadableSize(
        (SELECT sum(bytes_on_disk) FROM system.parts WHERE active)
        + avg_bytes_per_day * number
    ) AS projected_storage
FROM daily_growth, numbers(90)
ORDER BY projected_date;
```

## Building a Capacity Dashboard

Combine projections with current capacity limits in Grafana or a BI tool. Add a "days until full" panel that fires an alert via [OneUptime](https://oneuptime.com) when it drops below 30 days.

## Seasonal Adjustments

Multiply the base rate by expected traffic multipliers for known events (product launches, holidays):

```text
Normal daily rate: 50 GB
Black Friday multiplier: 3x
Black Friday peak: 150 GB/day for 3 days
Extra storage for event: 300 GB
```

## Summary

Growth projections for ClickHouse are straightforward when derived from `system.part_log`. Trend daily ingestion rates, model storage fill time, and feed the results into a capacity alert so teams have 30+ days to provision new nodes.
