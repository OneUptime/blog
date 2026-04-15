# How to Use topLevelDomain() and firstSignificantSubdomain() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Domain

Description: Learn how topLevelDomain() extracts the TLD and firstSignificantSubdomain() extracts the registrable domain part from URLs, enabling clean domain-level traffic analysis.

---

ClickHouse provides two URL functions for breaking down domain names: `topLevelDomain()` returns the top-level domain (the part after the last dot, such as `com` or `org`), and `firstSignificantSubdomain()` returns the "significant" second-level domain (for example, `example` from `www.example.com`). These two functions are especially useful when analysing web traffic logs where you want to group hits by registrable domain rather than by exact hostname.

Both functions accept a full URL string - they internally call `domain()` to strip the scheme and path before extracting the relevant segment. If the input cannot be parsed, both return an empty string.

## Basic Usage

```sql
-- Extract TLD and significant subdomain from sample URLs
SELECT
    url,
    topLevelDomain(url)            AS tld,
    firstSignificantSubdomain(url) AS significant_subdomain
FROM (
    SELECT arrayJoin([
        'https://www.example.com/page',
        'https://news.bbc.co.uk/article',
        'https://shop.mystore.io/checkout',
        'https://sub.deep.openai.com/',
        'https://192.168.1.1/admin'
    ]) AS url
);
```

```text
url                                    tld   significant_subdomain
https://www.example.com/page           com   example
https://news.bbc.co.uk/article         uk    bbc
https://shop.mystore.io/checkout       io    mystore
https://sub.deep.openai.com/           com   openai
https://192.168.1.1/admin
```

Note that IP addresses return empty strings because they have no domain structure.

## Understanding firstSignificantSubdomain() for Multi-Part TLDs

For country-code second-level domains like `co.uk` or `com.au`, ClickHouse knows to skip both parts and return the domain immediately to the left.

```sql
SELECT
    url,
    domain(url)                        AS full_domain,
    topLevelDomain(url)                AS tld,
    firstSignificantSubdomain(url)     AS significant
FROM (
    SELECT arrayJoin([
        'https://www.bbc.co.uk',
        'https://maps.google.com.au',
        'https://mail.gov.in',
        'https://store.amazon.co.jp'
    ]) AS url
);
```

```text
url                           full_domain           tld   significant
https://www.bbc.co.uk         www.bbc.co.uk         uk    bbc
https://maps.google.com.au    maps.google.com.au    au    google
https://mail.gov.in           mail.gov.in           in    gov
https://store.amazon.co.jp    store.amazon.co.jp    jp    amazon
```

Note that `gov.in` is not recognised by ClickHouse as a compound TLD. The built-in list only treats `co`, `com`, `net`, and `org` as insignificant second-level domains. Here `gov` is returned because it is the second-level domain and falls outside that list. To handle additional compound TLDs like `gov.in`, use `firstSignificantSubdomainCustom()` with a custom TLD list.

## Grouping Web Traffic by TLD

```sql
-- Traffic distribution by top-level domain
SELECT
    topLevelDomain(referrer_url) AS tld,
    count()                      AS hits,
    uniq(visitor_id)             AS unique_visitors,
    round(count() * 100.0 / sum(count()) OVER (), 2) AS pct
FROM page_views
WHERE event_date = today()
  AND referrer_url != ''
GROUP BY tld
ORDER BY hits DESC
LIMIT 20;
```

## Grouping by Registrable Domain

```sql
-- Aggregate referral traffic by registrable domain
SELECT
    firstSignificantSubdomain(referrer_url) AS ref_domain,
    topLevelDomain(referrer_url)            AS tld,
    count()                                 AS referrals,
    uniq(visitor_id)                        AS unique_visitors
FROM page_views
WHERE event_date BETWEEN today() - 7 AND today()
  AND referrer_url != ''
  AND firstSignificantSubdomain(referrer_url) != ''
GROUP BY ref_domain, tld
ORDER BY referrals DESC
LIMIT 30;
```

## Filtering Out Internal Traffic

```sql
-- Exclude traffic from your own domain and its subdomains
SELECT
    page_url,
    referrer_url,
    count() AS hits
FROM page_views
WHERE event_date = yesterday()
  AND firstSignificantSubdomain(referrer_url) != firstSignificantSubdomain(page_url)
  AND firstSignificantSubdomain(referrer_url) != ''
GROUP BY page_url, referrer_url
ORDER BY hits DESC
LIMIT 50;
```

## Detecting Cross-TLD Affiliate Networks

```sql
-- Find domains that appear under multiple TLDs (potential affiliate networks)
SELECT
    firstSignificantSubdomain(url) AS brand,
    groupArray(DISTINCT topLevelDomain(url)) AS tlds,
    count() AS total_hits
FROM access_logs
WHERE toDate(request_time) = yesterday()
  AND firstSignificantSubdomain(url) != ''
GROUP BY brand
HAVING length(tlds) > 2
ORDER BY total_hits DESC;
```

## Combining with Domain() for Full Context

```sql
-- Show domain breakdown: full domain, significant part, TLD
SELECT
    domain(url)                        AS full_domain,
    firstSignificantSubdomain(url)     AS brand,
    topLevelDomain(url)                AS tld,
    count()                            AS requests
FROM cdn_logs
WHERE toDate(ts) = today()
GROUP BY full_domain, brand, tld
ORDER BY requests DESC
LIMIT 25;
```

## Building a Domain Allowlist Check

```sql
-- Flag requests to untrusted TLDs
SELECT
    request_id,
    url,
    topLevelDomain(url) AS tld,
    tld NOT IN ('com', 'org', 'net', 'io', 'dev') AS suspicious_tld
FROM outbound_requests
WHERE toDate(ts) >= today() - 1
ORDER BY suspicious_tld DESC, ts DESC
LIMIT 100;
```

## Summary

`topLevelDomain()` and `firstSignificantSubdomain()` give you clean domain segmentation without manual string parsing. Use `topLevelDomain()` to categorise traffic by registry (`.com`, `.uk`, `.io`) and `firstSignificantSubdomain()` to group by registrable brand name regardless of subdomain depth. Both are vectorised and run efficiently over millions of URL strings in analytics queries.
