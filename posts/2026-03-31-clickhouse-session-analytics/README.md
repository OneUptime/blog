# How to Build Session Analytics in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Session Analytics, Sessionization, Window Function, User Analytics

Description: Learn how to build session analytics in ClickHouse, including sessionizing raw events, computing session metrics, and analyzing session quality and drop-off patterns.

---

## Session Analytics Overview

Sessions group user events into discrete visits. Session analytics measure engagement: how long users stay, how many pages they view, where they drop off, and how sessions vary by device or channel. ClickHouse window functions enable efficient sessionization directly in SQL.

## Sessionizing Events

Assign a session ID by detecting idle gaps greater than 30 minutes:

```sql
CREATE TABLE sessions AS (
    SELECT
        user_id,
        event_time,
        event_type,
        page_url,
        sum(new_session_flag) OVER (
            PARTITION BY user_id ORDER BY event_time
        ) AS session_id
    FROM (
        SELECT
            user_id,
            event_time,
            event_type,
            page_url,
            if(
                dateDiff('minute',
                    lag(event_time, 1, event_time - INTERVAL 31 MINUTE)
                        OVER (PARTITION BY user_id ORDER BY event_time),
                    event_time
                ) > 30, 1, 0
            ) AS new_session_flag
        FROM raw_events
        WHERE event_time >= today() - 30
    )
);
```

## Session-Level Aggregation

Compute per-session metrics:

```sql
SELECT
    user_id,
    session_id,
    min(event_time) AS session_start,
    max(event_time) AS session_end,
    dateDiff('second', min(event_time), max(event_time)) AS session_duration_s,
    count() AS page_views,
    countIf(event_type = 'purchase') AS purchases,
    argMin(page_url, event_time) AS landing_page,
    argMax(page_url, event_time) AS exit_page
FROM sessions
GROUP BY user_id, session_id
ORDER BY session_start DESC;
```

## Bounce Rate

Sessions with only one page view are bounces:

```sql
SELECT
    toDate(session_start) AS day,
    count() AS total_sessions,
    countIf(page_views = 1) AS bounces,
    round(countIf(page_views = 1) / count() * 100, 2) AS bounce_rate_pct
FROM session_metrics
WHERE session_start >= today() - 30
GROUP BY day
ORDER BY day;
```

## Average Session Duration

Exclude outliers (sessions > 2 hours) that likely represent idle tabs:

```sql
SELECT
    round(avg(session_duration_s) / 60, 2) AS avg_session_min,
    quantile(0.5)(session_duration_s) / 60 AS median_session_min,
    quantile(0.9)(session_duration_s) / 60 AS p90_session_min
FROM session_metrics
WHERE session_duration_s BETWEEN 5 AND 7200
  AND session_start >= today() - 7;
```

## Sessions by Landing Page

Identify which pages attract longer sessions:

```sql
SELECT
    landing_page,
    count() AS sessions,
    round(avg(session_duration_s) / 60, 2) AS avg_duration_min,
    round(avg(page_views), 1) AS avg_pages,
    round(countIf(page_views = 1) / count() * 100, 2) AS bounce_rate
FROM session_metrics
WHERE session_start >= today() - 7
GROUP BY landing_page
HAVING sessions > 100
ORDER BY sessions DESC
LIMIT 20;
```

## Summary

ClickHouse session analytics starts with window-based sessionization using gap detection, then aggregates session-level metrics per user per session. Bounce rate, session duration percentiles, and landing-page analysis reveal engagement quality. These patterns scale to billions of raw events using ClickHouse's parallel aggregation.
