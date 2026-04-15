# How to Build a Referrer Analysis System with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Referrer Analysis, Web Analytics, Traffic Source, URL Function, Marketing

Description: Learn how to build a referrer analysis system in ClickHouse to track traffic sources, measure channel performance, and understand visitor acquisition.

---

Referrer analysis tells you where your visitors come from - search engines, social media, direct traffic, or other websites. ClickHouse's URL parsing functions make it straightforward to extract, categorize, and analyze referrer data at scale.

## Schema Design

Store the raw referrer URL and extract components during ingestion or at query time:

```sql
CREATE TABLE pageviews (
    ts           DateTime64(3),
    visitor_id   String,
    session_id   String,
    url          String,
    referrer     String,  -- full referrer URL
    country      LowCardinality(String)
) ENGINE = MergeTree
PARTITION BY toYYYYMMDD(ts)
ORDER BY (visitor_id, ts);
```

## Parsing Referrer URLs

ClickHouse provides powerful URL functions for parsing referrer data:

```sql
-- Extract domain and path from referrer
SELECT
    referrer,
    domain(referrer)         AS referrer_domain,
    protocol(referrer)       AS referrer_protocol,
    path(referrer)           AS referrer_path
FROM pageviews
WHERE ts >= today() - 7
  AND referrer != ''
LIMIT 10;
```

## Categorizing Traffic Sources

```sql
SELECT
    CASE
        WHEN referrer = '' OR referrer = 'direct'
            THEN 'Direct'
        WHEN domainWithoutWWW(referrer) IN ('google.com', 'bing.com', 'yahoo.com', 'duckduckgo.com')
            THEN 'Organic Search'
        WHEN domainWithoutWWW(referrer) IN ('twitter.com', 'x.com', 't.co', 'facebook.com', 'linkedin.com', 'reddit.com')
            THEN 'Social'
        WHEN domainWithoutWWW(referrer) LIKE '%mail.%' OR domainWithoutWWW(referrer) IN ('gmail.com', 'outlook.com')
            THEN 'Email'
        ELSE 'Referral'
    END AS channel,
    uniq(visitor_id)     AS unique_visitors,
    count()              AS sessions
FROM pageviews
WHERE ts >= today() - 30
GROUP BY channel
ORDER BY sessions DESC;
```

## Top Referring Domains

```sql
SELECT
    domainWithoutWWW(referrer)     AS source_domain,
    uniq(visitor_id)               AS unique_visitors,
    count()                        AS referrals,
    uniq(session_id)               AS sessions
FROM pageviews
WHERE ts >= today() - 30
  AND referrer != ''
  AND domainWithoutWWW(referrer) NOT IN ('yoursite.com')
GROUP BY source_domain
ORDER BY unique_visitors DESC
LIMIT 20;
```

## Search Engine Keyword Analysis

For search referrers, extract query parameters:

```sql
SELECT
    domainWithoutWWW(referrer)                AS search_engine,
    extractURLParameter(referrer, 'q')        AS keyword,
    count()                                   AS visits
FROM pageviews
WHERE ts >= today() - 30
  AND domainWithoutWWW(referrer) IN ('google.com', 'bing.com', 'yahoo.com')
  AND extractURLParameter(referrer, 'q') != ''
GROUP BY search_engine, keyword
ORDER BY visits DESC
LIMIT 30;
```

## Referrer Trends Over Time

```sql
SELECT
    toStartOfDay(ts)     AS day,
    CASE
        WHEN referrer = '' THEN 'Direct'
        WHEN domainWithoutWWW(referrer) IN ('google.com', 'bing.com') THEN 'Search'
        ELSE 'Other'
    END AS channel,
    uniq(visitor_id)     AS visitors
FROM pageviews
WHERE ts >= today() - 30
GROUP BY day, channel
ORDER BY day, channel;
```

## Landing Page by Source

```sql
SELECT
    domainWithoutWWW(referrer)     AS source,
    url                            AS landing_page,
    uniq(visitor_id)               AS visitors
FROM (
    -- Get first page per session
    SELECT
        session_id,
        any(visitor_id)      AS visitor_id,
        argMin(url, ts)      AS url,
        argMin(referrer, ts) AS referrer
    FROM pageviews
    WHERE ts >= today() - 7
    GROUP BY session_id
)
GROUP BY source, landing_page
ORDER BY visitors DESC
LIMIT 20;
```

## Summary

ClickHouse's URL parsing functions (`domain`, `domainWithoutWWW`, `protocol`, `path`, `extractURLParameter`) make it easy to build a comprehensive referrer analysis system. By combining these functions with fast GROUP BY aggregations, you can answer key acquisition questions - which channels drive the most visitors, which search keywords convert, and which landing pages work best for each traffic source.
