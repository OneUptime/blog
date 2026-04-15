# How to Use netloc() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, URL Function, Analytics, Web Analytics, Domain

Description: Learn how the netloc() function extracts the network location (host and port) from a URL in ClickHouse, useful for grouping traffic by server endpoint including non-standard ports.

---

`netloc(url)` extracts the network locality from a URL in the format `username:password@host:port`, returning whichever of those components are present in the URL string. In practice, for most URLs this means it returns `host:port` when a port is specified, or just the `host` when no port is present. Unlike `domain()`, which always returns just the hostname, `netloc()` preserves the port number exactly as written in the URL — it does not strip default ports like 443 or 80. Use `netloc()` when your infrastructure uses non-standard ports and you need to distinguish between services running on different ports of the same host.

## Basic Usage

```sql
-- Compare netloc() and domain() across various URL formats
SELECT
    url,
    netloc(url)  AS net_location,
    domain(url)  AS host_only
FROM (
    SELECT arrayJoin([
        'https://example.com/page',
        'https://example.com:443/secure',
        'http://api.example.com:8080/v1/users',
        'http://localhost:3000/app',
        'https://192.168.1.10:9200/index',
        'ftp://files.example.com:21/data.csv'
    ]) AS url
);
```

```text
url                                  net_location               host_only
https://example.com/page             example.com                example.com
https://example.com:443/secure       example.com:443            example.com
http://api.example.com:8080/v1/users  api.example.com:8080      api.example.com
http://localhost:3000/app            localhost:3000             localhost
https://192.168.1.10:9200/index      192.168.1.10:9200          192.168.1.10
ftp://files.example.com:21/data.csv  files.example.com:21       files.example.com
```

## Traffic Breakdown by Network Location

```sql
-- Request counts grouped by host:port (distinguishes microservices on same host)
SELECT
    netloc(url)      AS endpoint,
    count()          AS requests,
    avg(response_time_ms) AS avg_ms,
    quantile(0.95)(response_time_ms) AS p95_ms
FROM api_logs
WHERE toDate(ts) = yesterday()
GROUP BY endpoint
ORDER BY requests DESC
LIMIT 30;
```

## Detecting Non-Standard Port Usage

```sql
-- Find requests to non-standard ports (potential security concern)
SELECT
    netloc(url)    AS endpoint,
    protocol(url)  AS scheme,
    count()        AS hits,
    uniq(client_ip) AS unique_clients
FROM access_logs
WHERE toDate(ts) = yesterday()
  AND (
      (protocol(url) = 'https' AND netloc(url) LIKE '%:%' AND netloc(url) NOT LIKE '%:443')
      OR (protocol(url) = 'http'  AND netloc(url) LIKE '%:%' AND netloc(url) NOT LIKE '%:80')
  )
GROUP BY endpoint, scheme
ORDER BY hits DESC
LIMIT 30;
```

## Microservice Traffic Distribution

```sql
-- Compare load across multiple microservice instances (same host, different ports)
SELECT
    domain(url)    AS host,
    netloc(url)    AS instance,
    count()        AS requests,
    sum(response_time_ms) / count() AS avg_ms
FROM service_logs
WHERE toDate(ts) = yesterday()
  AND domain(url) IN ('api-01.internal', 'api-02.internal')
GROUP BY host, instance
ORDER BY host, requests DESC;
```

## Building an Inventory of Active Endpoints

```sql
-- Distinct network locations seen in the last 7 days
SELECT
    netloc(url)    AS endpoint,
    protocol(url)  AS scheme,
    min(ts)        AS first_seen,
    max(ts)        AS last_seen,
    count()        AS total_requests
FROM access_logs
WHERE toDate(ts) >= today() - 7
GROUP BY endpoint, scheme
ORDER BY total_requests DESC;
```

## Comparing netloc() Across Environments

```sql
-- Verify that staging and production traffic go to different netloc values
SELECT
    environment,
    netloc(url) AS endpoint,
    count()     AS requests
FROM deployment_logs
WHERE toDate(ts) = yesterday()
GROUP BY environment, endpoint
ORDER BY environment, requests DESC;
```

## Port Extraction from netloc()

```sql
-- Extract just the port number from netloc()
SELECT
    url,
    netloc(url)                              AS net_loc,
    splitByChar(':', netloc(url))[-1]        AS port
FROM (
    SELECT arrayJoin([
        'http://api.example.com:8080/v1',
        'https://example.com/no-port',
        'http://localhost:3000/app'
    ]) AS url
);
```

```text
url                                net_loc                    port
http://api.example.com:8080/v1     api.example.com:8080       8080
https://example.com/no-port        example.com                example.com
http://localhost:3000/app          localhost:3000              3000
```

## Summary

`netloc()` extracts the network locality (`host:port`, or `username:password@host:port` if credentials are present) from a URL, making it the right choice when port numbers matter - for example, in infrastructure logs where multiple services run on the same host but different ports. Note that it returns the port exactly as written in the URL and does not strip default ports. For grouping by hostname alone (ignoring port), use `domain()`. For registrable domain analysis, use `cutToFirstSignificantSubdomain()`. Use `netloc()` specifically when you need the port to distinguish endpoints, audit non-standard port usage, or build an inventory of active network locations.
