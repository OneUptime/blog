# How to Parse and Analyze URLs at Scale in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Performance

Description: Learn how to combine ClickHouse URL functions at scale using materialized columns, pre-aggregation, and query patterns to analyse billions of URL records efficiently.

---

ClickHouse ships a comprehensive suite of URL functions: `protocol()`, `domain()`, `netloc()`, `path()`, `pathFull()`, `queryString()`, `fragment()`, `extractURLParameter()`, `topLevelDomain()`, `firstSignificantSubdomain()`, and more. Each function is fast on its own, but repeatedly calling multiple URL functions over billions of rows in ad-hoc queries adds up. This guide covers the patterns that make URL analysis fast and maintainable at scale.

## The Full URL Decomposition Query

```sql
-- One-shot decomposition of a URL into all its components
SELECT
    url,
    protocol(url)                        AS scheme,
    netloc(url)                          AS net_location,
    domain(url)                          AS host,
    topLevelDomain(url)                  AS tld,
    firstSignificantSubdomain(url)       AS brand,
    cutToFirstSignificantSubdomain(url)  AS registrable_domain,
    path(url)                            AS clean_path,
    queryString(url)                     AS qs,
    fragment(url)                        AS frag,
    extractURLParameter(url, 'utm_source')   AS utm_source,
    extractURLParameter(url, 'utm_medium')   AS utm_medium,
    extractURLParameter(url, 'utm_campaign') AS utm_campaign
FROM (
    SELECT 'https://www.example.com/blog/post?utm_source=google&utm_medium=cpc&utm_campaign=spring#comments' AS url
);
```

## Using Materialized Columns for Frequently Used Decompositions

When you run domain-level or path-level queries repeatedly, computing URL functions at query time on billions of rows is wasteful. Materialized columns compute once at insert time.

```sql
-- Add materialized columns to an existing access_log table
ALTER TABLE access_logs
    ADD COLUMN url_scheme    String MATERIALIZED protocol(url),
    ADD COLUMN url_host      String MATERIALIZED domain(url),
    ADD COLUMN url_brand     String MATERIALIZED cutToFirstSignificantSubdomain(url),
    ADD COLUMN url_path      String MATERIALIZED path(url),
    ADD COLUMN url_qs        String MATERIALIZED queryString(url),
    ADD COLUMN utm_source    String MATERIALIZED extractURLParameter(url, 'utm_source'),
    ADD COLUMN utm_medium    String MATERIALIZED extractURLParameter(url, 'utm_medium'),
    ADD COLUMN utm_campaign  String MATERIALIZED extractURLParameter(url, 'utm_campaign');
```

After populating, queries become simple column scans:

```sql
-- Fast query using materialized columns instead of function calls
SELECT
    url_brand,
    utm_campaign,
    count()          AS sessions,
    uniq(visitor_id) AS unique_users
FROM access_logs
WHERE event_date = yesterday()
  AND url_scheme = 'https'
  AND utm_source != ''
GROUP BY url_brand, utm_campaign
ORDER BY sessions DESC
LIMIT 30;
```

## Pre-Aggregated URL Statistics with AggregatingMergeTree

```sql
-- Create a pre-aggregated summary table for daily URL metrics
CREATE TABLE url_daily_stats
(
    log_date     Date,
    url_path     String,
    utm_source   String,
    utm_campaign String,
    views        AggregateFunction(count),
    unique_visitors AggregateFunction(uniq, UUID),
    avg_load_ms  AggregateFunction(avg, Float64)
)
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(log_date)
ORDER BY (log_date, url_path, utm_source, utm_campaign);

-- Populate via a Materialized View
CREATE MATERIALIZED VIEW url_daily_stats_mv
TO url_daily_stats
AS
SELECT
    toDate(ts)                                       AS log_date,
    path(url)                                        AS url_path,
    extractURLParameter(url, 'utm_source')           AS utm_source,
    extractURLParameter(url, 'utm_campaign')         AS utm_campaign,
    countState()                                     AS views,
    uniqState(visitor_id)                            AS unique_visitors,
    avgState(load_time_ms)                           AS avg_load_ms
FROM page_views
GROUP BY log_date, url_path, utm_source, utm_campaign;
```

## Efficient Top-N Queries with URL Functions

```sql
-- Top 20 landing paths from organic search (no utm parameters)
SELECT
    path(url)        AS landing_path,
    count()          AS landings,
    uniq(visitor_id) AS unique_visitors
FROM page_views
WHERE event_date BETWEEN today() - 30 AND today()
  AND extractURLParameter(url, 'utm_source') = ''
  AND queryString(url) = ''
GROUP BY landing_path
ORDER BY landings DESC
LIMIT 20;
```

## Multi-Level Rollup Using URLPathHierarchy()

```sql
-- Hierarchical page view rollup for a section tree
SELECT
    prefix,
    count()          AS views,
    uniq(visitor_id) AS unique_visitors,
    depth
FROM (
    SELECT
        visitor_id,
        arrayJoin(URLPathHierarchy(url)) AS prefix,
        length(URLPathHierarchy(url))    AS depth
    FROM page_views
    WHERE event_date = yesterday()
      AND startsWith(path(url), '/docs/')
)
GROUP BY prefix, depth
ORDER BY views DESC
LIMIT 30;
```

## Campaign UTM Coverage Check

```sql
-- What percentage of sessions arrive with full UTM tagging?
SELECT
    toDate(ts)                                                          AS session_date,
    count()                                                             AS total_sessions,
    countIf(extractURLParameter(url, 'utm_source') != '')               AS tagged_sessions,
    round(countIf(extractURLParameter(url, 'utm_source') != '') * 100.0
          / count(), 2)                                                 AS tagging_rate_pct
FROM page_views
WHERE event_date BETWEEN today() - 30 AND today()
GROUP BY session_date
ORDER BY session_date;
```

## Detecting High-Cardinality Query String Parameters

```sql
-- Which parameters have the most distinct values? (useful for cardinality analysis)
SELECT
    param_name,
    uniq(param_value) AS distinct_values,
    count()           AS occurrences
FROM (
    SELECT
        arrayJoin(extractURLParameters(url)) AS kv,
        splitByChar('=', kv)[1]             AS param_name,
        splitByChar('=', kv)[2]             AS param_value
    FROM page_views
    WHERE event_date = yesterday()
      AND queryString(url) != ''
)
GROUP BY param_name
ORDER BY distinct_values DESC
LIMIT 20;
```

## Summary

Scalable URL analysis in ClickHouse comes down to three principles: use materialized columns to compute URL decompositions at insert time rather than query time; use `AggregatingMergeTree` with materialized views to pre-aggregate high-frequency metrics; and choose the most specific URL function for each task rather than always parsing the full URL. Combined with ClickHouse's columnar execution, these patterns let you analyse billions of URL records in seconds.
