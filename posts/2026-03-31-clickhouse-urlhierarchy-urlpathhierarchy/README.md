# How to Use URLHierarchy() and URLPathHierarchy() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Hierarchy

Description: Learn how URLHierarchy() and URLPathHierarchy() generate arrays of parent URL prefixes in ClickHouse, enabling breadcrumb analysis, funnel tracking, and tree roll-ups.

---

`URLHierarchy(url)` returns an `Array(String)` containing every prefix of the URL, truncated at the `/`, `?`, and `#` symbols. The scheme, host, and each successive path depth are all represented as separate array entries.

`URLPathHierarchy(url)` is similar but starts from the first `/` of the path only, omitting the scheme and host portions. This is useful when you want path-level roll-ups without the domain.

Both functions are powerful for building tree structures from URL paths - for example, rolling up page-view metrics from leaf pages to their parent sections.

## Basic Usage

```sql
-- Show all URL hierarchy levels for a sample URL
SELECT
    url,
    URLHierarchy(url)     AS full_hierarchy,
    URLPathHierarchy(url) AS path_hierarchy
FROM (
    SELECT 'https://example.com/blog/2024/clickhouse-tips/' AS url
);
```

```text
url                                              full_hierarchy
https://example.com/blog/2024/clickhouse-tips/  ['https://example.com/','https://example.com/blog/','https://example.com/blog/2024/','https://example.com/blog/2024/clickhouse-tips/']

path_hierarchy
['/blog/','/blog/2024/','/blog/2024/clickhouse-tips/']
```

## Aggregating Page Views at Every Level

```sql
-- Roll up page views from leaf pages to all parent path levels
SELECT
    prefix,
    count()          AS page_views,
    uniq(visitor_id) AS unique_visitors
FROM (
    SELECT
        visitor_id,
        arrayJoin(URLPathHierarchy(url)) AS prefix
    FROM page_views
    WHERE event_date = yesterday()
      AND url != ''
)
GROUP BY prefix
ORDER BY page_views DESC
LIMIT 30;
```

## Building a Section-Level Traffic Report

```sql
-- Summarise traffic by top-level section using URLPathHierarchy
SELECT
    -- The first element of URLPathHierarchy is the top-level section
    URLPathHierarchy(url)[1]  AS top_section,
    count()                   AS hits,
    uniq(visitor_id)          AS unique_visitors
FROM page_views
WHERE event_date = yesterday()
  AND length(URLPathHierarchy(url)) >= 1
GROUP BY top_section
ORDER BY hits DESC
LIMIT 20;
```

## Funnel Drop-Off Analysis by Path Depth

```sql
-- Count sessions that reached each depth of the URL hierarchy
SELECT
    length(URLPathHierarchy(url)) - 1   AS path_depth,
    count()                             AS sessions,
    uniq(visitor_id)                    AS unique_visitors
FROM page_views
WHERE event_date = yesterday()
GROUP BY path_depth
ORDER BY path_depth;
```

## Finding Orphan Pages (No Parent Traffic)

```sql
-- Pages that receive traffic but whose parent paths do not
WITH page_prefixes AS (
    SELECT DISTINCT arrayJoin(URLPathHierarchy(url)) AS prefix
    FROM page_views
    WHERE event_date = yesterday()
),
leaf_pages AS (
    SELECT DISTINCT path(url) AS leaf
    FROM page_views
    WHERE event_date = yesterday()
)
SELECT lp.leaf
FROM leaf_pages lp
LEFT JOIN page_prefixes pp
    ON lp.leaf = pp.prefix
WHERE pp.prefix IS NULL  -- no matching parent prefix entry
LIMIT 30;
```

## URLHierarchy() for Full URL Breadcrumbs

```sql
-- Generate breadcrumb arrays for use in a navigation report
SELECT
    url,
    URLHierarchy(url) AS breadcrumbs,
    length(URLHierarchy(url)) AS depth
FROM (
    SELECT DISTINCT url
    FROM page_views
    WHERE event_date = yesterday()
      AND path(url) LIKE '/docs/%'
)
ORDER BY depth DESC
LIMIT 20;
```

## Counting Hits Across All Hierarchy Levels

```sql
-- Full roll-up: every hierarchy prefix and its aggregated metrics
SELECT
    prefix,
    count()          AS total_views,
    uniq(visitor_id) AS unique_visitors,
    avg(load_time_ms) AS avg_load_ms
FROM (
    SELECT
        visitor_id,
        load_time_ms,
        arrayJoin(URLHierarchy(url)) AS prefix
    FROM page_views
    WHERE event_date = yesterday()
)
WHERE prefix != ''
GROUP BY prefix
ORDER BY total_views DESC
LIMIT 40;
```

## Summary

`URLHierarchy()` and `URLPathHierarchy()` convert a single URL into an ordered array of parent paths. Pair them with `arrayJoin()` to fan out one row per depth level, then aggregate to build tree roll-ups, breadcrumb reports, or funnel depth analysis. Use `URLPathHierarchy()` when you want path-only prefixes and `URLHierarchy()` when you need fully qualified URLs including scheme and host in every breadcrumb entry.
