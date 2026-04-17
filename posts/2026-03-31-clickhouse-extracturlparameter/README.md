# How to Use extractURLParameter() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Campaign Tracking

Description: Learn how extractURLParameter() pulls a named query string parameter value from a URL in ClickHouse, ideal for UTM tracking, A/B test analysis, and parameter auditing.

---

`extractURLParameter(url, name)` searches the query string of a URL for a parameter with the given name and returns its value as a `String`. If the parameter appears multiple times, the first occurrence is returned. If the parameter is not present, the function returns an empty string. The returned value is not URL-decoded — wrap it in `decodeURLComponent()` (or `decodeURLFormComponent()` if `+` should be treated as a space) when you need to decode percent-encoded characters. The function is case-sensitive with respect to the parameter name.

## Basic Usage

```sql
-- Extract individual parameters from URLs
SELECT
    url,
    extractURLParameter(url, 'utm_source')   AS utm_source,
    extractURLParameter(url, 'utm_medium')   AS utm_medium,
    extractURLParameter(url, 'utm_campaign') AS utm_campaign
FROM (
    SELECT arrayJoin([
        'https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale',
        'https://example.com/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly',
        'https://example.com/?ref=partner_abc',
        'https://example.com/page'
    ]) AS url
);
```

```text
url                                                     utm_source   utm_medium  utm_campaign
https://example.com/?utm_source=google&utm_medium=cpc...  google       cpc         spring_sale
https://example.com/?utm_source=newsletter...             newsletter   email       weekly
https://example.com/?ref=partner_abc
https://example.com/page
```

## Campaign Attribution Analysis

```sql
-- Sessions and conversions by UTM source and campaign
SELECT
    extractURLParameter(landing_url, 'utm_source')   AS source,
    extractURLParameter(landing_url, 'utm_medium')   AS medium,
    extractURLParameter(landing_url, 'utm_campaign') AS campaign,
    count()                                          AS sessions,
    countIf(converted = 1)                           AS conversions,
    round(countIf(converted = 1) * 100.0 / count(), 2) AS cvr_pct
FROM user_sessions
WHERE session_date BETWEEN today() - 30 AND today()
  AND extractURLParameter(landing_url, 'utm_source') != ''
GROUP BY source, medium, campaign
ORDER BY sessions DESC
LIMIT 30;
```

## A/B Test Variant Analysis

```sql
-- Measure engagement per A/B test variant
SELECT
    extractURLParameter(url, 'variant') AS ab_variant,
    count()                             AS page_views,
    uniq(visitor_id)                    AS unique_visitors,
    avg(time_on_page_s)                 AS avg_time_on_page
FROM page_views
WHERE event_date BETWEEN today() - 14 AND today()
  AND extractURLParameter(url, 'variant') != ''
GROUP BY ab_variant
ORDER BY page_views DESC;
```

## Referral Partner Tracking

```sql
-- Top referral partners by 'ref' parameter
SELECT
    extractURLParameter(url, 'ref') AS partner_ref,
    count()                         AS clicks,
    uniq(visitor_id)                AS unique_visitors,
    countIf(converted = 1)          AS conversions
FROM page_views
WHERE event_date BETWEEN today() - 30 AND today()
  AND extractURLParameter(url, 'ref') != ''
GROUP BY partner_ref
ORDER BY clicks DESC
LIMIT 20;
```

## Search Query Extraction

```sql
-- What search terms bring users to internal search results?
SELECT
    extractURLParameter(url, 'q')   AS search_term,
    count()                         AS searches,
    uniq(visitor_id)                AS unique_searchers
FROM page_views
WHERE event_date = yesterday()
  AND path(url) = '/search'
  AND extractURLParameter(url, 'q') != ''
GROUP BY search_term
ORDER BY searches DESC
LIMIT 30;
```

## Detecting Missing Required Parameters

```sql
-- Find API calls that are missing required 'api_key' parameter
SELECT
    ts,
    client_ip,
    url,
    status_code
FROM api_logs
WHERE toDate(ts) = today()
  AND extractURLParameter(url, 'api_key') = ''
  AND path(url) LIKE '/api/%'
ORDER BY ts DESC
LIMIT 100;
```

## Pagination Analysis

```sql
-- Which page numbers do users request most often?
SELECT
    toUInt32OrZero(extractURLParameter(url, 'page')) AS page_num,
    count()                                          AS requests
FROM page_views
WHERE event_date = yesterday()
  AND extractURLParameter(url, 'page') != ''
GROUP BY page_num
ORDER BY page_num;
```

## Percent-Encoded Value Decoding

```sql
-- Decode percent-encoded parameter values by wrapping with decodeURLComponent()
SELECT
    url,
    decodeURLComponent(extractURLParameter(url, 'q')) AS decoded_query
FROM (
    SELECT arrayJoin([
        'https://example.com/search?q=hello%20world',
        'https://example.com/search?q=caf%C3%A9+menu',
        'https://example.com/search?q=price%3A100%24'
    ]) AS url
);
```

```text
url                                             decoded_query
https://example.com/search?q=hello%20world      hello world
https://example.com/search?q=caf%C3%A9+menu     café+menu
https://example.com/search?q=price%3A100%24     price:100$
```

## Summary

`extractURLParameter()` is the standard way to pull a single named parameter value from a URL query string in ClickHouse. It returns an empty string when the parameter is absent, making it safe for direct use in `GROUP BY` clauses and conditional aggregations. The returned value is not URL-decoded — pair it with `decodeURLComponent()` when you need to interpret percent-encoded characters. For retrieving all parameter names or values at once, use `extractURLParameters()` and `extractURLParameterNames()`.
