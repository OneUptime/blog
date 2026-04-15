# How to Track Page Views and Sessions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Web Analytics, Session, Page View, Analytics, SQL

Description: Build a page view and session tracking system in ClickHouse using raw event tables, materialized views for session reconstruction, and example analytics queries.

---

Tracking page views and sessions is the foundation of web analytics. ClickHouse handles high-volume event ingestion and fast aggregation queries that power dashboards showing traffic trends and user behavior.

## Schema Design

Create a raw page view events table:

```sql
CREATE TABLE page_views (
    event_id    UUID DEFAULT generateUUIDv4(),
    session_id  String,
    user_id     UInt64,
    path        LowCardinality(String),
    referrer    String,
    user_agent  String,
    ip          IPv4,
    created_at  DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (created_at, session_id);
```

## Inserting Page Views

```sql
INSERT INTO page_views
    (session_id, user_id, path, referrer, user_agent, ip)
VALUES
    ('sess_abc123', 42, '/pricing', 'https://google.com', 'Mozilla/5.0...', '192.168.1.1'),
    ('sess_abc123', 42, '/signup',  'https://google.com', 'Mozilla/5.0...', '192.168.1.1');
```

## Materialized View for Session Aggregates

Pre-aggregate session statistics to speed up dashboard queries:

```sql
CREATE TABLE session_stats (
    date         Date,
    session_id   String,
    user_id      UInt64,
    page_count   UInt32,
    first_path   String,
    last_path    String,
    first_seen   DateTime,
    last_seen    DateTime,
    duration_sec UInt32
) ENGINE = ReplacingMergeTree(last_seen)
ORDER BY (date, session_id);

CREATE MATERIALIZED VIEW session_stats_mv
TO session_stats AS
SELECT
    toDate(created_at) AS date,
    session_id,
    any(user_id) AS user_id,
    count() AS page_count,
    argMin(path, created_at) AS first_path,
    argMax(path, created_at) AS last_path,
    min(created_at) AS first_seen,
    max(created_at) AS last_seen,
    toUInt32(dateDiff('second', min(created_at), max(created_at))) AS duration_sec
FROM page_views
GROUP BY date, session_id;
```

## Daily Page Views and Unique Sessions

```sql
SELECT
    toDate(created_at) AS date,
    count() AS page_views,
    uniq(session_id) AS sessions,
    uniq(user_id) AS users
FROM page_views
WHERE created_at >= today() - 30
GROUP BY date
ORDER BY date;
```

## Top Pages by Views

```sql
SELECT
    path,
    count() AS views,
    uniq(session_id) AS sessions,
    uniq(user_id) AS unique_users
FROM page_views
WHERE created_at >= today() - 7
GROUP BY path
ORDER BY views DESC
LIMIT 20;
```

## Average Session Duration

```sql
SELECT
    avg(page_count) AS avg_pages_per_session,
    avg(duration_sec) AS avg_duration_sec,
    count() AS total_sessions
FROM session_stats FINAL
WHERE date >= today() - 7;
```

## Bounce Rate Calculation

A bounce is a session with only one page view:

```sql
SELECT
    countIf(page_count = 1) AS bounces,
    count() AS total_sessions,
    round(100 * bounces / total_sessions, 2) AS bounce_rate_pct
FROM session_stats FINAL
WHERE date >= today() - 7;
```

## Entry Pages

```sql
SELECT
    first_path AS entry_page,
    count() AS sessions
FROM session_stats FINAL
WHERE date >= today() - 7
GROUP BY entry_page
ORDER BY sessions DESC
LIMIT 10;
```

## Summary

ClickHouse handles page view tracking at scale through a raw events table for ingestion and a materialized view for pre-aggregated session statistics. The combination enables fast dashboard queries over millions of events while supporting real-time data analysis.
