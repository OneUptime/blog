# How to Build Campaign Performance Dashboards with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Ad Tech, Dashboard, Campaign Analytics, Visualization

Description: Build real-time campaign performance dashboards with ClickHouse queries that power live advertising KPI reporting.

---

Campaign performance dashboards need to surface spend, reach, CTR, and conversion data with minimal latency. ClickHouse makes this possible by serving aggregated queries in milliseconds even over months of historical data.

## Campaign Summary Table

Pre-aggregate data for dashboard queries using a daily summary:

```sql
CREATE TABLE campaign_daily_stats (
    date            Date,
    campaign_id     UInt32,
    campaign_name   String,
    advertiser_id   UInt32,
    impressions     UInt64,
    clicks          UInt64,
    conversions     UInt64,
    spend           Float64,
    revenue         Float64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, campaign_id);
```

## Dashboard: Campaign Overview

```sql
SELECT
    campaign_id,
    campaign_name,
    sum(impressions) AS impressions,
    sum(clicks) AS clicks,
    sum(conversions) AS conversions,
    sum(spend) AS total_spend,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr,
    round(sum(conversions) / sum(clicks) * 100, 2) AS cvr,
    round(sum(spend) / sum(conversions), 2) AS cpa
FROM campaign_daily_stats
WHERE date BETWEEN today() - 30 AND today()
GROUP BY campaign_id, campaign_name
ORDER BY total_spend DESC;
```

## Daily Trend for a Single Campaign

```sql
SELECT
    date,
    sum(impressions) AS impressions,
    sum(clicks) AS clicks,
    sum(spend) AS spend,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr,
    round(sum(spend) / sum(impressions) * 1000, 4) AS cpm
FROM campaign_daily_stats
WHERE campaign_id = 42
  AND date >= today() - 30
GROUP BY date
ORDER BY date;
```

## Budget Utilization

Compare actual spend against budgets stored in a separate dimension table:

```sql
SELECT
    s.campaign_id,
    s.campaign_name,
    sum(s.spend) AS total_spend,
    b.daily_budget,
    round(sum(s.spend) / (b.daily_budget * 30) * 100, 1) AS budget_utilization_pct
FROM campaign_daily_stats AS s
JOIN campaign_budgets AS b ON s.campaign_id = b.campaign_id
WHERE s.date >= today() - 30
GROUP BY s.campaign_id, s.campaign_name, b.daily_budget
ORDER BY budget_utilization_pct DESC;
```

## Performance by Advertiser

Roll up metrics to advertiser level for agency-level dashboards:

```sql
SELECT
    advertiser_id,
    sum(impressions) AS impressions,
    sum(clicks) AS clicks,
    sum(spend) AS spend,
    round(sum(spend) / sum(impressions) * 1000, 4) AS cpm,
    round(sum(clicks) / sum(impressions) * 100, 4) AS ctr
FROM campaign_daily_stats
WHERE date = today() - 1
GROUP BY advertiser_id
ORDER BY spend DESC;
```

## Week-over-Week Comparison

```sql
SELECT
    campaign_id,
    round(sumIf(spend, date >= today() - 7) / 7, 2) AS avg_daily_spend_this_week,
    round(sumIf(spend, date BETWEEN today() - 14 AND today() - 8) / 7, 2) AS avg_daily_spend_last_week,
    round(
        (sumIf(spend, date >= today() - 7) - sumIf(spend, date BETWEEN today() - 14 AND today() - 8)) /
        sumIf(spend, date BETWEEN today() - 14 AND today() - 8) * 100,
        1
    ) AS wow_change_pct
FROM campaign_daily_stats
WHERE date >= today() - 14
GROUP BY campaign_id
ORDER BY wow_change_pct DESC;
```

## Summary

ClickHouse's SummingMergeTree engine and columnar storage allow campaign dashboards to serve queries across millions of rows in under a second. Daily summary tables reduce the need to scan raw impression logs, while conditional aggregation enables side-by-side period comparisons in a single pass.
