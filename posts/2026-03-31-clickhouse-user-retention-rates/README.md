# How to Calculate User Retention Rates in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Retention, Cohort Analysis, retentionFunction, User Analytics

Description: Learn how to calculate user retention rates in ClickHouse using cohort analysis, the retentionFunction, and day-N retention queries for product analytics.

---

## Retention Analysis

Retention measures what fraction of users who performed an action on day 0 return to perform another action on day N. It is the most important indicator of product-market fit. ClickHouse has a built-in `retention` function that makes cohort retention analysis efficient.

## Cohort Retention with retentionFunction

The `retention` function takes a set of conditions and returns an array of which conditions each user satisfied:

```sql
SELECT
    cohort_week,
    sum(r[1]) AS week_0,
    sum(r[2]) AS week_1,
    sum(r[3]) AS week_2,
    sum(r[4]) AS week_3
FROM (
    SELECT
        toMonday(min_event) AS cohort_week,
        retention(
            event_time >= cohort_start,
            event_time >= cohort_start + INTERVAL 7 DAY AND event_time < cohort_start + INTERVAL 14 DAY,
            event_time >= cohort_start + INTERVAL 14 DAY AND event_time < cohort_start + INTERVAL 21 DAY,
            event_time >= cohort_start + INTERVAL 21 DAY AND event_time < cohort_start + INTERVAL 28 DAY
        ) AS r
    FROM (
        SELECT user_id, min(event_time) AS min_event,
            toMonday(min(event_time)) AS cohort_start
        FROM user_events GROUP BY user_id
    ) AS cohorts
    JOIN user_events USING user_id
    GROUP BY cohort_week, user_id
)
GROUP BY cohort_week
ORDER BY cohort_week;
```

## Day-N Retention

Simpler approach: calculate day-1, day-7, and day-30 retention for monthly cohorts:

```sql
WITH cohorts AS (
    SELECT user_id, toDate(min(event_time)) AS cohort_day
    FROM user_events GROUP BY user_id
),
activity AS (
    SELECT DISTINCT user_id, toDate(event_time) AS active_day
    FROM user_events
)
SELECT
    c.cohort_day,
    count(DISTINCT c.user_id) AS cohort_size,
    countDistinctIf(a1.user_id, a1.active_day = c.cohort_day + 1) AS day1_retained,
    countDistinctIf(a7.user_id, a7.active_day = c.cohort_day + 7) AS day7_retained,
    countDistinctIf(a30.user_id, a30.active_day = c.cohort_day + 30) AS day30_retained
FROM cohorts c
LEFT JOIN activity a1 ON c.user_id = a1.user_id
LEFT JOIN activity a7 ON c.user_id = a7.user_id
LEFT JOIN activity a30 ON c.user_id = a30.user_id
WHERE c.cohort_day >= today() - 90
GROUP BY c.cohort_day
ORDER BY c.cohort_day;
```

## Retention Percentages

Calculate retention as a percentage of the cohort size:

```sql
SELECT
    cohort_day,
    cohort_size,
    round(day1_retained / cohort_size * 100, 1) AS day1_pct,
    round(day7_retained / cohort_size * 100, 1) AS day7_pct,
    round(day30_retained / cohort_size * 100, 1) AS day30_pct
FROM retention_results
ORDER BY cohort_day;
```

## Retention by Segment

Compare retention across user acquisition channels:

```sql
SELECT
    u.acquisition_channel,
    count(DISTINCT c.user_id) AS cohort_size,
    round(countDistinctIf(a.user_id, a.active_day = c.cohort_day + 7)
        / count(DISTINCT c.user_id) * 100, 1) AS day7_retention_pct
FROM (
    SELECT user_id, toDate(min(event_time)) AS cohort_day
    FROM user_events GROUP BY user_id
) c
JOIN users u ON c.user_id = u.user_id
LEFT JOIN (
    SELECT DISTINCT user_id, toDate(event_time) AS active_day
    FROM user_events
) a ON c.user_id = a.user_id
WHERE c.cohort_day >= today() - 90
GROUP BY u.acquisition_channel
ORDER BY day7_retention_pct DESC;
```

## Summary

ClickHouse's `retention` function and cohort join patterns make retention analysis efficient. Build cohorts from first-event dates, join activity tables to check day-N presence, and express results as percentages. Segmenting by acquisition channel or feature usage reveals what drives long-term retention.
