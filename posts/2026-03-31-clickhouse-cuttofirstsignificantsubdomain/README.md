# How to Use cutToFirstSignificantSubdomain() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Domain

Description: Learn how cutToFirstSignificantSubdomain() trims a URL to its registrable domain plus TLD in ClickHouse, simplifying domain normalisation and referrer grouping.

---

`cutToFirstSignificantSubdomain(url)` returns the portion of a URL's host that consists of the first significant subdomain and the top-level domain - stripping everything above (like `www.` or deeper subdomains) and everything below (path, query string, fragment). The result is the registrable domain in the form `example.com` or `bbc.co.uk`.

This function combines the work of `domain()` and `firstSignificantSubdomain()` into a single call that returns a complete, human-readable registrable domain string rather than just one segment.

## Basic Usage

```sql
-- Show the trimmed registrable domain for various URLs
SELECT
    url,
    domain(url)                         AS full_domain,
    firstSignificantSubdomain(url)      AS significant_part,
    cutToFirstSignificantSubdomain(url) AS registrable_domain
FROM (
    SELECT arrayJoin([
        'https://www.example.com/page?ref=1',
        'https://news.bbc.co.uk/article/123',
        'https://mail.google.com.au/inbox',
        'https://deep.nested.sub.openai.com/',
        'https://192.168.1.1/admin',
        'https://example.com'
    ]) AS url
);
```

```text
url                                  full_domain               significant_part  registrable_domain
https://www.example.com/page?ref=1   www.example.com           example           example.com
https://news.bbc.co.uk/article/123   news.bbc.co.uk            bbc               bbc.co.uk
https://mail.google.com.au/inbox     mail.google.com.au        google            google.com.au
https://deep.nested.sub.openai.com/  deep.nested.sub.openai.com  openai          openai.com
https://192.168.1.1/admin            192.168.1.1
https://example.com                  example.com               example           example.com
```

## Grouping Referral Traffic by Registrable Domain

```sql
-- Top referring registrable domains
SELECT
    cutToFirstSignificantSubdomain(referrer_url) AS source_domain,
    count()                                      AS referrals,
    uniq(visitor_id)                             AS unique_visitors
FROM page_views
WHERE event_date BETWEEN today() - 7 AND today()
  AND referrer_url != ''
  AND cutToFirstSignificantSubdomain(referrer_url) != ''
GROUP BY source_domain
ORDER BY referrals DESC
LIMIT 30;
```

## Normalising Partner Domains

```sql
-- Treat all subdomains of a partner as a single entity
SELECT
    cutToFirstSignificantSubdomain(url) AS partner_domain,
    sum(revenue)                        AS total_revenue,
    count()                             AS conversions
FROM affiliate_clicks
WHERE toDate(ts) BETWEEN today() - 30 AND today()
GROUP BY partner_domain
ORDER BY total_revenue DESC
LIMIT 20;
```

## Filtering Out Self-Referrals

```sql
-- Remove internal traffic where the referrer matches our own domain
SELECT
    page_url,
    referrer_url,
    count() AS hits
FROM page_views
WHERE event_date = yesterday()
  AND cutToFirstSignificantSubdomain(referrer_url) != 'example.com'
  AND cutToFirstSignificantSubdomain(referrer_url) != ''
GROUP BY page_url, referrer_url
ORDER BY hits DESC
LIMIT 50;
```

## Domain Allowlist Enforcement

```sql
-- Flag outbound links to domains not in the allowlist
SELECT
    ts,
    source_page,
    link_url,
    cutToFirstSignificantSubdomain(link_url) AS target_domain
FROM outbound_link_clicks
WHERE toDate(ts) = today()
  AND cutToFirstSignificantSubdomain(link_url) NOT IN (
        'example.com', 'docs.example.com', 'support.example.com', 'github.com'
      )
ORDER BY ts DESC
LIMIT 100;
```

## Building a Domain Frequency Table for Spam Detection

```sql
-- Domains sending unusually high volumes of referral traffic (bot detection)
SELECT
    cutToFirstSignificantSubdomain(referrer_url) AS domain,
    count()                                      AS referrals,
    uniq(visitor_id)                             AS unique_visitors,
    count() / uniq(visitor_id)                   AS refs_per_visitor
FROM page_views
WHERE event_date = yesterday()
  AND referrer_url != ''
GROUP BY domain
HAVING refs_per_visitor > 50
ORDER BY refs_per_visitor DESC
LIMIT 30;
```

## Comparing cutToFirstSignificantSubdomain() Across Environments

```sql
-- Verify that staging and production domains normalise to the same registrable domain
SELECT
    url,
    cutToFirstSignificantSubdomain(url) AS registrable_domain
FROM (
    SELECT arrayJoin([
        'https://www.example.com',
        'https://staging.example.com',
        'https://app.example.com',
        'https://api.example.com'
    ]) AS url
);
```

```text
url                           registrable_domain
https://www.example.com       example.com
https://staging.example.com   example.com
https://app.example.com       example.com
https://api.example.com       example.com
```

## Summary

`cutToFirstSignificantSubdomain()` is the cleanest single function call for obtaining a URL's registrable domain in ClickHouse. It handles multi-part TLDs like `.co.uk` and `.com.au` correctly, strips all subdomains, and ignores the path and query string. Use it as the primary grouping key when you want referral, partner, or affiliate traffic rolled up to the brand level rather than fragmented across subdomains.
