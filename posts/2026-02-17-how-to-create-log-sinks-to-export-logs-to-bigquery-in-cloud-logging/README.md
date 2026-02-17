# How to Create Log Sinks to Export Logs to BigQuery in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, BigQuery, Log Sinks, Log Analytics

Description: Step-by-step guide to creating Cloud Logging sinks that export logs to BigQuery for SQL-based log analysis and long-term querying.

---

Cloud Logging is great for real-time log viewing and basic searches, but when you need to run complex analytics on your logs - joining them with other data, aggregating across time periods, or building dashboards - BigQuery is a much better fit. By creating a log sink, you can automatically export logs from Cloud Logging to BigQuery, where they become queryable with standard SQL.

In this post, I will walk through the complete process of setting up a BigQuery log sink, including schema considerations, partitioning, and practical query examples.

## Why Export Logs to BigQuery?

A few common reasons teams export logs to BigQuery:

- **Advanced analytics**: Cloud Logging's query language is limited compared to SQL. BigQuery lets you do aggregations, joins, window functions, and more.
- **Long-term retention**: Cloud Logging retains logs for 30 days by default (or 400 days for the `_Default` bucket with custom retention). BigQuery can retain data indefinitely.
- **Cross-dataset joins**: Combine log data with other business data in BigQuery for richer analysis.
- **Cost optimization**: For logs you need to retain but query infrequently, BigQuery's long-term storage pricing is competitive.
- **Custom dashboards**: Build Looker Studio or Data Studio dashboards on top of your log data.

## Step 1: Create a BigQuery Dataset

Before creating the sink, you need a dataset to store the logs:

```bash
# Create a BigQuery dataset for logs in the US multi-region
bq mk --dataset \
  --location=US \
  --description="Exported Cloud Logging data" \
  --default_table_expiration=7776000 \
  my-project:cloud_logs
```

The `--default_table_expiration` is set to 90 days (in seconds). Adjust based on your retention needs. Remove this flag if you want logs retained indefinitely.

## Step 2: Create the Log Sink

Now create the sink that routes logs to your BigQuery dataset:

```bash
# Create a log sink to export all logs to BigQuery
gcloud logging sinks create bigquery-all-logs \
  bigquery.googleapis.com/projects/my-project/datasets/cloud_logs \
  --project=my-project
```

This creates a sink with no filter, meaning all logs are exported. In practice, you will usually want to filter.

### Filtered Sink Examples

Export only application logs from specific services:

```bash
# Export only Cloud Run and GKE container logs
gcloud logging sinks create bigquery-app-logs \
  bigquery.googleapis.com/projects/my-project/datasets/cloud_logs \
  --log-filter='resource.type="cloud_run_revision" OR resource.type="k8s_container"' \
  --project=my-project
```

Export only error-level and above logs:

```bash
# Export only error-severity logs and above
gcloud logging sinks create bigquery-error-logs \
  bigquery.googleapis.com/projects/my-project/datasets/cloud_logs \
  --log-filter='severity>=ERROR' \
  --project=my-project
```

Export audit logs for compliance:

```bash
# Export all audit logs
gcloud logging sinks create bigquery-audit-logs \
  bigquery.googleapis.com/projects/my-project/datasets/audit_logs \
  --log-filter='logName:"cloudaudit.googleapis.com"' \
  --project=my-project
```

## Step 3: Grant Permissions

The sink creates a unique service account that needs write access to the BigQuery dataset. First, get the service account:

```bash
# Retrieve the sink's writer identity
WRITER_IDENTITY=$(gcloud logging sinks describe bigquery-all-logs \
  --project=my-project \
  --format='value(writerIdentity)')

echo $WRITER_IDENTITY
```

Then grant it the BigQuery Data Editor role:

```bash
# Grant BigQuery Data Editor to the sink service account
gcloud projects add-iam-policy-binding my-project \
  --member="$WRITER_IDENTITY" \
  --role="roles/bigquery.dataEditor"
```

Alternatively, grant access at the dataset level for more granular control:

```bash
# Grant access at the dataset level
bq add-iam-policy-binding \
  --member="$WRITER_IDENTITY" \
  --role="roles/bigquery.dataEditor" \
  my-project:cloud_logs
```

## Step 4: Enable Partitioned Tables

By default, Cloud Logging creates one table per log type per day. This works but is not ideal for query performance. Enable partitioned tables instead:

```bash
# Update the sink to use partitioned tables
gcloud logging sinks update bigquery-all-logs \
  --use-partitioned-tables \
  --project=my-project
```

With partitioned tables, you get a single table per log type, partitioned by timestamp. This significantly improves query performance and reduces costs because BigQuery can skip irrelevant partitions.

## Understanding the BigQuery Schema

Cloud Logging creates tables in BigQuery with a specific schema. The table names follow the pattern `resource_type_logname`. For example, logs from Cloud Run would go into a table like `cloud_run_revision_run_googleapis_com_requests`.

Key columns in the exported tables:

| Column | Type | Description |
|--------|------|-------------|
| `timestamp` | TIMESTAMP | When the log entry was created |
| `severity` | STRING | Log level (INFO, WARNING, ERROR, etc.) |
| `resource` | RECORD | Resource that generated the log |
| `jsonPayload` | JSON | Structured log data (if JSON) |
| `textPayload` | STRING | Unstructured log text |
| `httpRequest` | RECORD | HTTP request details (if applicable) |
| `labels` | RECORD | Key-value pairs of labels |
| `insertId` | STRING | Unique identifier for the log entry |

## Practical BigQuery Queries on Log Data

Once logs are flowing to BigQuery, here are some useful queries.

### Count Errors by Service Over Time

This query groups error logs by hour and service:

```sql
-- Count error log entries by hour and service
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  resource.labels.service_name AS service,
  COUNT(*) AS error_count
FROM
  `my-project.cloud_logs.cloud_run_revision_*`
WHERE
  severity = 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  hour, service
ORDER BY
  hour DESC, error_count DESC
```

### Find the Most Common Error Messages

```sql
-- Top 20 most frequent error messages in the last 24 hours
SELECT
  SUBSTR(textPayload, 0, 200) AS error_message,
  COUNT(*) AS occurrences
FROM
  `my-project.cloud_logs.cloud_run_revision_*`
WHERE
  severity >= 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  error_message
ORDER BY
  occurrences DESC
LIMIT 20
```

### Analyze HTTP Request Patterns

```sql
-- HTTP request analysis: status codes, average latency
SELECT
  httpRequest.status AS status_code,
  COUNT(*) AS request_count,
  AVG(httpRequest.latency.seconds) AS avg_latency_seconds,
  APPROX_QUANTILES(httpRequest.latency.seconds, 100)[OFFSET(95)] AS p95_latency
FROM
  `my-project.cloud_logs.requests`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  status_code
ORDER BY
  request_count DESC
```

### Audit Log Analysis

```sql
-- Who made changes to IAM policies in the last 30 days
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS actor,
  protopayload_auditlog.methodName AS action,
  resource.labels.project_id AS project
FROM
  `my-project.audit_logs.cloudaudit_googleapis_com_activity`
WHERE
  protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
ORDER BY
  timestamp DESC
```

## Terraform Configuration

Here is the complete Terraform setup:

```hcl
# BigQuery dataset for exported logs
resource "google_bigquery_dataset" "logs" {
  dataset_id                 = "cloud_logs"
  friendly_name              = "Cloud Logging Export"
  description                = "Logs exported from Cloud Logging"
  location                   = "US"
  default_table_expiration_ms = 7776000000  # 90 days in milliseconds
}

# Log sink to BigQuery with partitioned tables
resource "google_logging_project_sink" "bigquery" {
  name        = "bigquery-all-logs"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.logs.dataset_id}"
  filter      = "resource.type=\"cloud_run_revision\" OR resource.type=\"k8s_container\""

  # Use partitioned tables for better performance
  bigquery_options {
    use_partitioned_tables = true
  }
}

# Grant the sink's service account BigQuery access
resource "google_bigquery_dataset_iam_member" "log_sink_writer" {
  dataset_id = google_bigquery_dataset.logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.bigquery.writer_identity
}
```

## Cost Management Tips

Exporting logs to BigQuery costs money in two ways: BigQuery storage and BigQuery query processing. Here is how to manage costs:

1. **Use filtered sinks**: Do not export everything. Filter to the logs you actually need for analysis.
2. **Enable partitioned tables**: This reduces query costs by limiting scanned data.
3. **Set table expiration**: Auto-delete old log tables to control storage costs.
4. **Use BigQuery reservations**: For heavy query workloads, flat-rate pricing may be cheaper than on-demand.
5. **Exclude from _Default sink**: If you are exporting to BigQuery and do not need the same logs in Cloud Logging, add an exclusion to the `_Default` sink to avoid paying for double storage.

## Wrapping Up

Exporting logs to BigQuery unlocks the full power of SQL for log analysis. The setup is straightforward - create a dataset, create a sink, grant permissions - and the payoff is huge. You get to ask questions about your logs that are simply not possible with Cloud Logging's query language alone. Use partitioned tables, filter your sinks to what you actually need, and start building queries that give you real insight into your system's behavior.
