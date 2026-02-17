# How to Export GKE Container Logs to BigQuery Using Cloud Logging Sinks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, BigQuery, Cloud Logging, Container Logs

Description: Step-by-step guide to exporting GKE container logs to BigQuery using Cloud Logging sinks for SQL-based analysis of Kubernetes application logs.

---

GKE container logs contain a wealth of information about your applications - error messages, performance data, request traces, and more. But searching through them in Cloud Logging's Logs Explorer has its limits. When you need to run aggregations, build trend reports, or join log data with other datasets, exporting GKE logs to BigQuery gives you the full power of SQL.

In this post, I will walk through setting up a log sink specifically for GKE container logs, optimizing the BigQuery schema for container log analysis, and writing useful queries.

## What GKE Logs Are Available?

GKE generates several types of logs that flow to Cloud Logging:

| Resource Type | What It Contains |
|--------------|-----------------|
| `k8s_container` | Application logs from containers running in pods |
| `k8s_pod` | Pod lifecycle events |
| `k8s_node` | Node-level system logs |
| `k8s_cluster` | Cluster-level events (autoscaling, upgrades) |

For most application analysis, `k8s_container` is what you want. These are the stdout/stderr output from your containerized applications.

## Step 1: Create a BigQuery Dataset

```bash
# Create a BigQuery dataset for GKE container logs
bq mk --dataset \
  --location=US \
  --description="GKE container logs exported from Cloud Logging" \
  my-project:gke_logs
```

## Step 2: Create the Log Sink

### Exporting All Container Logs

```bash
# Create a sink for all GKE container logs
gcloud logging sinks create gke-containers-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/gke_logs \
  --log-filter='resource.type="k8s_container"' \
  --use-partitioned-tables \
  --project=my-project
```

The `--use-partitioned-tables` flag is important for query performance. Without it, Cloud Logging creates a new table per day, which makes querying across time ranges clumsy.

### Exporting Logs from Specific Namespaces

If you only want application namespaces and not system namespaces:

```bash
# Export container logs from application namespaces only
gcloud logging sinks create gke-app-logs-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/gke_logs \
  --log-filter='resource.type="k8s_container" AND resource.labels.namespace_name!="kube-system" AND resource.labels.namespace_name!="gke-managed-system" AND resource.labels.namespace_name!="config-management-system"' \
  --use-partitioned-tables \
  --project=my-project
```

### Exporting Logs from Specific Clusters

```bash
# Export container logs from the production cluster only
gcloud logging sinks create gke-prod-logs-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/gke_logs \
  --log-filter='resource.type="k8s_container" AND resource.labels.cluster_name="prod-cluster"' \
  --use-partitioned-tables \
  --project=my-project
```

### Exporting Only Error Logs

For cost-conscious setups, export only error-level container logs:

```bash
# Export only error and above severity container logs
gcloud logging sinks create gke-errors-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/gke_logs \
  --log-filter='resource.type="k8s_container" AND severity>=ERROR' \
  --use-partitioned-tables \
  --project=my-project
```

## Step 3: Grant Permissions

```bash
# Get the sink's writer identity
WRITER=$(gcloud logging sinks describe gke-containers-to-bigquery \
  --project=my-project \
  --format='value(writerIdentity)')

# Grant BigQuery Data Editor access
bq add-iam-policy-binding \
  --member="$WRITER" \
  --role="roles/bigquery.dataEditor" \
  my-project:gke_logs
```

## Understanding the BigQuery Schema

After logs start flowing, BigQuery creates tables with a specific schema. For `k8s_container` logs, the table name will be something like `k8s_container`. Key columns:

| Column | Type | What It Contains |
|--------|------|-----------------|
| `timestamp` | TIMESTAMP | When the log entry was created |
| `severity` | STRING | Log level |
| `resource.labels.cluster_name` | STRING | GKE cluster name |
| `resource.labels.namespace_name` | STRING | Kubernetes namespace |
| `resource.labels.pod_name` | STRING | Pod name |
| `resource.labels.container_name` | STRING | Container name |
| `text_payload` | STRING | Unstructured log text |
| `json_payload` | JSON | Structured JSON log data |
| `labels` | RECORD | Kubernetes labels |

## Practical BigQuery Queries

### Error Count by Namespace and Container

This gives you a quick overview of where errors are happening:

```sql
-- Error count by namespace and container in the last 24 hours
SELECT
  resource.labels.namespace_name AS namespace,
  resource.labels.container_name AS container,
  COUNT(*) AS error_count
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  severity IN ('ERROR', 'CRITICAL')
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  namespace, container
ORDER BY
  error_count DESC
LIMIT 20
```

### Top Error Messages

Find the most common error messages across your cluster:

```sql
-- Most frequent error messages in GKE containers
SELECT
  resource.labels.container_name AS container,
  SUBSTR(COALESCE(text_payload, JSON_VALUE(json_payload, '$.message')), 0, 200) AS error_message,
  COUNT(*) AS occurrences
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  severity >= 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  container, error_message
ORDER BY
  occurrences DESC
LIMIT 50
```

### Container Restart Correlation

Correlate container restarts with error logs by looking at error spikes per pod:

```sql
-- Pods with the most errors in the last hour (likely crashing)
SELECT
  resource.labels.namespace_name AS namespace,
  resource.labels.pod_name AS pod,
  resource.labels.container_name AS container,
  MIN(timestamp) AS first_error,
  MAX(timestamp) AS last_error,
  COUNT(*) AS error_count
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  severity >= 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY
  namespace, pod, container
HAVING
  error_count > 10
ORDER BY
  error_count DESC
```

### Error Trend Over Time

Track error trends to identify degradation:

```sql
-- Hourly error count trend by namespace over the last 7 days
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  resource.labels.namespace_name AS namespace,
  COUNT(*) AS error_count
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  severity >= 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  hour, namespace
ORDER BY
  hour, namespace
```

### Searching for Specific Application Events

If your application writes structured JSON logs:

```sql
-- Find specific application events from JSON logs
SELECT
  timestamp,
  resource.labels.pod_name AS pod,
  JSON_VALUE(json_payload, '$.event_type') AS event_type,
  JSON_VALUE(json_payload, '$.user_id') AS user_id,
  JSON_VALUE(json_payload, '$.message') AS message
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  resource.labels.container_name = 'my-api'
  AND JSON_VALUE(json_payload, '$.event_type') = 'order_failed'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
ORDER BY
  timestamp DESC
LIMIT 100
```

### Namespace-Level Log Volume Analysis

Understand which namespaces generate the most log data:

```sql
-- Log volume by namespace (approximate bytes)
SELECT
  resource.labels.namespace_name AS namespace,
  COUNT(*) AS entry_count,
  SUM(LENGTH(COALESCE(text_payload, TO_JSON_STRING(json_payload)))) AS approx_bytes,
  ROUND(SUM(LENGTH(COALESCE(text_payload, TO_JSON_STRING(json_payload)))) / 1073741824, 2) AS approx_gb
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  namespace
ORDER BY
  approx_bytes DESC
```

This is valuable for identifying which namespaces are driving your logging costs.

## Terraform Configuration

```hcl
# BigQuery dataset for GKE logs
resource "google_bigquery_dataset" "gke_logs" {
  dataset_id                 = "gke_logs"
  friendly_name              = "GKE Container Logs"
  description                = "Container logs exported from GKE clusters"
  location                   = "US"
  default_table_expiration_ms = 7776000000  # 90 days
}

# Log sink for GKE container logs
resource "google_logging_project_sink" "gke_to_bigquery" {
  name        = "gke-containers-to-bigquery"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.gke_logs.dataset_id}"

  filter = "resource.type=\"k8s_container\" AND resource.labels.namespace_name!=\"kube-system\""

  bigquery_options {
    use_partitioned_tables = true
  }

  unique_writer_identity = true
}

# Grant BigQuery access to the sink
resource "google_bigquery_dataset_iam_member" "gke_sink_writer" {
  dataset_id = google_bigquery_dataset.gke_logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.gke_to_bigquery.writer_identity
}
```

## Cost Optimization

GKE container logs can be voluminous. Here are strategies to control BigQuery costs:

1. **Filter at the sink level**: Only export the namespaces, severity levels, or clusters you actually need to analyze.

2. **Set table expiration**: Use `default_table_expiration_ms` on the dataset to auto-delete old data.

3. **Use partitioned tables**: Always enable this. It dramatically reduces query costs because BigQuery only scans the relevant date partitions.

4. **Add clustering**: For frequently queried columns like `namespace_name` or `container_name`, consider clustering the table for even better query performance.

5. **Query wisely**: Always include a `WHERE timestamp > ...` clause in your queries to limit the amount of data scanned.

## Scheduled Queries for Reports

Set up scheduled queries in BigQuery to generate regular reports:

```sql
-- Scheduled query: daily error summary by namespace
-- Runs daily, appends results to a summary table
SELECT
  CURRENT_DATE() AS report_date,
  resource.labels.namespace_name AS namespace,
  resource.labels.container_name AS container,
  COUNT(*) AS error_count,
  COUNT(DISTINCT resource.labels.pod_name) AS affected_pods
FROM
  `my-project.gke_logs.k8s_container`
WHERE
  severity >= 'ERROR'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
GROUP BY
  namespace, container
```

## Wrapping Up

Exporting GKE container logs to BigQuery transforms your Kubernetes troubleshooting capabilities. Instead of scrolling through log entries one at a time, you can run SQL queries that aggregate, filter, and correlate across thousands of pods and millions of log entries. The setup takes about 10 minutes - create a dataset, create a sink with a container log filter, grant permissions - and the analytical power you gain is significant. Start with error analysis queries and expand into application-specific analysis as you see what questions your team asks most often.
