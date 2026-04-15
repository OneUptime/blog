# How to Build Publisher Analytics with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Publisher Analytics, Ad Tech, Monetization, Revenue Analytics

Description: Build a publisher analytics system in ClickHouse to track ad revenue, fill rates, and yield optimization across inventory.

---

Publishers need to understand which inventory generates the most revenue, which demand sources perform best, and how to optimize yield. ClickHouse handles the large volume of ad server events that underpin these decisions.

## Publisher Events Table

```sql
CREATE TABLE publisher_events (
    event_time      DateTime,
    publisher_id    UInt32,
    site_id         UInt32,
    placement_id    UInt32,
    demand_source   LowCardinality(String),
    event_type      LowCardinality(String),
    clearing_price  Float32,
    floor_price     Float32,
    date            Date DEFAULT toDate(event_time)
) ENGINE = MergeTree()
PARTITION BY date
ORDER BY (publisher_id, site_id, event_time);
```

## Revenue by Publisher

```sql
SELECT
    publisher_id,
    sum(clearing_price) AS gross_revenue,
    count() AS impressions,
    round(sum(clearing_price) / count() * 1000, 4) AS effective_cpm
FROM publisher_events
WHERE event_type = 'impression'
  AND date >= today() - 30
GROUP BY publisher_id
ORDER BY gross_revenue DESC;
```

## Fill Rate Analysis

Fill rate measures how much of the available inventory was actually sold:

```sql
SELECT
    placement_id,
    countIf(event_type = 'request') AS ad_requests,
    countIf(event_type = 'impression') AS filled,
    round(countIf(event_type = 'impression') / countIf(event_type = 'request') * 100, 2) AS fill_rate_pct
FROM publisher_events
WHERE date = today()
GROUP BY placement_id
ORDER BY fill_rate_pct ASC;
```

## Demand Source Comparison

Compare revenue and eCPM across demand partners to inform yield decisions:

```sql
SELECT
    demand_source,
    sum(clearing_price) AS revenue,
    count() AS impressions,
    round(sum(clearing_price) / count() * 1000, 4) AS ecpm,
    round(avg(clearing_price - floor_price), 4) AS avg_margin_over_floor
FROM publisher_events
WHERE event_type = 'impression'
  AND date >= today() - 7
GROUP BY demand_source
ORDER BY ecpm DESC;
```

## Floor Price Optimization

Find placements where floor prices may be set too high, causing low fill:

```sql
SELECT
    placement_id,
    avg(floor_price) AS avg_floor,
    avg(clearing_price) AS avg_clearing,
    round(avg(clearing_price) / avg(floor_price), 2) AS clearing_to_floor_ratio,
    round(countIf(event_type = 'impression') / countIf(event_type = 'request') * 100, 2) AS fill_rate_pct
FROM publisher_events
WHERE date >= today() - 7
GROUP BY placement_id
HAVING fill_rate_pct < 50
ORDER BY fill_rate_pct ASC;
```

## Revenue by Hour of Day

Understand intraday revenue patterns for scheduling and forecasting:

```sql
SELECT
    hour_of_day,
    round(avg(daily_rev), 2) AS avg_hourly_revenue
FROM (
    SELECT
        toHour(event_time) AS hour_of_day,
        toDate(event_time) AS day,
        sum(clearing_price) AS daily_rev
    FROM publisher_events
    WHERE event_type = 'impression'
      AND date >= today() - 30
    GROUP BY hour_of_day, day
)
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Summary

ClickHouse gives publishers a unified analytics layer over ad server logs, enabling revenue reporting, fill rate monitoring, and yield optimization without costly third-party tools. The combination of high write throughput and fast aggregation queries means publishers can act on insights with minimal delay.
