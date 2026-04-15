# How to Use protocol() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Security, Web Analytics

Description: Learn how the protocol() function extracts the scheme from a URL string in ClickHouse, enabling security audits, traffic segmentation, and protocol-level analytics.

---

The `protocol()` function in ClickHouse extracts the scheme portion of a URL - the part before `://` for hierarchical URLs like `https://` or before `:` for schemes like `mailto:`. It returns a `String` value such as `https`, `http`, `ftp`, or `ws`. If the URL has no recognisable scheme, the function returns an empty string. Because `protocol()` operates on raw strings without full URL parsing, it is very fast and works well in high-throughput log analysis pipelines.

## Basic Usage

```sql
-- Extract the protocol from various URL formats
SELECT
    url,
    protocol(url) AS scheme
FROM (
    SELECT arrayJoin([
        'https://example.com/page',
        'http://insecure.example.com/',
        'ftp://files.example.com/data.csv',
        'ws://realtime.example.com/socket',
        'wss://secure-ws.example.com/stream',
        'mailto:user@example.com',
        'just-a-path/no-scheme'
    ]) AS url
);
```

```text
url                                    scheme
https://example.com/page               https
http://insecure.example.com/           http
ftp://files.example.com/data.csv       ftp
ws://realtime.example.com/socket       ws
wss://secure-ws.example.com/stream     wss
mailto:user@example.com                mailto
just-a-path/no-scheme
```

## Counting Requests by Protocol

```sql
-- Distribution of protocols in access logs
SELECT
    protocol(url)   AS scheme,
    count()         AS request_count,
    uniq(client_ip) AS unique_clients,
    round(count() * 100.0 / sum(count()) OVER (), 2) AS pct
FROM access_logs
WHERE toDate(ts) = yesterday()
GROUP BY scheme
ORDER BY request_count DESC;
```

## Detecting Insecure HTTP Traffic

```sql
-- Find pages still served over plain HTTP
SELECT
    url,
    client_ip,
    user_agent,
    ts
FROM access_logs
WHERE toDate(ts) >= today() - 7
  AND protocol(url) = 'http'
ORDER BY ts DESC
LIMIT 500;
```

## HTTP to HTTPS Migration Audit

```sql
-- Compare HTTP vs HTTPS traffic per day over the last 30 days
SELECT
    toDate(ts)     AS log_date,
    protocol(url)  AS scheme,
    count()        AS hits
FROM access_logs
WHERE toDate(ts) >= today() - 30
  AND protocol(url) IN ('http', 'https')
GROUP BY log_date, scheme
ORDER BY log_date, scheme;
```

## Segmenting API Traffic by Protocol

```sql
-- WebSocket vs HTTPS API usage breakdown
SELECT
    protocol(url)            AS scheme,
    domain(url)              AS host,
    count()                  AS connections,
    uniq(user_id)            AS unique_users
FROM api_access_logs
WHERE toDate(ts) = yesterday()
  AND protocol(url) IN ('https', 'wss', 'ws')
GROUP BY scheme, host
ORDER BY connections DESC;
```

## Protocol Anomaly Detection

```sql
-- Flag unusual protocols that should not appear in production traffic
SELECT
    ts,
    client_ip,
    url,
    protocol(url) AS scheme
FROM access_logs
WHERE toDate(ts) = today()
  AND protocol(url) NOT IN ('https', 'http', '')
ORDER BY ts DESC;
```

## Combining Protocol with Domain Analysis

```sql
-- Full breakdown: protocol + domain + path prefix
SELECT
    protocol(url)                        AS scheme,
    domain(url)                          AS host,
    splitByChar('/', path(url))[2]       AS top_path_segment,
    count()                              AS hits
FROM access_logs
WHERE toDate(ts) = yesterday()
  AND protocol(url) != ''
GROUP BY scheme, host, top_path_segment
ORDER BY hits DESC
LIMIT 50;
```

## Materialized Column for Protocol Filtering

When you query by protocol frequently, storing it as a materialized column avoids repeated function calls.

```sql
ALTER TABLE access_logs
    ADD COLUMN scheme String
    MATERIALIZED protocol(url);

-- After the column is populated, query uses stored value
SELECT scheme, count()
FROM access_logs
WHERE toDate(ts) = today()
GROUP BY scheme
ORDER BY count() DESC;
```

## Summary

`protocol()` is a lightweight string-extraction function that returns the URL scheme with no allocation overhead beyond a simple string scan. Use it to audit insecure HTTP endpoints, segment traffic by transport type (HTTP, WS, FTP), detect protocol anomalies in security pipelines, or drive materialized columns for fast scheme-based partitioning. It pairs naturally with `domain()`, `path()`, and `queryString()` to build a complete URL decomposition pipeline.
