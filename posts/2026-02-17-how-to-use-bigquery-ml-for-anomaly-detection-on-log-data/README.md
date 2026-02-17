# How to Use BigQuery ML for Anomaly Detection on Log Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, BigQuery ML, Anomaly Detection, Log Analysis, Monitoring

Description: Learn how to use BigQuery ML to detect anomalies in log data, identifying unusual patterns in error rates, latency, and request volumes.

---

Log data is one of the richest sources of operational insight, but it is also overwhelming in volume. Manually watching dashboards for unusual patterns does not scale, and static threshold alerts miss subtle anomalies that might indicate real problems. BigQuery ML offers anomaly detection capabilities that can automatically learn what "normal" looks like for your log metrics and flag when things deviate from that baseline.

In this post, I will show you how to set up anomaly detection on log data using BigQuery ML, covering both time-series-based approaches and unsupervised clustering for detecting unusual log patterns.

## Getting Log Data into BigQuery

If you are running workloads on GCP, your logs are likely already flowing through Cloud Logging. Setting up a log sink to BigQuery gives you a queryable history of all your log events.

The following gcloud command creates a log sink that exports all logs to a BigQuery dataset.

```bash
# Create a log sink that exports logs to a BigQuery dataset
gcloud logging sinks create log-to-bq \
  bigquery.googleapis.com/projects/my-project/datasets/application_logs \
  --log-filter='resource.type="k8s_container"' \
  --use-partitioned-tables
```

Once logs are flowing, you can aggregate them into time series metrics that are suitable for anomaly detection.

## Building Time Series Metrics from Logs

Raw log entries are not directly useful for anomaly detection. You need to aggregate them into metrics like error rates, request counts, or latency percentiles at a regular time interval.

This query aggregates log data into hourly metrics per service.

```sql
-- Aggregate raw logs into hourly metrics per service
CREATE OR REPLACE TABLE `my_project.application_logs.hourly_metrics` AS
SELECT
  -- Truncate to hourly buckets
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  -- Extract service name from log labels
  resource.labels.container_name AS service_name,
  -- Count total requests
  COUNT(*) AS request_count,
  -- Count errors (severity ERROR or higher)
  COUNTIF(severity IN ('ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY')) AS error_count,
  -- Calculate error rate as a percentage
  SAFE_DIVIDE(
    COUNTIF(severity IN ('ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY')),
    COUNT(*)
  ) * 100 AS error_rate_pct,
  -- Extract and aggregate latency if available in log payload
  APPROX_QUANTILES(
    CAST(JSON_VALUE(json_payload, '$.latency_ms') AS FLOAT64), 100
  )[OFFSET(95)] AS p95_latency_ms
FROM
  `my_project.application_logs.all_logs`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY
  hour, service_name
ORDER BY
  hour;
```

## Using ARIMA_PLUS for Time Series Anomaly Detection

BigQuery ML's ARIMA_PLUS model can detect anomalies in time series data by learning the expected patterns and flagging data points that fall outside the confidence interval.

This query trains an ARIMA_PLUS model on error rate data and uses it to detect anomalies.

```sql
-- Train a model on the error rate time series per service
CREATE OR REPLACE MODEL `my_project.application_logs.error_rate_model`
OPTIONS(
  model_type='ARIMA_PLUS',
  time_series_timestamp_col='hour',
  time_series_data_col='error_rate_pct',
  -- Model each service separately
  time_series_id_col='service_name',
  auto_arima=TRUE,
  -- Detect anomalies outside the 99% confidence interval
  confidence_level=0.99
) AS
SELECT
  hour,
  service_name,
  error_rate_pct
FROM
  `my_project.application_logs.hourly_metrics`
WHERE
  -- Exclude the most recent day so we can test anomaly detection on it
  hour < TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), DAY);
```

Now you can detect anomalies in recent data by comparing actual values against the model's expectations.

```sql
-- Detect anomalies by checking which actual values fall outside predicted bounds
SELECT
  d.hour,
  d.service_name,
  d.error_rate_pct AS actual_error_rate,
  f.forecast_value AS expected_error_rate,
  f.prediction_interval_lower_bound AS lower_bound,
  f.prediction_interval_upper_bound AS upper_bound,
  -- Flag as anomaly if the actual value is outside the confidence interval
  CASE
    WHEN d.error_rate_pct > f.prediction_interval_upper_bound THEN 'HIGH_ANOMALY'
    WHEN d.error_rate_pct < f.prediction_interval_lower_bound THEN 'LOW_ANOMALY'
    ELSE 'NORMAL'
  END AS anomaly_status
FROM
  `my_project.application_logs.hourly_metrics` d
JOIN
  ML.EXPLAIN_FORECAST(
    MODEL `my_project.application_logs.error_rate_model`,
    STRUCT(24 AS horizon, 0.99 AS confidence_level)
  ) f
ON
  d.hour = f.time_series_timestamp
  AND d.service_name = f.time_series_id_col
WHERE
  anomaly_status != 'NORMAL'
ORDER BY
  d.hour DESC;
```

This approach works well for metrics that have predictable patterns - daily traffic cycles, weekly patterns, and so on. The model learns what normal looks like and flags deviations.

## Using K-Means Clustering for Log Pattern Anomalies

Time series anomaly detection works for numeric metrics, but sometimes you want to detect unusual combinations of log attributes. For this, unsupervised clustering with K-Means can help identify log entries that do not fit into any normal cluster.

First, you need to create a feature table that captures the characteristics of each log entry or group of entries.

```sql
-- Create a feature table with numeric attributes for clustering
CREATE OR REPLACE TABLE `my_project.application_logs.log_features` AS
SELECT
  TIMESTAMP_TRUNC(timestamp, HOUR) AS hour,
  resource.labels.container_name AS service_name,
  COUNT(*) AS log_volume,
  COUNTIF(severity = 'ERROR') AS error_count,
  COUNTIF(severity = 'WARNING') AS warning_count,
  -- Count distinct error messages as a diversity metric
  COUNT(DISTINCT CASE WHEN severity = 'ERROR' THEN text_payload END) AS unique_errors,
  -- Calculate the ratio of new error messages vs known ones
  AVG(CHAR_LENGTH(COALESCE(text_payload, ''))) AS avg_message_length
FROM
  `my_project.application_logs.all_logs`
WHERE
  timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  hour, service_name;
```

Now train a K-Means model to learn what normal log patterns look like.

```sql
-- Train a K-Means model to cluster normal log patterns
CREATE OR REPLACE MODEL `my_project.application_logs.log_pattern_clusters`
OPTIONS(
  model_type='KMEANS',
  -- Start with a reasonable number of clusters
  num_clusters=5,
  -- Standardize features so they are on comparable scales
  standardize_features=TRUE,
  max_iterations=50
) AS
SELECT
  log_volume,
  error_count,
  warning_count,
  unique_errors,
  avg_message_length
FROM
  `my_project.application_logs.log_features`;
```

After training, you can identify anomalous time periods by looking at their distance from cluster centroids.

```sql
-- Find data points that are far from their nearest cluster centroid
SELECT
  hour,
  service_name,
  CENTROID_ID AS nearest_cluster,
  -- Distance to the nearest centroid - higher means more anomalous
  NEAREST_CENTROIDS_DISTANCE[OFFSET(0)].DISTANCE AS centroid_distance,
  log_volume,
  error_count,
  warning_count
FROM
  ML.PREDICT(MODEL `my_project.application_logs.log_pattern_clusters`,
    (SELECT * FROM `my_project.application_logs.log_features`))
-- Filter for points that are far from any cluster center
WHERE
  NEAREST_CENTROIDS_DISTANCE[OFFSET(0)].DISTANCE > 3.0
ORDER BY
  centroid_distance DESC;
```

Points with a high centroid distance represent time periods where the log patterns do not match any of the learned normal clusters. These are worth investigating because they might indicate new types of failures or unusual system behavior.

## Setting Up Automated Detection

For production use, you want anomaly detection running automatically. Set up a scheduled query that checks for anomalies and writes results to a table that your alerting system can monitor.

```sql
-- Scheduled anomaly detection query that writes results to an alerts table
INSERT INTO `my_project.application_logs.anomaly_alerts`
  (detected_at, hour, service_name, metric_name, actual_value, expected_value, severity)
SELECT
  CURRENT_TIMESTAMP() AS detected_at,
  d.hour,
  d.service_name,
  'error_rate' AS metric_name,
  d.error_rate_pct AS actual_value,
  f.forecast_value AS expected_value,
  CASE
    WHEN d.error_rate_pct > f.prediction_interval_upper_bound * 2 THEN 'CRITICAL'
    WHEN d.error_rate_pct > f.prediction_interval_upper_bound THEN 'WARNING'
    ELSE 'INFO'
  END AS severity
FROM
  `my_project.application_logs.hourly_metrics` d
JOIN
  ML.EXPLAIN_FORECAST(
    MODEL `my_project.application_logs.error_rate_model`,
    STRUCT(1 AS horizon, 0.99 AS confidence_level)
  ) f
ON
  d.hour = f.time_series_timestamp
  AND d.service_name = f.time_series_id_col
WHERE
  d.error_rate_pct > f.prediction_interval_upper_bound;
```

You can then connect this alerts table to Cloud Monitoring, PagerDuty, or any other alerting tool via a Cloud Function that polls the table periodically.

## Wrapping Up

BigQuery ML gives you a practical path to anomaly detection on log data without needing a separate ML platform. The ARIMA_PLUS approach works best for numeric time series metrics where you want to detect when values drift outside expected ranges. K-Means clustering is better for detecting unusual patterns across multiple log dimensions simultaneously. In practice, using both approaches together gives you the most comprehensive coverage. The key advantage is that everything stays inside BigQuery, so you do not need to move data around or manage additional infrastructure.
