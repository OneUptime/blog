# How to Use cutFragment() and cutQueryString() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, URL Normalisation

Description: Learn how cutFragment() removes the hash fragment and cutQueryString() removes the query string from URLs in ClickHouse for canonical URL generation and deduplication.

---

ClickHouse provides two URL trimming functions that remove specific URL components. `cutFragment(url)` removes the fragment identifier (everything from `#` onwards, including the `#`) and returns the URL without it. `cutQueryString(url)` removes the query string (the `?` and its parameters, up to but not including any fragment) and preserves any fragment that follows. Both functions preserve the rest of the URL unchanged, and if the URL does not contain the targeted component it is returned as-is.

These are useful for canonicalising URLs before deduplication, building cache keys, or storing clean base URLs in derived tables.

## Basic Usage

```sql
-- Show the effect of cutFragment() and cutQueryString()
SELECT
    url,
    cutFragment(url)    AS no_fragment,
    cutQueryString(url) AS no_query_string
FROM (
    SELECT arrayJoin([
        'https://example.com/search?q=hello&lang=en#results',
        'https://docs.io/guide?v=2#installation',
        'https://shop.io/cart?item=42',
        'https://example.com/clean-url',
        'https://app.io/#/dashboard'
    ]) AS url
);
```

```text
url                                                 no_fragment                                 no_query_string
https://example.com/search?q=hello&lang=en#results  https://example.com/search?q=hello&lang=en  https://example.com/search#results
https://docs.io/guide?v=2#installation              https://docs.io/guide?v=2                   https://docs.io/guide#installation
https://shop.io/cart?item=42                        https://shop.io/cart?item=42                https://shop.io/cart
https://example.com/clean-url                       https://example.com/clean-url               https://example.com/clean-url
https://app.io/#/dashboard                          https://app.io/                             https://app.io/#/dashboard
```

## Canonical URL Generation

```sql
-- Produce fully clean canonical URLs (no query string, no fragment)
SELECT
    cutFragment(cutQueryString(url)) AS canonical_url,
    count()                          AS views,
    uniq(visitor_id)                 AS unique_visitors
FROM page_views
WHERE event_date = yesterday()
GROUP BY canonical_url
ORDER BY views DESC
LIMIT 30;
```

## Comparing Fragment Presence

```sql
-- How much traffic uses fragment-based navigation?
SELECT
    fragment(url) != ''                              AS has_fragment,
    count()                                          AS hits,
    uniq(visitor_id)                                 AS unique_visitors
FROM page_views
WHERE event_date = yesterday()
GROUP BY has_fragment
ORDER BY has_fragment;
```

## Building a Cache Key Without Query String

```sql
-- Use cutQueryString() to simulate a cache key for static assets
SELECT
    cutQueryString(url) AS cache_key,
    count()             AS requests,
    countIf(cache_hit = 1) AS cache_hits,
    round(countIf(cache_hit = 1) * 100.0 / count(), 2) AS hit_rate_pct
FROM cdn_logs
WHERE toDate(ts) = yesterday()
  AND path(url) LIKE '/static/%'
GROUP BY cache_key
ORDER BY requests DESC
LIMIT 30;
```

## Detecting Pages That Differ Only by Fragment

```sql
-- Pages that are the same path+qs but differ by fragment
SELECT
    cutFragment(url) AS base_url,
    groupArray(DISTINCT url) AS fragment_variants,
    count()          AS hits
FROM page_views
WHERE event_date = yesterday()
  AND fragment(url) != ''
GROUP BY base_url
HAVING length(fragment_variants) > 1
ORDER BY hits DESC
LIMIT 20;
```

## Removing Query Strings Before Archiving

```sql
-- Archive clean URLs without parameter noise
INSERT INTO page_view_archive
SELECT
    visitor_id,
    event_date,
    cutQueryString(url) AS base_url,
    ts
FROM page_views
WHERE event_date = yesterday();
```

## Combining Both Functions: Fully Stripped URL

```sql
-- Apply both cuts and compare with path() to verify equivalence
SELECT
    url,
    cutFragment(cutQueryString(url))    AS both_stripped,
    concat(protocol(url), '://', domain(url), path(url)) AS rebuilt,
    both_stripped = rebuilt             AS matches
FROM (
    SELECT arrayJoin([
        'https://example.com/docs/guide?v=2#section3',
        'https://shop.io/product/shoes?color=red',
        'https://app.io/#/home'
    ]) AS url
);
```

## SEO Canonical Comparison

```sql
-- Find pages where the canonical URL differs from the requested URL
SELECT
    cutFragment(cutQueryString(url)) AS canonical_url,
    url                              AS requested_url,
    count()                          AS views
FROM page_views
WHERE event_date = yesterday()
  AND cutFragment(cutQueryString(url)) != url
GROUP BY canonical_url, requested_url
ORDER BY views DESC
LIMIT 30;
```

## Summary

`cutFragment()` removes the hash fragment and `cutQueryString()` removes the query string from URLs. Chain them together to produce a fully canonical base URL identical to `protocol://host/path`. Use `cutQueryString()` for cache key generation and SEO deduplication. Use `cutFragment()` when you want to preserve query parameters but ignore client-side routing state. Both functions are useful pre-processing steps before storing URLs in derived tables or feeding them into further URL analysis functions.
