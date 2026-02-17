# How to Export Traces from Cloud Trace to BigQuery for Custom Latency Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Trace, BigQuery, Latency Analysis, Performance

Description: Learn how to export trace data from Cloud Trace to BigQuery for running custom SQL queries on latency metrics, building performance dashboards, and detecting anomalies.

---

Cloud Trace's built-in explorer is good for investigating individual requests, but it falls short when you need to do aggregate analysis across thousands of traces. Questions like "what is the p99 latency trend for the checkout endpoint over the last 30 days?" or "which service has the highest error rate during peak hours?" require the kind of querying that BigQuery excels at.

By exporting trace data to BigQuery, you unlock SQL-based analysis over your entire trace history. Let me show you how to set this up and the kinds of queries that make it worthwhile.

## Setting Up Trace Export to BigQuery

There is no direct "export traces to BigQuery" button in Cloud Trace. Instead, you use Cloud Logging as an intermediary. Since trace spans also generate log entries, you can route those log entries to BigQuery through a logging sink.

### Step 1: Create the BigQuery Dataset

First, create a BigQuery dataset to hold the trace data.

```bash
# Create a dataset for trace data with 90-day expiration
bq mk --dataset \
  --description="Cloud Trace span data for latency analysis" \
  --default_table_expiration=7776000 \
  YOUR_PROJECT_ID:trace_analytics
```

### Step 2: Create a Logging Sink for Trace Logs

Cloud Trace generates log entries in the `cloudtrace.googleapis.com` log. Create a sink that routes these to BigQuery.

```bash
# Create a sink that exports trace log entries to BigQuery
gcloud logging sinks create trace-to-bigquery \
  bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/trace_analytics \
  --log-filter='logName:"cloudtrace.googleapis.com"' \
  --description="Export Cloud Trace spans to BigQuery for analysis"

# Get the sink's writer identity
WRITER=$(gcloud logging sinks describe trace-to-bigquery --format='value(writerIdentity)')

# Grant the writer identity BigQuery Data Editor access
bq add-iam-policy-binding \
  --member="$WRITER" \
  --role="roles/bigquery.dataEditor" \
  YOUR_PROJECT_ID:trace_analytics
```

### Alternative: Export Using the Cloud Trace API

For more control over what gets exported, you can write a scheduled job that queries the Cloud Trace API and inserts results into BigQuery.

```python
# export_traces.py - Export traces to BigQuery via the API
from google.cloud import trace_v2
from google.cloud import bigquery
from datetime import datetime, timedelta

# Initialize clients
trace_client = trace_v2.TraceServiceClient()
bq_client = bigquery.Client()

# Define the time range (last hour)
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=1)

# Fetch traces from Cloud Trace
traces = trace_client.list_traces(
    request={
        "project_id": "your-project-id",
        "start_time": start_time,
        "end_time": end_time,
        "view": trace_v2.ListTracesRequest.ViewType.COMPLETE,
    }
)

# Transform spans into BigQuery rows
rows = []
for trace_obj in traces:
    for span in trace_obj.spans:
        duration_ms = (
            span.end_time.timestamp() - span.start_time.timestamp()
        ) * 1000

        rows.append({
            "trace_id": trace_obj.trace_id,
            "span_id": span.span_id,
            "parent_span_id": span.parent_span_id or "",
            "span_name": span.name,
            "start_time": span.start_time.isoformat(),
            "end_time": span.end_time.isoformat(),
            "duration_ms": duration_ms,
            "status": span.status.code if span.status else 0,
            "labels": dict(span.labels) if span.labels else {},
        })

# Insert into BigQuery
if rows:
    table_ref = bq_client.dataset("trace_analytics").table("spans")
    errors = bq_client.insert_rows_json(table_ref, rows)
    if errors:
        print(f"BigQuery insert errors: {errors}")
    else:
        print(f"Inserted {len(rows)} spans")
```

### Step 3: Create the BigQuery Table Schema

If you are using the API-based approach, create a table with the right schema.

```bash
# Create the spans table with appropriate schema
bq mk --table \
  trace_analytics.spans \
  trace_id:STRING,span_id:STRING,parent_span_id:STRING,span_name:STRING,start_time:TIMESTAMP,end_time:TIMESTAMP,duration_ms:FLOAT,status:INTEGER,labels:JSON
```

## Useful BigQuery Queries for Trace Analysis

Once data is flowing into BigQuery, here are the queries that provide the most value.

### Latency Percentiles by Endpoint

This query calculates p50, p95, and p99 latency for each endpoint over the last 24 hours.

```sql
-- Latency percentiles by endpoint (last 24 hours)
SELECT
  span_name AS endpoint,
  COUNT(*) AS request_count,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)], 2) AS p50_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)], 2) AS p95_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)], 2) AS p99_ms,
  ROUND(AVG(duration_ms), 2) AS avg_ms,
  ROUND(MAX(duration_ms), 2) AS max_ms
FROM
  `your-project.trace_analytics.spans`
WHERE
  parent_span_id = ""  -- Root spans only
  AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  endpoint
HAVING
  request_count > 10
ORDER BY
  p99_ms DESC
```

### Latency Trends Over Time

Track how latency changes hour by hour to detect regressions.

```sql
-- Hourly latency trend for a specific endpoint
SELECT
  TIMESTAMP_TRUNC(start_time, HOUR) AS hour,
  COUNT(*) AS requests,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)], 2) AS p50_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)], 2) AS p95_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)], 2) AS p99_ms
FROM
  `your-project.trace_analytics.spans`
WHERE
  span_name = "/api/orders"
  AND parent_span_id = ""
  AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  hour
ORDER BY
  hour
```

### Slowest Downstream Dependencies

Find out which downstream services contribute most to latency.

```sql
-- Average duration of child spans grouped by service
SELECT
  span_name AS operation,
  COUNT(*) AS call_count,
  ROUND(AVG(duration_ms), 2) AS avg_ms,
  ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)], 2) AS p95_ms,
  ROUND(SUM(duration_ms), 2) AS total_time_ms
FROM
  `your-project.trace_analytics.spans`
WHERE
  parent_span_id != ""  -- Child spans only
  AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  operation
ORDER BY
  total_time_ms DESC
LIMIT 20
```

### Error Rate by Service

Track which services have the highest error rates.

```sql
-- Error rate by span name over the last 24 hours
SELECT
  span_name,
  COUNT(*) AS total,
  COUNTIF(status = 2) AS errors,  -- Status code 2 = ERROR in OpenTelemetry
  ROUND(COUNTIF(status = 2) / COUNT(*) * 100, 2) AS error_rate_pct
FROM
  `your-project.trace_analytics.spans`
WHERE
  start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
GROUP BY
  span_name
HAVING
  total > 50
ORDER BY
  error_rate_pct DESC
```

### Detecting Latency Anomalies

Compare recent latency to the historical baseline to find anomalies.

```sql
-- Compare today's latency to the 7-day baseline
WITH baseline AS (
  SELECT
    span_name,
    AVG(duration_ms) AS baseline_avg,
    STDDEV(duration_ms) AS baseline_stddev
  FROM
    `your-project.trace_analytics.spans`
  WHERE
    parent_span_id = ""
    AND start_time BETWEEN
      TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      AND TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  GROUP BY span_name
),
current_data AS (
  SELECT
    span_name,
    AVG(duration_ms) AS current_avg
  FROM
    `your-project.trace_analytics.spans`
  WHERE
    parent_span_id = ""
    AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  GROUP BY span_name
)
SELECT
  c.span_name,
  ROUND(c.current_avg, 2) AS current_avg_ms,
  ROUND(b.baseline_avg, 2) AS baseline_avg_ms,
  ROUND((c.current_avg - b.baseline_avg) / NULLIF(b.baseline_stddev, 0), 2) AS z_score,
  CASE
    WHEN (c.current_avg - b.baseline_avg) / NULLIF(b.baseline_stddev, 0) > 2 THEN 'ANOMALY'
    ELSE 'NORMAL'
  END AS status
FROM
  current_data c
JOIN
  baseline b ON c.span_name = b.span_name
ORDER BY
  z_score DESC
```

## Scheduling Automated Reports

Use BigQuery scheduled queries to generate daily performance reports.

```bash
# Create a scheduled query that runs daily and writes results to a summary table
bq query --use_legacy_sql=false \
  --schedule='every 24 hours' \
  --display_name='Daily Latency Summary' \
  --destination_table='trace_analytics.daily_summary' \
  --replace=true \
  'SELECT
    CURRENT_DATE() AS report_date,
    span_name,
    COUNT(*) AS requests,
    ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)], 2) AS p50,
    ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)], 2) AS p95,
    ROUND(APPROX_QUANTILES(duration_ms, 100)[OFFSET(99)], 2) AS p99
  FROM `your-project.trace_analytics.spans`
  WHERE parent_span_id = ""
    AND start_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  GROUP BY span_name
  HAVING requests > 10'
```

## Building Dashboards with Looker Studio

Connect Looker Studio to your BigQuery dataset to create visual performance dashboards. Useful charts include:

- Line charts showing p95/p99 latency trends over time
- Bar charts comparing latency across endpoints
- Heatmaps showing latency by hour of day and day of week
- Tables showing the top 10 slowest operations

## Wrapping Up

Exporting traces to BigQuery transforms your observability data from a debugging tool into an analytics platform. You can track latency trends over weeks, detect anomalies automatically, and build dashboards that give your team visibility into performance without manually inspecting individual traces. Set up the export pipeline once, write the queries you need, and schedule them for automated reporting.
