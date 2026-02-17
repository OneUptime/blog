# How to Use Log Analytics in Cloud Logging to Query Logs with SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Log Analytics, SQL, BigQuery

Description: Learn how to use Log Analytics in Cloud Logging to run SQL queries on your logs without exporting them to BigQuery, enabling powerful log analysis.

---

Cloud Logging's built-in query language works fine for basic log searches, but it falls short when you need aggregations, joins, or complex filtering. Historically, the answer was to export logs to BigQuery and query them there. Log Analytics changes that by letting you run SQL queries directly on your Cloud Logging data without setting up any export pipelines.

In this post, I will show you how to enable Log Analytics, write useful SQL queries against your logs, and use this feature for real troubleshooting scenarios.

## What Is Log Analytics?

Log Analytics is a feature of Cloud Logging that gives you a SQL-based query interface for log buckets that have been upgraded to use Log Analytics. Under the hood, it uses BigQuery's SQL engine, so you get the full power of BigQuery SQL without having to manage a separate dataset or pay for BigQuery storage.

Key points:

- You query log buckets directly - no export required
- Uses standard BigQuery SQL syntax
- Available in the Cloud Console under Logging > Log Analytics
- Works with both the `_Default` and custom log buckets
- No additional cost beyond normal Cloud Logging ingestion (though query costs may apply at scale)

## Enabling Log Analytics

Log Analytics needs to be enabled on each log bucket you want to query. The `_Required` bucket always has it enabled. For other buckets:

### Upgrading the _Default Bucket

```bash
# Upgrade the _Default bucket to support Log Analytics
gcloud logging buckets update _Default \
  --location=global \
  --enable-analytics \
  --project=my-project
```

Note: Once you upgrade a bucket to Log Analytics, you cannot downgrade it. The upgrade takes a few minutes.

### Creating a New Bucket with Log Analytics

```bash
# Create a new log bucket with Log Analytics enabled
gcloud logging buckets create analytics-bucket \
  --location=global \
  --enable-analytics \
  --retention-days=90 \
  --project=my-project
```

## Accessing Log Analytics

Once enabled, go to **Logging** > **Log Analytics** in the Cloud Console. You will see a SQL query editor where you can write and run queries.

The log data is available through a view that follows this naming convention:

```
`project_id.global._Default._AllLogs`
```

For custom buckets:

```
`project_id.global.bucket_name._AllLogs`
```

## Writing SQL Queries on Logs

Let me walk through some practical queries you can run.

### Count Log Entries by Severity

This gives you a bird's-eye view of your log distribution:

```sql
-- Count log entries by severity level over the last 24 hours
SELECT
  severity,
  COUNT(*) AS entry_count
FROM
  `my-project.global._Default._AllLogs`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  severity
ORDER BY
  entry_count DESC
```

### Find the Noisiest Log Sources

Identify which services or resources are generating the most logs:

```sql
-- Top 10 noisiest log sources by entry count
SELECT
  resource.type AS resource_type,
  log_id AS log_name,
  COUNT(*) AS entry_count,
  SUM(LENGTH(TO_JSON_STRING(json_payload))) AS total_bytes_approx
FROM
  `my-project.global._Default._AllLogs`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  resource_type, log_name
ORDER BY
  entry_count DESC
LIMIT 10
```

This is incredibly useful for identifying candidates for exclusion filters to reduce logging costs.

### Error Trend Analysis

Track how error counts change over time to spot trends:

```sql
-- Hourly error count trend for the last 7 days
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  COUNT(*) AS error_count
FROM
  `my-project.global._Default._AllLogs`
WHERE
  severity IN ('ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY')
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  hour
ORDER BY
  hour
```

### Search for Specific Error Patterns

```sql
-- Find all logs mentioning database timeout in the last 6 hours
SELECT
  timestamp,
  severity,
  resource.type AS resource_type,
  text_payload,
  JSON_VALUE(json_payload, '$.message') AS json_message
FROM
  `my-project.global._Default._AllLogs`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
  AND (
    text_payload LIKE '%timeout%'
    OR JSON_VALUE(json_payload, '$.message') LIKE '%timeout%'
  )
ORDER BY
  timestamp DESC
LIMIT 100
```

### Analyze HTTP Request Patterns

```sql
-- HTTP status code distribution with average latency
SELECT
  http_request.status AS status_code,
  COUNT(*) AS request_count,
  ROUND(AVG(http_request.latency.seconds + http_request.latency.nanos / 1e9), 3) AS avg_latency_secs,
  ROUND(APPROX_QUANTILES(http_request.latency.seconds + http_request.latency.nanos / 1e9, 100)[OFFSET(95)], 3) AS p95_latency_secs
FROM
  `my-project.global._Default._AllLogs`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  AND http_request IS NOT NULL
GROUP BY
  status_code
ORDER BY
  request_count DESC
```

### Cross-Resource Log Correlation

One of the most powerful features is joining logs from different resources:

```sql
-- Correlate Cloud Run errors with load balancer logs using trace ID
SELECT
  cr.timestamp AS app_timestamp,
  cr.severity AS app_severity,
  JSON_VALUE(cr.json_payload, '$.message') AS app_message,
  lb.timestamp AS lb_timestamp,
  lb.http_request.status AS lb_status,
  lb.http_request.latency.seconds AS lb_latency
FROM
  `my-project.global._Default._AllLogs` AS cr
JOIN
  `my-project.global._Default._AllLogs` AS lb
ON
  cr.trace = lb.trace
WHERE
  cr.resource.type = 'cloud_run_revision'
  AND lb.resource.type = 'http_load_balancer'
  AND cr.severity = 'ERROR'
  AND cr.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
LIMIT 50
```

### Audit Log Analysis

```sql
-- Who made the most IAM changes in the last 30 days
SELECT
  proto_payload.audit_log.authentication_info.principal_email AS actor,
  proto_payload.audit_log.method_name AS method,
  COUNT(*) AS action_count
FROM
  `my-project.global._Default._AllLogs`
WHERE
  log_id = 'cloudaudit.googleapis.com/activity'
  AND proto_payload.audit_log.method_name LIKE '%SetIamPolicy%'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  actor, method
ORDER BY
  action_count DESC
```

## Creating Saved Queries

You can save frequently used queries for reuse:

1. Write your query in the Log Analytics editor
2. Click **Save Query**
3. Give it a name and optional description
4. Access saved queries from the **Saved Queries** tab

This is useful for common troubleshooting queries that your team runs during incidents.

## Linking Log Analytics to BigQuery

You can create a linked dataset that makes your Log Analytics data available as a BigQuery dataset. This lets you query logs from BigQuery, join them with other BigQuery tables, and use them in Looker Studio dashboards:

```bash
# Create a linked BigQuery dataset from a log bucket
gcloud logging links create my-log-link \
  --bucket=_Default \
  --location=global \
  --linked-dataset=log_analytics_linked \
  --project=my-project
```

After creating the link, the log data appears as a BigQuery dataset that you can query from the BigQuery console or API.

## Terraform Configuration

```hcl
# Upgrade the _Default bucket to support Log Analytics
resource "google_logging_project_bucket_config" "default" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "_Default"
  retention_days = 30

  enable_analytics = true
}

# Create a custom bucket with Log Analytics
resource "google_logging_project_bucket_config" "analytics" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "analytics-bucket"
  retention_days = 90

  enable_analytics = true
}

# Create a linked BigQuery dataset
resource "google_logging_linked_dataset" "analytics" {
  link_id     = "log-analytics-link"
  bucket      = google_logging_project_bucket_config.analytics.id
  description = "Linked dataset for Log Analytics"
}
```

## When to Use Log Analytics vs BigQuery Export

Both approaches let you run SQL on logs, so when should you use which?

**Use Log Analytics when:**
- You want to query logs without setting up export pipelines
- You need ad-hoc queries during incident investigation
- Your query patterns are exploratory and change frequently

**Use BigQuery export when:**
- You need to join logs with non-log data in BigQuery
- You need long-term retention beyond the log bucket's retention period
- You have heavy query workloads that benefit from BigQuery's pricing model
- You need to use BigQuery ML or other BigQuery-specific features

## Wrapping Up

Log Analytics brings SQL-powered analysis to Cloud Logging without the overhead of managing export pipelines. For most day-to-day log analysis tasks - finding error patterns, analyzing traffic, investigating incidents - it provides everything you need right within the logging interface. Enable it on your `_Default` bucket, start with the queries in this post, and build your own library of saved queries for common troubleshooting scenarios.
