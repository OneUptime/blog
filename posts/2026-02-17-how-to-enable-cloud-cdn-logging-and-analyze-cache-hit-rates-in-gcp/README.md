# How to Enable Cloud CDN Logging and Analyze Cache Hit Rates in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud CDN, Logging, Monitoring, Cache Analytics

Description: Learn how to enable Cloud CDN logging in Google Cloud Platform and analyze cache hit rates to optimize your content delivery performance.

---

Running Cloud CDN without logging is like driving blind. You know content is being served, but you have no idea whether it is coming from cache or hitting your origin every time. Cloud CDN integrates with Cloud Logging to give you request-level visibility into cache behavior, and Cloud Monitoring provides aggregated metrics for dashboards and alerts.

In this guide, I will show you how to enable CDN logging, understand the log fields, build useful queries, and create monitoring dashboards for cache performance.

## Step 1: Enable Logging on the Backend Service

Cloud CDN logging is configured at the backend service level. You can enable it and control the sample rate.

```bash
# Enable logging with full sample rate (every request is logged)
gcloud compute backend-services update my-backend \
    --enable-logging \
    --logging-sample-rate=1.0 \
    --global \
    --project=my-project
```

The `--logging-sample-rate` parameter controls what fraction of requests are logged. A value of `1.0` logs everything, `0.5` logs half, and `0.0` disables logging. For high-traffic sites, consider a lower sample rate to reduce logging costs.

```bash
# Enable logging with 10% sample rate (for high-traffic backends)
gcloud compute backend-services update my-backend \
    --enable-logging \
    --logging-sample-rate=0.1 \
    --global \
    --project=my-project
```

For backend buckets, the syntax is similar.

```bash
# Enable logging on a backend bucket
gcloud compute backend-buckets update my-bucket-backend \
    --enable-cdn \
    --project=my-project
```

## Step 2: Understand CDN Log Fields

Cloud CDN logs are part of the HTTP load balancer logs. The key fields for CDN analysis are:

| Field | Description |
|-------|-------------|
| `jsonPayload.cacheHit` | Boolean - whether the response was served from cache |
| `jsonPayload.cacheLookup` | Boolean - whether Cloud CDN attempted a cache lookup |
| `jsonPayload.cacheFillBytes` | Bytes written to cache from origin response |
| `jsonPayload.cacheValidatedWithOriginServer` | Whether CDN validated a stale entry with the origin |
| `jsonPayload.statusDetails` | Detailed status (e.g., "response_from_cache", "response_sent_by_backend") |
| `httpRequest.requestUrl` | The full request URL |
| `httpRequest.status` | HTTP response status code |
| `httpRequest.latency` | Total request latency |
| `httpRequest.cacheHit` | Same as jsonPayload.cacheHit |

## Step 3: Query CDN Logs

Use Cloud Logging to query and analyze your CDN performance.

### Find Cache Hits

```bash
# Query for cache hits in the last hour
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.cacheHit=true AND timestamp>="2026-02-17T00:00:00Z"' \
    --format="table(timestamp,httpRequest.requestUrl,httpRequest.status)" \
    --limit=50 \
    --project=my-project
```

### Find Cache Misses

```bash
# Query for cache misses
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.cacheLookup=true AND jsonPayload.cacheHit=false' \
    --format="table(timestamp,httpRequest.requestUrl,httpRequest.status,jsonPayload.statusDetails)" \
    --limit=50 \
    --project=my-project
```

### Find Uncacheable Responses

```bash
# Find responses that Cloud CDN did not even try to cache
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.cacheLookup=false' \
    --format="table(timestamp,httpRequest.requestUrl,httpRequest.status)" \
    --limit=50 \
    --project=my-project
```

### Analyze by Status Detail

```bash
# Group requests by CDN status detail
gcloud logging read \
    'resource.type="http_load_balancer" AND timestamp>="2026-02-17T00:00:00Z"' \
    --format="value(jsonPayload.statusDetails)" \
    --limit=1000 \
    --project=my-project | sort | uniq -c | sort -rn
```

Common status details include:
- `response_from_cache` - served from CDN cache
- `response_sent_by_backend` - fetched from origin
- `cache_fill` - response stored in cache for future requests
- `cache_revalidated` - stale entry validated with origin

## Step 4: Calculate Cache Hit Ratios

The cache hit ratio is the most important CDN metric. Here is how to calculate it from logs.

### Using BigQuery Log Sink

For large-scale analysis, export logs to BigQuery and run SQL queries.

```bash
# Create a log sink to BigQuery
gcloud logging sinks create cdn-logs-to-bq \
    bigquery.googleapis.com/projects/my-project/datasets/cdn_logs \
    --log-filter='resource.type="http_load_balancer"' \
    --project=my-project
```

Then query BigQuery for cache hit ratios.

```sql
-- Calculate hourly cache hit ratio
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  COUNTIF(jsonPayload.cacheHit = true) AS cache_hits,
  COUNTIF(jsonPayload.cacheLookup = true AND jsonPayload.cacheHit = false) AS cache_misses,
  COUNT(*) AS total_requests,
  SAFE_DIVIDE(
    COUNTIF(jsonPayload.cacheHit = true),
    COUNTIF(jsonPayload.cacheLookup = true)
  ) * 100 AS hit_ratio_percent
FROM
  `my-project.cdn_logs.requests_*`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  hour
ORDER BY
  hour DESC;
```

### Cache Hit Ratio by URL Path

```sql
-- Find the cache hit ratio for each URL path
SELECT
  REGEXP_EXTRACT(httpRequest.requestUrl, r'https?://[^/]+(\/[^?]*)') AS path,
  COUNT(*) AS total,
  COUNTIF(jsonPayload.cacheHit = true) AS hits,
  SAFE_DIVIDE(
    COUNTIF(jsonPayload.cacheHit = true),
    COUNTIF(jsonPayload.cacheLookup = true)
  ) * 100 AS hit_ratio
FROM
  `my-project.cdn_logs.requests_*`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND jsonPayload.cacheLookup = true
GROUP BY
  path
HAVING
  total > 100
ORDER BY
  hit_ratio ASC
LIMIT 50;
```

This query identifies the URLs with the worst cache hit ratios, which is where you should focus optimization efforts.

## Step 5: Set Up Cloud Monitoring Dashboards

Cloud Monitoring has built-in CDN metrics that you can use for real-time dashboards.

### Key Metrics

- `loadbalancing.googleapis.com/https/backend_request_count` - Requests by backend
- `loadbalancing.googleapis.com/https/total_latencies` - End-to-end latency
- `loadbalancing.googleapis.com/https/backend_latencies` - Origin latency (cache misses only)

### Create a Dashboard with gcloud

```bash
# Create a monitoring dashboard for CDN metrics
gcloud monitoring dashboards create --config='
{
  "displayName": "Cloud CDN Performance",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Cache Hit vs Miss",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"https_lb_rule\" AND metric.type=\"loadbalancing.googleapis.com/https/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "groupByFields": ["metric.labels.cache_result"]
                  }
                }
              }
            }
          ]
        }
      },
      {
        "title": "Origin Latency (Cache Misses)",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"https_lb_rule\" AND metric.type=\"loadbalancing.googleapis.com/https/backend_latencies\"",
                  "aggregation": {
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_PERCENTILE_99"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  }
}'
```

## Step 6: Set Up Alerts

Create alerts for when cache performance degrades.

```bash
# Alert when cache hit ratio drops below 70%
gcloud monitoring policies create \
    --display-name="Low CDN Cache Hit Ratio" \
    --condition-display-name="Cache hit ratio below threshold" \
    --condition-filter='resource.type="https_lb_rule" AND metric.type="loadbalancing.googleapis.com/https/request_count" AND metric.labels.cache_result="HIT"' \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --project=my-project
```

## Step 7: Analyze Latency Improvements

Compare latency between cache hits and misses to quantify the CDN's value.

```sql
-- Compare latency for cache hits vs misses
SELECT
  CASE
    WHEN jsonPayload.cacheHit = true THEN 'Cache Hit'
    ELSE 'Cache Miss'
  END AS cache_status,
  COUNT(*) AS request_count,
  ROUND(AVG(CAST(REGEXP_EXTRACT(httpRequest.latency, r'([\d.]+)') AS FLOAT64)) * 1000, 2) AS avg_latency_ms,
  ROUND(APPROX_QUANTILES(
    CAST(REGEXP_EXTRACT(httpRequest.latency, r'([\d.]+)') AS FLOAT64) * 1000, 100
  )[OFFSET(95)], 2) AS p95_latency_ms
FROM
  `my-project.cdn_logs.requests_*`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND jsonPayload.cacheLookup = true
GROUP BY
  cache_status;
```

## Useful Log Queries for Troubleshooting

### Find Requests with No Cache Lookup

```bash
# Requests where CDN did not attempt caching - usually due to request method or headers
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.cacheLookup=false AND httpRequest.requestMethod="GET"' \
    --format="table(httpRequest.requestUrl,httpRequest.status)" \
    --limit=20 \
    --project=my-project
```

### Find Large Uncached Responses

```bash
# Large responses that are not being cached - potential optimization targets
gcloud logging read \
    'resource.type="http_load_balancer" AND jsonPayload.cacheHit=false AND httpRequest.responseSize>1000000' \
    --format="table(httpRequest.requestUrl,httpRequest.responseSize)" \
    --limit=20 \
    --project=my-project
```

## Wrapping Up

CDN logging and monitoring give you the data you need to optimize Cloud CDN. Enable logging on all your backend services, even at a low sample rate, so you have baseline data. Use BigQuery for deep analysis of cache hit ratios by URL path, content type, and time of day. Set up dashboards and alerts in Cloud Monitoring so you know immediately when cache performance degrades. The investment in observability pays off quickly because every cache miss you convert to a hit reduces origin load and improves user experience.
