# How to Link a Log Bucket to BigQuery for Log Analytics in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, BigQuery, Log Analytics, Observability

Description: A practical guide to linking Cloud Logging buckets to BigQuery so you can run SQL queries against your logs for deeper analysis and custom dashboards.

---

Cloud Logging is great for searching through recent logs and setting up alerts, but when you need to do real analysis - things like aggregating error rates over months, joining log data with other datasets, or building custom dashboards - the built-in Logs Explorer starts to feel limited. That is where the BigQuery link comes in.

By linking a Cloud Logging bucket to BigQuery, you get a BigQuery dataset that mirrors your log data. You can then query it using standard SQL, which opens up a completely different level of analysis. The best part is that there is no ETL pipeline to maintain. Logs flow into BigQuery automatically as they arrive in the bucket.

## How the Log Analytics Link Works

When you enable Log Analytics on a log bucket and link it to BigQuery, Cloud Logging creates a linked dataset in BigQuery. This is not a copy of your logs - it is a live view. When new logs arrive in the bucket, they become queryable in BigQuery within a few minutes. When logs age out of the bucket's retention window, they disappear from BigQuery too.

This means your BigQuery costs are limited to query processing. You do not pay for storage separately since the data lives in the Cloud Logging bucket.

## Step 1: Enable Log Analytics on a Bucket

First, you need to enable Log Analytics on the bucket you want to link. You can do this on existing buckets or create a new one with analytics enabled.

Here is how to create a new bucket with Log Analytics turned on from the start.

```bash
# Create a new log bucket with Log Analytics enabled
gcloud logging buckets create analytics-bucket \
  --location=global \
  --enable-analytics \
  --retention-days=90 \
  --description="Bucket with Log Analytics for BigQuery queries"
```

If you already have a bucket and want to upgrade it, use the update command instead.

```bash
# Enable Log Analytics on an existing bucket
gcloud logging buckets update my-existing-bucket \
  --location=global \
  --enable-analytics
```

Keep in mind that once you enable Log Analytics on a bucket, you cannot disable it. So be deliberate about which buckets you upgrade.

## Step 2: Create the BigQuery Link

With Log Analytics enabled, the next step is to create a link between the bucket and a BigQuery dataset.

This command creates the linked dataset that will appear in your BigQuery console.

```bash
# Create a BigQuery linked dataset for the log bucket
gcloud logging links create my-bq-link \
  --bucket=analytics-bucket \
  --location=global
```

After running this, a new dataset will appear in BigQuery. The dataset name follows the pattern `project_id.linked_dataset_name`. It usually takes a few minutes for the link to become active.

You can verify the link was created successfully with this command.

```bash
# Verify the BigQuery link exists
gcloud logging links list \
  --bucket=analytics-bucket \
  --location=global
```

## Step 3: Query Your Logs in BigQuery

Once the link is active, you can head to the BigQuery console and find your linked dataset. Inside it, you will see a view that represents your log data.

Here is a basic query to check that everything is working. It pulls the 10 most recent log entries.

```sql
-- Fetch the 10 most recent log entries from the linked dataset
SELECT
  timestamp,
  severity,
  resource.type AS resource_type,
  json_payload,
  text_payload
FROM
  `your-project.your_linked_dataset._AllLogs`
ORDER BY
  timestamp DESC
LIMIT 10
```

## Practical Query Examples

Once you have the basics working, here are some queries that demonstrate why BigQuery integration is so useful.

This query calculates error rates by service over the last 24 hours, grouped into hourly buckets.

```sql
-- Error rate by service over the last 24 hours, bucketed by hour
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  resource.labels.service_name AS service,
  COUNTIF(severity = 'ERROR') AS error_count,
  COUNT(*) AS total_count,
  ROUND(COUNTIF(severity = 'ERROR') / COUNT(*) * 100, 2) AS error_rate_pct
FROM
  `your-project.your_linked_dataset._AllLogs`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  hour, service
ORDER BY
  hour DESC, error_rate_pct DESC
```

This next query finds the top 10 most frequent error messages in the last week, which is useful for prioritizing bug fixes.

```sql
-- Top 10 most frequent error messages in the past 7 days
SELECT
  SUBSTR(text_payload, 1, 200) AS error_message,
  COUNT(*) AS occurrence_count,
  MIN(timestamp) AS first_seen,
  MAX(timestamp) AS last_seen
FROM
  `your-project.your_linked_dataset._AllLogs`
WHERE
  severity = 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  error_message
ORDER BY
  occurrence_count DESC
LIMIT 10
```

This query analyzes HTTP latency from load balancer logs by calculating percentiles.

```sql
-- HTTP request latency percentiles from load balancer logs
SELECT
  http_request.request_url AS url_path,
  COUNT(*) AS request_count,
  APPROX_QUANTILES(http_request.latency.seconds, 100)[OFFSET(50)] AS p50_latency,
  APPROX_QUANTILES(http_request.latency.seconds, 100)[OFFSET(95)] AS p95_latency,
  APPROX_QUANTILES(http_request.latency.seconds, 100)[OFFSET(99)] AS p99_latency
FROM
  `your-project.your_linked_dataset._AllLogs`
WHERE
  http_request IS NOT NULL
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  url_path
HAVING
  request_count > 100
ORDER BY
  p99_latency DESC
```

## Step 4: Set Up a Routing Sink (Optional)

If you want specific logs to go to your analytics bucket, set up a sink with a filter. This gives you control over exactly which logs are available for BigQuery analysis.

```bash
# Route only production application logs to the analytics bucket
gcloud logging sinks create prod-analytics-sink \
  logging.googleapis.com/projects/YOUR_PROJECT_ID/locations/global/buckets/analytics-bucket \
  --log-filter='resource.labels.environment="production" AND (severity="INFO" OR severity="WARNING" OR severity="ERROR")' \
  --description="Routes production logs to the analytics bucket"
```

## Using Terraform

For teams that manage infrastructure as code, here is the Terraform configuration.

```hcl
# Create a log bucket with analytics enabled
resource "google_logging_project_bucket_config" "analytics" {
  project          = var.project_id
  location         = "global"
  retention_days   = 90
  bucket_id        = "analytics-bucket"
  enable_analytics = true
}

# Create the BigQuery link
resource "google_logging_linked_dataset" "bq_link" {
  link_id     = "my-bq-link"
  bucket      = google_logging_project_bucket_config.analytics.id
  description = "Link to BigQuery for log analytics"
}
```

## Building Dashboards with Looker Studio

Once your logs are in BigQuery, you can connect Looker Studio (formerly Data Studio) to create visual dashboards. This is particularly useful for:

- Executive dashboards showing error trends over weeks or months
- Service reliability reports with error budgets
- Anomaly detection visualizations comparing current error rates to historical baselines
- Cost attribution reports showing which services generate the most log volume

Just connect Looker Studio to your BigQuery dataset and start building charts.

## Cost Implications

There are a few cost factors to keep in mind:

1. **Log ingestion**: You still pay standard Cloud Logging ingestion charges. Enabling analytics does not change this.
2. **BigQuery queries**: You pay for the data scanned by each query. Use partitioned queries with timestamp filters to keep costs down.
3. **No duplicate storage costs**: Since the BigQuery dataset is a view over the log bucket, you do not pay BigQuery storage fees.

A good practice is to use BigQuery's on-demand pricing for exploratory queries and switch to flat-rate pricing if you run scheduled queries regularly.

## Things to Watch Out For

A few gotchas from my experience setting this up:

- The `_Required` bucket cannot be linked to BigQuery. Only `_Default` and custom buckets support this.
- There is a slight delay (usually 1-3 minutes) between log ingestion and BigQuery availability. Do not expect real-time query results.
- Column names in the BigQuery view follow a specific schema. Fields from `jsonPayload` are nested under `json_payload` in BigQuery.
- If your bucket retention is short, your BigQuery data window is equally short. Plan your retention period based on how far back you need to query.

## Wrapping Up

Linking Cloud Logging to BigQuery transforms your logs from a debugging tool into a proper analytics platform. The setup takes about 10 minutes, there is no ETL pipeline to maintain, and you get the full power of SQL for log analysis. Start with a focused analytics bucket for your most important logs, and expand from there as you find more use cases.
