# How to Calculate CTR and CPM in Real-Time with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CTR, CPM, Ad Tech, Real-Time Analytics

Description: Calculate click-through rate and cost per mille in real time using ClickHouse for live advertising performance dashboards.

---

CTR (click-through rate) and CPM (cost per mille) are the two core KPIs in digital advertising. Calculating them in real time from raw event streams requires a database that can aggregate billions of rows with low latency. ClickHouse delivers exactly this.

## Core Metrics Definitions

- **CTR** = clicks / impressions * 100
- **CPM** = (total_spend / impressions) * 1000

## Live CTR and CPM by Campaign

```sql
SELECT
    campaign_id,
    sum(impressions) AS total_impressions,
    sum(clicks) AS total_clicks,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr_pct,
    round(sum(spend) / sum(impressions) * 1000, 4) AS cpm
FROM campaign_minute_stats
WHERE minute >= now() - INTERVAL 1 HOUR
GROUP BY campaign_id
ORDER BY total_impressions DESC;
```

## Materialized View for Real-Time Aggregation

Rather than querying raw event tables every time, pre-aggregate with a materialized view:

```sql
CREATE MATERIALIZED VIEW campaign_minute_stats
ENGINE = SummingMergeTree()
ORDER BY (minute, campaign_id, placement, device_type)
AS
SELECT
    toStartOfMinute(event_time) AS minute,
    campaign_id,
    placement,
    device_type,
    countIf(event_type = 'impression') AS impressions,
    countIf(event_type = 'click') AS clicks,
    sumIf(cost, event_type = 'impression') AS spend
FROM ad_events
GROUP BY minute, campaign_id, placement, device_type;
```

## CTR Trend Over the Last 24 Hours

```sql
SELECT
    toStartOfHour(minute) AS hour,
    campaign_id,
    sum(impressions) AS impressions,
    sum(clicks) AS clicks,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr_pct
FROM campaign_minute_stats
WHERE minute >= now() - INTERVAL 24 HOUR
GROUP BY hour, campaign_id
ORDER BY hour, campaign_id;
```

## CPM by Device Type

```sql
SELECT
    device_type,
    sum(impressions) AS impressions,
    round(sum(spend) / sum(impressions) * 1000, 4) AS cpm
FROM campaign_minute_stats
WHERE minute >= today()
GROUP BY device_type
ORDER BY cpm DESC;
```

## Comparing CTR Across Time Periods

Use conditional aggregation to compare current vs. previous period CTR side by side:

```sql
SELECT
    campaign_id,
    round(
        sumIf(clicks, minute >= today()) /
        sumIf(impressions, minute >= today()) * 100, 4
    ) AS ctr_today,
    round(
        sumIf(clicks, minute >= today() - 1 AND minute < today()) /
        sumIf(impressions, minute >= today() - 1 AND minute < today()) * 100, 4
    ) AS ctr_yesterday
FROM campaign_minute_stats
WHERE minute >= today() - 1
GROUP BY campaign_id
ORDER BY ctr_today DESC;
```

## Detecting CTR Anomalies

Flag campaigns with unusually high CTR that may indicate click fraud:

```sql
SELECT
    campaign_id,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr_pct
FROM campaign_minute_stats
WHERE minute >= now() - INTERVAL 15 MINUTE
GROUP BY campaign_id
HAVING ctr_pct > 10
ORDER BY ctr_pct DESC;
```

## Summary

ClickHouse materialized views convert raw ad event streams into pre-aggregated per-minute tables, making real-time CTR and CPM calculations instantaneous. Combining time-windowed queries with conditional aggregation gives advertisers live performance visibility and anomaly detection at scale.
